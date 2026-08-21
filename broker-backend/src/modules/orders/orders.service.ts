import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { desc, eq, inArray, sql } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DB } from '../../db/db.module';
import * as schema from '../../db/schema';
import {
  CreateOrderDto,
  SubmitPaymentDto,
  UpdateOrderDto,
} from './dto/order.dto';
import { TelegramService } from '../../common/telegram.service';

/**
 * Any function that has the same shape as `db` for query purposes —
 * either the pooled db instance or a `tx` handed to us inside a
 * `db.transaction(...)` callback. Lets the balance helper below work
 * both inside and outside a transaction.
 */
type Queryable = NodePgDatabase<typeof schema>;

@Injectable()
export class OrdersService {
  constructor(
    @Inject(DB) private readonly db: NodePgDatabase<typeof schema>,
    private readonly telegram: TelegramService,
  ) {}

  /**
   * FR-03: cart submission.
   * Rejects the whole submission if any cart item has gone out of stock
   * between browsing and checkout, so the merchant can adjust the cart.
   *
   * Batching: an order that is *only* for one batchCapacity product
   * (e.g. jerricans of a specific oil) joins a truck-load instead of
   * requiring payment up front — see joinBatch below. Mixed-cart or
   * non-batched orders keep the original pay-with-receipt-now flow, so
   * paymentReceiptUrl is required in that case.
   */
  async create(customerId: string, dto: CreateOrderDto) {
    const productIds = dto.items.map((i) => i.productId);
    const products = await this.db
      .select()
      .from(schema.products)
      .where(inArray(schema.products.id, productIds));

    const outOfStock = products.filter((p) => !p.isInStock);
    if (outOfStock.length > 0) {
      throw new BadRequestException({
        message: 'Some items in your cart are out of stock',
        outOfStockProductIds: outOfStock.map((p) => p.id),
      });
    }

    const priceByProduct = new Map(products.map((p) => [p.id, p.price]));
    let totalAmount = 0;
    for (const item of dto.items) {
      const price = priceByProduct.get(item.productId);
      if (!price) throw new BadRequestException('Unknown product in cart');
      totalAmount += Number(price) * item.quantity;
    }

    // Single-product cart against a batchCapacity product => batch flow.
    const batchProduct =
      dto.items.length === 1
        ? products.find((p) => p.id === dto.items[0].productId)
        : undefined;
    const isBatched = !!batchProduct?.batchCapacity;

    if (!isBatched && !dto.paymentReceiptUrl) {
      throw new BadRequestException(
        'paymentReceiptUrl is required for this product',
      );
    }

    // Everything below must succeed or fail together: an order without
    // its items, or an order without its ledger debit, would silently
    // corrupt the merchant's balance. We also serialize on the customer
    // via an advisory lock so two concurrent orders (or an order racing
    // a manual credit) can't both read the same "previous balance" and
    // stomp on each other (lost update).
    const orderId = await this.db.transaction(async (tx) => {
      const [order] = await tx
        .insert(schema.orders)
        .values({
          customerId,
          totalAmount: totalAmount.toFixed(2),
          paymentReceiptUrl: isBatched ? undefined : dto.paymentReceiptUrl,
          status: 'PENDING',
        })
        .returning();

      await tx.insert(schema.orderItems).values(
        dto.items.map((item) => ({
          orderId: order.id,
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: priceByProduct.get(item.productId) as string,
        })),
      );

      if (isBatched && batchProduct) {
        await this.joinBatch(
          tx,
          order.id,
          batchProduct,
          dto.items[0].quantity,
        );
      }

      // FR-06: debit the merchant's running ledger for the order total.
      const previousBalance = await this.getBalanceForUpdate(tx, customerId);
      const newBalance = previousBalance + totalAmount;
      await tx.insert(schema.ledgers).values({
        customerId,
        orderId: order.id,
        debitAmount: totalAmount.toFixed(2),
        creditAmount: '0',
        balance: newBalance.toFixed(2),
      });

      return order.id;
    });

    // FR-04: instant Telegram alert to admin. Deliberately outside the
    // transaction — a Telegram/network failure must not roll back a
    // successfully placed order.
    const [customer] = await this.db
      .select()
      .from(schema.users)
      .where(eq(schema.users.id, customerId));
    await this.telegram.notifyNewOrder({
      storeName: customer.storeName,
      ownerName: customer.ownerName,
      phoneNumber: customer.phoneNumber,
      totalAmount: totalAmount.toFixed(2),
      orderId,
    });

    return this.findOne(orderId);
  }

