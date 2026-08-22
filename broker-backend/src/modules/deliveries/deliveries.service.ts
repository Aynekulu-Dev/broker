import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { eq, inArray, sql } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DB } from '../../db/db.module';
import * as schema from '../../db/schema';
import {
  CreateDeliveryDto,
  DispatchDeliveryDto,
  StartBatchDto,
} from './dto/delivery.dto';
import { TelegramService } from '../../common/telegram.service';

@Injectable()
export class DeliveriesService {
  constructor(
    @Inject(DB) private readonly db: NodePgDatabase<typeof schema>,
    private readonly telegram: TelegramService,
  ) {}

  /**
   * FR-05: admin records transport details once the vehicle is loaded —
   * possibly with several orders riding together on the same truck.
   * Every order must currently be APPROVED (already reviewed).
   */
  async create(dto: CreateDeliveryDto) {
    const orderIds = [...new Set(dto.orderIds)];

    const orders = await this.db
      .select()
      .from(schema.orders)
      .where(inArray(schema.orders.id, orderIds));

    if (orders.length !== orderIds.length) {
      throw new NotFoundException('One or more orders were not found');
    }
    const notReady = orders.filter((o) => o.status !== 'APPROVED');
    if (notReady.length > 0) {
      throw new BadRequestException(
        'All selected orders must be APPROVED before dispatch details can be recorded',
      );
    }

    const delivery = await this.db.transaction(async (tx) => {
      const [created] = await tx
        .insert(schema.deliveries)
        .values({
          vehiclePlateNumber: dto.vehiclePlateNumber,
          driverName: dto.driverName,
          driverPhone: dto.driverPhone,
        })
        .returning();

      await tx
        .update(schema.orders)
        .set({ status: 'DISPATCHED', deliveryId: created.id })
        .where(inArray(schema.orders.id, orderIds));

      return created;
    });

    await this.telegram.notifyAdmin(
      `🚚 ${orderIds.length} order(s) dispatched — plate ${dto.vehiclePlateNumber}, driver ${dto.driverName}.`,
    );

    return this.findOne(delivery.id);
  }

  /**
   * Admin: explicitly open a new COLLECTING batch for a product, e.g.
   * before any orders exist for it yet, optionally overriding the
   * product's default batchCapacity for this particular truck (trucks
   * differ in size). If a COLLECTING batch already exists for this
   * product, that one is returned as-is — orders keep joining it
   * instead of splitting across two half-empty trucks.
   */
  async startBatch(dto: StartBatchDto) {
    const [existing] = await this.db
      .select()
      .from(schema.deliveries)
      .where(
        sql`${schema.deliveries.productId} = ${dto.productId} AND ${schema.deliveries.status} = 'COLLECTING'`,
      )
      .limit(1);
    if (existing) return existing;

    const [product] = await this.db
      .select()
      .from(schema.products)
      .where(eq(schema.products.id, dto.productId));
    if (!product) throw new NotFoundException('Product not found');

    const capacity = dto.capacity ?? product.batchCapacity;
    if (!capacity) {
      throw new BadRequestException(
        'This product has no default batch capacity — provide one explicitly',
      );
    }

    const [batch] = await this.db
      .insert(schema.deliveries)
      .values({ productId: dto.productId, capacity, status: 'COLLECTING' })
      .returning();
    return batch;
  }

  /**
   * Admin: the batch has reached capacity (FULL) — ask every rider to
   * pay now. Flips the batch to PAYMENT_REQUESTED and every still-PENDING
   * order riding on it to AWAITING_PAYMENT, all at once so no customer
   * is asked to pay before the truck is actually confirmed full.
   */
  async requestPayment(deliveryId: string) {
    const [batch] = await this.db
      .select()
      .from(schema.deliveries)
      .where(eq(schema.deliveries.id, deliveryId));
    if (!batch) throw new NotFoundException('Delivery not found');
    if (batch.status !== 'FULL') {
      throw new BadRequestException(
        `Batch is ${batch.status} — it must be FULL before payment can be requested`,
      );
    }

    await this.db.transaction(async (tx) => {
      await tx
        .update(schema.deliveries)
        .set({ status: 'PAYMENT_REQUESTED', paymentRequestedAt: new Date() })
        .where(eq(schema.deliveries.id, deliveryId));

      await tx
        .update(schema.orders)
        .set({ status: 'AWAITING_PAYMENT' })
        .where(
          sql`${schema.orders.deliveryId} = ${deliveryId} AND ${schema.orders.status} = 'PENDING'`,
        );
    });

    await this.telegram.notifyAdmin(
      `📢 Payment requested for batch \`${deliveryId}\` — riders can now submit receipts.`,
    );

    return this.findOne(deliveryId);
  }

