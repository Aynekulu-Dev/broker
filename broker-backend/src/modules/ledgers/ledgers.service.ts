import { Inject, Injectable } from '@nestjs/common';
import { and, desc, eq, gte, inArray, lt, sql } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DB } from '../../db/db.module';
import { CacheHelper } from '../../common/cache.helper';
import * as schema from '../../db/schema';
import { AddManualCreditDto } from './dto/ledger.dto';

const ANALYTICS_CACHE_TTL_SECONDS = 300; // 5 min — heavy aggregate queries

@Injectable()
export class LedgersService {
  constructor(
    @Inject(DB) private readonly db: NodePgDatabase<typeof schema>,
    private readonly cache: CacheHelper,
  ) {}

  /** Individual merchant ledger — full history + running balance. */
  async getCustomerLedger(customerId: string) {
    const entries = await this.db
      .select()
      .from(schema.ledgers)
      .where(eq(schema.ledgers.customerId, customerId))
      .orderBy(desc(schema.ledgers.recordedAt));

    return {
      entries,
      currentBalance: entries[0]?.balance ?? '0.00',
    };
  }

  /**
   * FR-06/FR-07: admin dashboard — every merchant's current balance,
   * served from Redis since it aggregates across all customers.
   *
   * This used to run one extra SELECT per merchant to fetch their name/
   * phone (an N+1 query — 40 merchants meant 41 round trips to the DB
   * on every cache miss). It's now a single query: DISTINCT ON picks
   * each customer's latest ledger row, joined directly against users.
   */
  async getAllBalances() {
    const cached = await this.cache.get<any[]>('analytics:merchant-balances');
    if (cached) return cached;

    const result = await this.db.execute<{
      customer_id: string;
      balance: string;
      store_name: string;
      owner_name: string;
      phone_number: string;
    }>(sql`
      SELECT DISTINCT ON (l.customer_id)
        l.customer_id, l.balance,
        u.store_name, u.owner_name, u.phone_number
      FROM ledgers l
      INNER JOIN users u ON u.id = l.customer_id
      ORDER BY l.customer_id, l.recorded_at DESC
    `);

    const balances = result.rows.map((row) => ({
      customerId: row.customer_id,
      storeName: row.store_name,
      ownerName: row.owner_name,
      phoneNumber: row.phone_number,
      balance: row.balance,
    }));

    await this.cache.set('analytics:merchant-balances', balances, ANALYTICS_CACHE_TTL_SECONDS);
    return balances;
  }

  /**
   * Manual credit entry — for payments admin records outside the
   * order flow (e.g. cash collected in person, bank deposit reconciled
   * later). Reduces the merchant's outstanding balance.
   */
  async addManualCredit(dto: AddManualCreditDto) {
    const credit = Number(dto.amount);

    // Locked + transactional for the same reason as OrdersService.create:
    // this can otherwise race with a customer placing an order at the
    // same moment and produce a wrong balance (lost update).
    const entry = await this.db.transaction(async (tx) => {
      await tx.execute(
        sql`SELECT pg_advisory_xact_lock(hashtext(${dto.customerId}::text))`,
      );
      const result = await tx.execute<{ balance: string | null }>(sql`
        SELECT COALESCE(SUM(${schema.ledgers.debitAmount}), 0)
             - COALESCE(SUM(${schema.ledgers.creditAmount}), 0) AS balance
        FROM ${schema.ledgers}
        WHERE ${schema.ledgers.customerId} = ${dto.customerId}
      `);
      const balance = result.rows[0]?.balance;
      const previousBalance = balance ? Number(balance) : 0;
      const newBalance = previousBalance - credit;

      const [inserted] = await tx
        .insert(schema.ledgers)
        .values({
          customerId: dto.customerId,
          orderId: dto.orderId ?? null,
          debitAmount: '0',
          creditAmount: credit.toFixed(2),
          balance: newBalance.toFixed(2),
        })
        .returning();
      return inserted;
    });

    await this.cache.del('analytics:merchant-balances');
    return entry;
  }

  /**
   * Admin view: this merchant's orders that aren't fully paid off yet,
   * with how much has been allocated to each so far — powers "pay this
   * specific order" instead of only ever settling the total balance.
   * REJECTED orders are excluded since their debit was already reversed.
   */
  async getOutstandingOrders(customerId: string) {
    const result = await this.db.execute<{
      id: string;
      total_amount: string;
      status: string;
      created_at: string;
      paid: string;
    }>(sql`
      SELECT o.id, o.total_amount, o.status, o.created_at,
        COALESCE(SUM(l.credit_amount) FILTER (WHERE l.order_id = o.id), 0) AS paid
      FROM orders o
      LEFT JOIN ledgers l ON l.order_id = o.id
      WHERE o.customer_id = ${customerId} AND o.status != 'REJECTED'
      GROUP BY o.id
      HAVING o.total_amount > COALESCE(SUM(l.credit_amount) FILTER (WHERE l.order_id = o.id), 0)
      ORDER BY o.created_at
    `);

    return result.rows.map((row) => ({
      orderId: row.id,
      totalAmount: row.total_amount,
      paid: row.paid,
      remaining: (Number(row.total_amount) - Number(row.paid)).toFixed(2),
      status: row.status,
      createdAt: row.created_at,
    }));
  }

  /**
   * FR-06: monthly product-wise sales breakdown (quantity + revenue),
   * counting only APPROVED/DISPATCHED orders.
   */
  async getMonthlyProductSales(year: number, month: number) {
    const cacheKey = `analytics:monthly-sales:${year}-${month}`;
    const cached = await this.cache.get<any[]>(cacheKey);
    if (cached) return cached;

    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 1);

    const rows = await this.db
      .select({
        productId: schema.orderItems.productId,
        productName: schema.products.name,
        totalQuantity: sql<number>`sum(${schema.orderItems.quantity})`,
        totalRevenue: sql<number>`sum(${schema.orderItems.quantity} * ${schema.orderItems.unitPrice})`,
      })
      .from(schema.orderItems)
      .innerJoin(schema.orders, eq(schema.orderItems.orderId, schema.orders.id))
      .innerJoin(schema.products, eq(schema.orderItems.productId, schema.products.id))
      .where(
        and(
          inArray(schema.orders.status, ['APPROVED', 'DISPATCHED']),
          gte(schema.orders.createdAt, start),
          lt(schema.orders.createdAt, end),
        ),
      )
      .groupBy(schema.orderItems.productId, schema.products.name);

    await this.cache.set(cacheKey, rows, ANALYTICS_CACHE_TTL_SECONDS);
    return rows;
  }
}