  /**
   * Assigns a newly-created order to the product's active COLLECTING
   * batch (creating one if needed), then flips the batch to FULL once
   * its capacity is reached.
   *
   * Locked per-product (advisory tx lock) so two customers ordering the
   * same product at the same instant can't both read "batch not full
   * yet" and overshoot the truck's capacity.
   */
  private async joinBatch(
    tx: Queryable,
    orderId: string,
    product: schema.Product,
    quantity: number,
  ) {
    await tx.execute(
      sql`SELECT pg_advisory_xact_lock(hashtext(${product.id}::text))`,
    );

    let [batch] = await tx
      .select()
      .from(schema.deliveries)
      .where(
        sql`${schema.deliveries.productId} = ${product.id} AND ${schema.deliveries.status} = 'COLLECTING'`,
      )
      .limit(1);

    if (!batch) {
      [batch] = await tx
        .insert(schema.deliveries)
        .values({
          productId: product.id,
          capacity: product.batchCapacity,
          status: 'COLLECTING',
        })
        .returning();
    }

    await tx
      .update(schema.orders)
      .set({ deliveryId: batch.id })
      .where(eq(schema.orders.id, orderId));

    const [{ loaded }] = await tx
      .select({
        loaded: sql<string>`COALESCE(SUM(${schema.orderItems.quantity}), 0)`,
      })
      .from(schema.orderItems)
      .innerJoin(schema.orders, eq(schema.orderItems.orderId, schema.orders.id))
      .where(
        sql`${schema.orders.deliveryId} = ${batch.id} AND ${schema.orders.status} != 'REJECTED'`,
      );

    if (batch.capacity && Number(loaded) >= batch.capacity) {
      await tx
        .update(schema.deliveries)
        .set({ status: 'FULL', filledAt: new Date() })
        .where(eq(schema.deliveries.id, batch.id));
    }
  }

  async findAll() {
    return this.db.query.orders.findMany({
      with: { customer: true, items: { with: { product: true } }, delivery: true },
      orderBy: desc(schema.orders.createdAt),
    });
  }

  async findForCustomer(customerId: string) {
    return this.db.query.orders.findMany({
      where: eq(schema.orders.customerId, customerId),
      with: { items: { with: { product: true } }, delivery: true },
      orderBy: desc(schema.orders.createdAt),
    });
  }

  async findOne(id: string) {
    const order = await this.db.query.orders.findFirst({
      where: eq(schema.orders.id, id),
      with: { customer: true, items: { with: { product: true } }, delivery: true },
    });
    if (!order) throw new NotFoundException('Order not found');
    return order;
  }

  /**
   * Customer: upload the payment receipt once their batch has become
   * FULL and the admin has requested payment (order status
   * AWAITING_PAYMENT — see DeliveriesService.requestPayment). Moves the
   * order to PAYMENT_SUBMITTED, ready for the same admin review step
   * the old up-front-receipt flow used.
   */
  async submitPayment(orderId: string, customerId: string, dto: SubmitPaymentDto) {
    const [order] = await this.db
      .select()
      .from(schema.orders)
      .where(eq(schema.orders.id, orderId));
    if (!order) throw new NotFoundException('Order not found');
    if (order.customerId !== customerId) {
      throw new BadRequestException('This order does not belong to you');
    }
    if (order.status !== 'AWAITING_PAYMENT') {
      throw new BadRequestException(
        `Order is ${order.status} — payment can't be submitted right now`,
      );
    }

    await this.db
      .update(schema.orders)
      .set({ paymentReceiptUrl: dto.paymentReceiptUrl, status: 'PAYMENT_SUBMITTED' })
      .where(eq(schema.orders.id, orderId));

    await this.telegram.notifyAdmin(
      `💰 Payment receipt submitted for order \`${orderId}\`. Please review.`,
    );

    return this.findOne(orderId);
  }

  /**
   * Admin reviews the receipt and approves (FR-04). Works for both the
   * ordinary flow (PENDING + receipt attached at creation) and the
   * batch flow (PAYMENT_SUBMITTED, receipt attached via submitPayment).
   */
  async approve(id: string) {
    const [order] = await this.db
      .select()
      .from(schema.orders)
      .where(eq(schema.orders.id, id));
    if (!order) throw new NotFoundException('Order not found');
    if (order.status !== 'PENDING' && order.status !== 'PAYMENT_SUBMITTED') {
      throw new BadRequestException(
        `Order is already ${order.status}, cannot change status`,
      );
    }
    if (!order.paymentReceiptUrl) {
      throw new BadRequestException(
        'Cannot approve an order with no payment receipt on file',
      );
    }
    await this.db
      .update(schema.orders)
      .set({ status: 'APPROVED' })
      .where(eq(schema.orders.id, id));
    return this.findOne(id);
  }

