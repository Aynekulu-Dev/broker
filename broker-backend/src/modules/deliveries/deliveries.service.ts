import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { eq, inArray } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DB } from '../../db/db.module';
import * as schema from '../../db/schema';
import { CreateDeliveryDto } from './dto/delivery.dto';
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

  async findOne(id: string) {
    const delivery = await this.db.query.deliveries.findFirst({
      where: eq(schema.deliveries.id, id),
      with: { orders: true },
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