  /**
   * Admin: every rider has been reviewed and APPROVED — record the
   * vehicle/driver and actually send the truck out. This is what makes
   * the transport details (plate, driver name, driver phone) visible on
   * each rider's own order page — no SMS involved, it's just data that
   * appears once the delivery flips to DISPATCHED.
   */
  async dispatchBatch(deliveryId: string, dto: DispatchDeliveryDto) {
    const [batch] = await this.db
      .select()
      .from(schema.deliveries)
      .where(eq(schema.deliveries.id, deliveryId));
    if (!batch) throw new NotFoundException('Delivery not found');
    if (batch.status !== 'PAYMENT_REQUESTED') {
      throw new BadRequestException(
        `Batch is ${batch.status} — payment must be requested and reviewed before dispatch`,
      );
    }

    const riders = await this.db
      .select()
      .from(schema.orders)
      .where(eq(schema.orders.deliveryId, deliveryId));
    const notReady = riders.filter(
      (o) => o.status !== 'APPROVED' && o.status !== 'REJECTED',
    );
    if (notReady.length > 0) {
      throw new BadRequestException(
        'Every order on this truck must be APPROVED or REJECTED before dispatch',
      );
    }

    await this.db.transaction(async (tx) => {
      await tx
        .update(schema.deliveries)
        .set({
          vehiclePlateNumber: dto.vehiclePlateNumber,
          driverName: dto.driverName,
          driverPhone: dto.driverPhone,
          status: 'DISPATCHED',
          dispatchedAt: new Date(),
        })
        .where(eq(schema.deliveries.id, deliveryId));

      await tx
        .update(schema.orders)
        .set({ status: 'DISPATCHED' })
        .where(
          sql`${schema.orders.deliveryId} = ${deliveryId} AND ${schema.orders.status} = 'APPROVED'`,
        );
    });

    await this.telegram.notifyAdmin(
      `🚚 Batch \`${deliveryId}\` dispatched — plate ${dto.vehiclePlateNumber}, driver ${dto.driverName}.`,
    );

    return this.findOne(deliveryId);
  }

  /**
   * Admin: list all batches/deliveries (optionally filtered by status),
   * newest first, with their product and riding orders attached — powers
   * the batch-management screen (request payment / dispatch actions).
   */
  async findAll(status?: string) {
    return this.db.query.deliveries.findMany({
      where: status
        ? eq(schema.deliveries.status, status as (typeof schema.deliveryStatusEnum.enumValues)[number])
        : undefined,
      with: { orders: { with: { customer: true, items: { with: { product: true } } } }, product: true },
      orderBy: (deliveries, { desc }) => [desc(deliveries.createdAt)],
    });
  }

  async findOne(id: string) {
    const delivery = await this.db.query.deliveries.findFirst({
      where: eq(schema.deliveries.id, id),
      // Order items included (not just the bare order) so a customer's
      // tracking view can show "X / capacity" batch-fill progress without
      // a second round trip — see CustomerBottomNav-era orders page.
      with: { orders: { with: { items: true } } },
    });
    if (!delivery) throw new NotFoundException('Delivery not found');
    return delivery;
  }

  async findByOrder(orderId: string) {
    const [order] = await this.db
      .select()
      .from(schema.orders)
      .where(eq(schema.orders.id, orderId));
    if (!order || !order.deliveryId) {
      throw new NotFoundException('Delivery not found for this order');
    }
    return this.findOne(order.deliveryId);
  }
}