  /**
   * Admin rejects the order — the earlier debit is reversed with a
   * matching credit so the merchant's balance nets back out (FR-06).
   */
  async reject(id: string, reason: string) {
    const order = await this.ensureRejectable(id);
    const reversal = Number(order.totalAmount);

    await this.db.transaction(async (tx) => {
      await tx
        .update(schema.orders)
        .set({ status: 'REJECTED' })
        .where(eq(schema.orders.id, id));

      const previousBalance = await this.getBalanceForUpdate(
        tx,
        order.customerId,
      );
      await tx.insert(schema.ledgers).values({
        customerId: order.customerId,
        orderId: order.id,
        debitAmount: '0',
        creditAmount: reversal.toFixed(2),
        balance: (previousBalance - reversal).toFixed(2),
      });
    });

    // If this order was still riding on an open (COLLECTING/FULL) batch,
    // dropping it may pull the batch back under capacity.
    if (order.deliveryId) {
      await this.recomputeBatchAfterOrderChange(order.deliveryId);
    }

    await this.telegram.notifyAdmin(
      `❌ Order \`${id}\` rejected. Reason: ${reason}`,
    );
    return this.findOne(id);
  }

  /**
   * Admin edit: e.g. the merchant meant to order 9 not 90 and called it
   * in before approval. Only allowed while PENDING — once APPROVED the
   * order has been reviewed against its receipt, and once DISPATCHED
   * goods are physically moving, so changing the contents at that point
   * would silently disagree with what was actually approved/shipped.
   *
   * Like `reject`, this never rewrites the original debit ledger row —
   * it appends a correction entry for the difference, so the ledger
   * stays an honest append-only history.
   */
  async update(id: string, dto: UpdateOrderDto) {
    const order = await this.ensurePending(id);

    const productIds = dto.items.map((i) => i.productId);
    const products = await this.db
      .select()
      .from(schema.products)
      .where(inArray(schema.products.id, productIds));

    const priceByProduct = new Map(products.map((p) => [p.id, p.price]));
    let newTotal = 0;
    for (const item of dto.items) {
      const price = priceByProduct.get(item.productId);
      if (!price) throw new BadRequestException('Unknown product in cart');
      newTotal += Number(price) * item.quantity;
    }

    const oldTotal = Number(order.totalAmount);
    const delta = newTotal - oldTotal;

    await this.db.transaction(async (tx) => {
      await tx
        .update(schema.orders)
        .set({ totalAmount: newTotal.toFixed(2) })
        .where(eq(schema.orders.id, id));

      await tx.delete(schema.orderItems).where(eq(schema.orderItems.orderId, id));
      await tx.insert(schema.orderItems).values(
        dto.items.map((item) => ({
          orderId: id,
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: priceByProduct.get(item.productId) as string,
        })),
      );

      if (delta !== 0) {
        const previousBalance = await this.getBalanceForUpdate(tx, order.customerId);
        const newBalance = previousBalance + delta;
        await tx.insert(schema.ledgers).values({
          customerId: order.customerId,
          orderId: id,
          debitAmount: delta > 0 ? delta.toFixed(2) : '0',
          creditAmount: delta < 0 ? (-delta).toFixed(2) : '0',
          balance: newBalance.toFixed(2),
        });
      }
    });

    return this.findOne(id);
  }

  /**
   * Admin delete: for cleaning up a mistaken/duplicate order. Blocked
   * once DISPATCHED — goods are already on a truck by then, so removing
   * the record would hide what actually shipped.
   *
   * If the order's debit is still "live" (PENDING/APPROVED — REJECTED
   * ones were already reversed by `reject`), a reversal credit is
   * appended first so the merchant's balance is correct afterwards.
   * Ledger rows are never deleted (audit trail); they're just detached
   * from the order (orderId set to NULL) so the FK doesn't block the
   * delete.
   */
  async remove(id: string) {
    const [order] = await this.db.select().from(schema.orders).where(eq(schema.orders.id, id));
    if (!order) throw new NotFoundException('Order not found');
    if (order.status === 'DISPATCHED') {
      throw new BadRequestException(
        'Dispatched orders cannot be deleted — the goods have already shipped',
      );
    }

    const liveDebitStatuses = [
      'PENDING',
      'AWAITING_PAYMENT',
      'PAYMENT_SUBMITTED',
      'APPROVED',
    ];

    await this.db.transaction(async (tx) => {
      if (liveDebitStatuses.includes(order.status)) {
        const reversal = Number(order.totalAmount);
        const previousBalance = await this.getBalanceForUpdate(tx, order.customerId);
        await tx.insert(schema.ledgers).values({
          customerId: order.customerId,
          orderId: id,
          debitAmount: '0',
          creditAmount: reversal.toFixed(2),
          balance: (previousBalance - reversal).toFixed(2),
        });
      }

      await tx
        .update(schema.ledgers)
        .set({ orderId: null })
        .where(eq(schema.ledgers.orderId, id));
      await tx.delete(schema.orderItems).where(eq(schema.orderItems.orderId, id));
      await tx.delete(schema.orders).where(eq(schema.orders.id, id));
    });

    if (order.deliveryId) {
      await this.recomputeBatchAfterOrderChange(order.deliveryId);
    }

    return { deleted: true };
  }

