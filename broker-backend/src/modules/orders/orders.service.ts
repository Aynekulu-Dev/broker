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
import { CreateOrderDto, UpdateOrderDto } from './dto/order.dto';
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
   * FR-03: cart submission + mandatory receipt.
   * Rejects the whole submission if any cart item has gone out of stock
   * between browsing and checkout, so the merchant can adjust the cart.
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
          paymentReceiptUrl: dto.paymentReceiptUrl,
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

  /** Admin reviews the receipt and approves (FR-04). */
  async approve(id: string) {
    await this.ensurePending(id);
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
    const order = await this.ensurePending(id);
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

    await this.db.transaction(async (tx) => {
      if (order.status === 'PENDING' || order.status === 'APPROVED') {
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
