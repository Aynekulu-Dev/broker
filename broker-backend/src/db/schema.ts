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
  'APPROVED',
  'REJECTED',
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
  paymentReceiptUrl: varchar('payment_receipt_url', { length: 500 }).notNull(),
  // Set once the order is loaded onto a delivery run (see `deliveries`).
  // Several orders can share the same deliveryId.
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
  vehiclePlateNumber: varchar('vehicle_plate_number', { length: 50 }).notNull(),
  driverName: varchar('driver_name', { length: 255 }).notNull(),
  driverPhone: varchar('driver_phone', { length: 20 }).notNull(),
  dispatchedAt: timestamp('dispatched_at').defaultNow().notNull(),
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

export const deliveriesRelations = relations(deliveries, ({ many }) => ({
  orders: many(orders),
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