  private async ensurePending(id: string) {
    const [order] = await this.db
      .select()
      .from(schema.orders)
      .where(eq(schema.orders.id, id));
    if (!order) throw new NotFoundException('Order not found');
    if (order.status !== 'PENDING') {
      throw new BadRequestException(
        `Order is already ${order.status}, cannot change status`,
      );
    }
    return order;
  }

  /** Reject is allowed any time before the order has actually been
   * paid-and-approved or shipped — including while a batched order is
   * still reserving a spot, awaiting payment, or under review. */
  private async ensureRejectable(id: string) {
    const [order] = await this.db
      .select()
      .from(schema.orders)
      .where(eq(schema.orders.id, id));
    if (!order) throw new NotFoundException('Order not found');
    const rejectable = ['PENDING', 'AWAITING_PAYMENT', 'PAYMENT_SUBMITTED'];
    if (!rejectable.includes(order.status)) {
      throw new BadRequestException(
        `Order is already ${order.status}, cannot change status`,
      );
    }
    return order;
  }

  /**
   * After an order is rejected/removed, its batch may have dropped back
   * under capacity. Only COLLECTING/FULL batches are touched — once
   * payment has been requested (or the truck dispatched) the batch is
   * locked in, since customers may already be mid-payment.
   */
  private async recomputeBatchAfterOrderChange(deliveryId: string) {
    const [batch] = await this.db
      .select()
      .from(schema.deliveries)
      .where(eq(schema.deliveries.id, deliveryId));
    if (!batch || (batch.status !== 'COLLECTING' && batch.status !== 'FULL')) {
      return;
    }

    const [{ loaded }] = await this.db
      .select({
        loaded: sql<string>`COALESCE(SUM(${schema.orderItems.quantity}), 0)`,
      })
      .from(schema.orderItems)
      .innerJoin(schema.orders, eq(schema.orderItems.orderId, schema.orders.id))
      .where(
        sql`${schema.orders.deliveryId} = ${deliveryId} AND ${schema.orders.status} != 'REJECTED'`,
      );

    const stillFull = batch.capacity != null && Number(loaded) >= batch.capacity;
    if (batch.status === 'FULL' && !stillFull) {
      await this.db
        .update(schema.deliveries)
        .set({ status: 'COLLECTING', filledAt: null })
        .where(eq(schema.deliveries.id, deliveryId));
    }
  }

  /**
   * Returns the customer's current balance computed fresh from the sum
   * of all ledger entries (not the last row's cached `balance` value),
   * after taking a Postgres advisory transaction lock keyed on the
   * customer id.
   *
   * The lock means: if two writers (e.g. a new order + a manual admin
   * credit, or two orders submitted at the same moment) try to touch
   * the same customer's ledger concurrently, the second one blocks
   * until the first transaction commits — so it always computes its
   * "previous balance" from up-to-date data instead of a stale read.
   * MUST be called with the `tx` from an active `db.transaction(...)`,
   * never with the plain `db`, or the lock is released immediately and
   * provides no protection.
   */
  private async getBalanceForUpdate(
    tx: Queryable,
    customerId: string,
  ): Promise<number> {
    await tx.execute(
      sql`SELECT pg_advisory_xact_lock(hashtext(${customerId}::text))`,
    );
    const result = await tx.execute<{ balance: string | null }>(sql`
      SELECT COALESCE(SUM(${schema.ledgers.debitAmount}), 0)
           - COALESCE(SUM(${schema.ledgers.creditAmount}), 0) AS balance
      FROM ${schema.ledgers}
      WHERE ${schema.ledgers.customerId} = ${customerId}
    `);
    const balance = result.rows[0]?.balance;
    return balance ? Number(balance) : 0;
  }
}
