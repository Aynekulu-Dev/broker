import {
  pgTable,
  pgEnum,
  uuid,
  varchar,
  text,
  decimal,
  integer,
  boolean,
  timestamp,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// ---------- Enums ----------
export const roleEnum = pgEnum('role', ['CUSTOMER', 'ADMIN']);
export const orderStatusEnum = pgEnum('order_status', [
  'PENDING',
  // Batch (truck-load) reached its capacity and admin has asked
  // customers riding on it to pay. Set on every PENDING order in the
  // batch at once, see DeliveriesService.requestPayment.
  'AWAITING_PAYMENT',
  // Customer uploaded a payment receipt while AWAITING_PAYMENT; waiting
  // on admin review, same review step as the old up-front-receipt flow.
  'PAYMENT_SUBMITTED',
  'APPROVED',
  'REJECTED',
  'DISPATCHED',
]);

// A "batch" is a truck-load being consolidated toward its capacity.
// COLLECTING: still accepting orders for this product.
// FULL: capacity reached, waiting for admin to request payment.
// PAYMENT_REQUESTED: customers notified, paying / being reviewed.
// DISPATCHED: vehicle left with an approved, paid load.
export const deliveryStatusEnum = pgEnum('delivery_status', [
  'COLLECTING',
  'FULL',
  'PAYMENT_REQUESTED',
  'DISPATCHED',
]);

// ---------- 1. Users ----------
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  storeName: varchar('store_name', { length: 255 }).notNull(),
  ownerName: varchar('owner_name', { length: 255 }).notNull(),
  phoneNumber: varchar('phone_number', { length: 20 }).notNull().unique(),
  city: varchar('city', { length: 100 }).default('Bahir Dar'),
  role: roleEnum('role').default('CUSTOMER').notNull(),
  // Only set for ADMIN users. Customers authenticate via phone + OTP only.
  passwordHash: varchar('password_hash', { length: 255 }),
  // Customer login credential: the admin creates the merchant record and
  // hands them a one-time-generated access code in person/by phone. The
  // code itself is never stored — only a SHA-256 hash, indexed for fast
  // exact-match lookup at login (see AuthService.customerLogin).
  accessCodeHash: varchar('access_code_hash', { length: 64 }).unique(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// ---------- 2. Products ----------
export const products = pgTable('products', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull(),
  category: varchar('category', { length: 100 }).notNull(),
  price: decimal('price', { precision: 12, scale: 2 }).notNull(),
  description: text('description'),
  photoUrl: varchar('photo_url', { length: 500 }).notNull(),
  isInStock: boolean('is_in_stock').default(true).notNull(),
  // Truck-load consolidation threshold for this product (e.g. 600
  // jerricans). Null = ordinary flow: pay up front, no batching.
  // When set, orders for this product accumulate into a COLLECTING
  // delivery until this quantity is reached (see OrdersService.create).
  batchCapacity: integer('batch_capacity'),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// ---------- 3. Orders ----------
export const orders = pgTable('orders', {
  id: uuid('id').primaryKey().defaultRandom(),
  customerId: uuid('customer_id')
    .references(() => users.id)
    .notNull(),
  totalAmount: decimal('total_amount', { precision: 12, scale: 2 }).notNull(),
  status: orderStatusEnum('status').default('PENDING').notNull(),
  // Null while PENDING/AWAITING_PAYMENT — the batch flow only requires
  // this once the truck is full and payment has been requested. Orders
  // outside the batch flow still attach a receipt at creation time.
  paymentReceiptUrl: varchar('payment_receipt_url', { length: 500 }),
  // Set as soon as the order joins a batch (COLLECTING) — not only at
  // final dispatch. Several orders can share the same deliveryId.
  deliveryId: uuid('delivery_id').references(() => deliveries.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// ---------- 4. Order Items ----------
export const orderItems = pgTable('order_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  orderId: uuid('order_id')
    .references(() => orders.id)
    .notNull(),
  productId: uuid('product_id')
    .references(() => products.id)
    .notNull(),
  quantity: integer('quantity').notNull(),
  unitPrice: decimal('unit_price', { precision: 12, scale: 2 }).notNull(),
});

// ---------- 5. Deliveries ----------
// A single delivery run (one truck/driver) can now carry several orders
// at once — the admin loads multiple approved orders onto one vehicle
// and records the transport details only once. So the relationship is
// delivery 1 --> many orders (orders.deliveryId), not the old 1:1.
export const deliveries = pgTable('deliveries', {
  id: uuid('id').primaryKey().defaultRandom(),
  // Only set for batch/consolidation runs (see OrdersService.create).
  // Manual ad-hoc deliveries (old flow: admin hand-picks already-APPROVED
  // orders) leave this null.
  productId: uuid('product_id').references(() => products.id),
  // Truck capacity for this batch, copied from products.batchCapacity
  // at batch-creation time (a truck's capacity doesn't change even if
  // the product's default later does).
  capacity: integer('capacity'),
  status: deliveryStatusEnum('status').default('COLLECTING').notNull(),
  filledAt: timestamp('filled_at'),
  paymentRequestedAt: timestamp('payment_requested_at'),
  // Unknown until the admin actually dispatches the truck.
  vehiclePlateNumber: varchar('vehicle_plate_number', { length: 50 }),
  driverName: varchar('driver_name', { length: 255 }),
  driverPhone: varchar('driver_phone', { length: 20 }),
  dispatchedAt: timestamp('dispatched_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// ---------- 6. Ledgers ----------
export const ledgers = pgTable('ledgers', {
  id: uuid('id').primaryKey().defaultRandom(),
  customerId: uuid('customer_id')
    .references(() => users.id)
    .notNull(),
  orderId: uuid('order_id').references(() => orders.id),
  debitAmount: decimal('debit_amount', { precision: 12, scale: 2 }).default('0'),
  creditAmount: decimal('credit_amount', { precision: 12, scale: 2 }).default('0'),
  balance: decimal('balance', { precision: 12, scale: 2 }).notNull(),
  recordedAt: timestamp('recorded_at').defaultNow().notNull(),
});

// ---------- Relations ----------
export const usersRelations = relations(users, ({ many }) => ({
  orders: many(orders),
  ledgerEntries: many(ledgers),
}));

export const productsRelations = relations(products, ({ many }) => ({
  orderItems: many(orderItems),
  batches: many(deliveries),
}));

export const ordersRelations = relations(orders, ({ one, many }) => ({
  customer: one(users, {
    fields: [orders.customerId],
    references: [users.id],
  }),
  items: many(orderItems),
  delivery: one(deliveries, {
    fields: [orders.deliveryId],
    references: [deliveries.id],
  }),
  ledgerEntries: many(ledgers),
}));

export const orderItemsRelations = relations(orderItems, ({ one }) => ({
  order: one(orders, {
    fields: [orderItems.orderId],
    references: [orders.id],
  }),
  product: one(products, {
    fields: [orderItems.productId],
    references: [products.id],
  }),
}));

export const deliveriesRelations = relations(deliveries, ({ one, many }) => ({
  orders: many(orders),
  product: one(products, {
    fields: [deliveries.productId],
    references: [products.id],
  }),
}));

export const ledgersRelations = relations(ledgers, ({ one }) => ({
  customer: one(users, {
    fields: [ledgers.customerId],
    references: [users.id],
  }),
  order: one(orders, {
    fields: [ledgers.orderId],
    references: [orders.id],
  }),
}));

// ---------- Types ----------
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Product = typeof products.$inferSelect;
export type NewProduct = typeof products.$inferInsert;
export type Order = typeof orders.$inferSelect;
export type NewOrder = typeof orders.$inferInsert;
export type OrderItem = typeof orderItems.$inferSelect;
export type NewOrderItem = typeof orderItems.$inferInsert;
export type Delivery = typeof deliveries.$inferSelect;
export type NewDelivery = typeof deliveries.$inferInsert;
export type Ledger = typeof ledgers.$inferSelect;
export type NewLedger = typeof ledgers.$inferInsert;
