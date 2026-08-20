# Broker Backend

NestJS backend for the B2B Wholesale Order, Logistics & Ledger Management System
(regional commodity distribution for Bahir Dar merchants). Implements the SRS in
`broker_1.pdf` — Chapters 1–3.

## Stack
- **Framework:** NestJS
- **DB / ORM:** PostgreSQL + Drizzle ORM
- **Cache:** Redis (product catalog + analytics — FR-07)
- **Auth:** Admin-issued permanent access code for customers (no phone/OTP
  step at login), phone + password for admin
- **Notifications:** Telegram Bot API (FR-04)

## Setup

```bash
npm install
cp .env.example .env   # fill in DATABASE_URL, REDIS_URL, JWT_SECRET, TELEGRAM_*
npm run db:generate    # generate SQL migration from schema.ts
npm run db:migrate     # apply migration to Postgres
npm run start:dev
```

You'll also need to manually insert one ADMIN user with a bcrypt `passwordHash`
(there's no self-serve admin signup by design — see `src/db/schema.ts`).

## Project layout

```
src/
  db/               Drizzle schema, client, migration runner
  common/           Redis module, Telegram service, guards, decorators
  modules/
    auth/           Access-code login (customers) + password login (admin), JWT
    users/          Admin merchant directory + merchant onboarding
    products/       Catalog + binary "አለ/አልቋል" stock toggle, Redis-cached
    orders/         Cart submission, stock check, ledger debit, Telegram alert
    deliveries/     Dispatch details (plate/driver/phone), live tracking
    ledgers/        Merchant balances, manual credits, monthly sales analytics
    uploads/        Payment receipt screenshot upload
```

## Endpoint map (matches FR-01 → FR-07)

| Requirement | Endpoints |
|---|---|
| FR-01 Auth | `POST /users/customers` (admin — onboards a merchant, returns their access code once), `POST /auth/customer-login` (code only), `POST /auth/customers/:id/regenerate-code` (admin), `POST /auth/admin/login` |
| FR-02 Catalog | `GET /products`, `POST /products` (admin), `PATCH /products/:id/stock` (admin) |
| FR-03 Orders | `POST /uploads/receipt`, `POST /orders`, `GET /orders/mine` |
| FR-04 Notifications | handled internally in `orders.service.ts` / `deliveries.service.ts` via `TelegramService` |
| FR-04 Approval | `PATCH /orders/:id/approve`, `PATCH /orders/:id/reject` (admin) |
| FR-05 Logistics | `POST /deliveries` (admin), `GET /deliveries/order/:orderId` |
| FR-06 Ledger | `GET /ledgers/mine`, `GET /ledgers/balances` (admin), `POST /ledgers/credit` (admin), `GET /ledgers/reports/monthly?year=&month=` (admin) |
| FR-07 Caching | Redis-backed in `products.service.ts` (catalog) and `ledgers.service.ts` (analytics) |
| Health | `GET /health` — checks Postgres + Redis connectivity, for uptime monitoring |

## Notes / open decisions (flagged from the SRS review)

1. **Admin auth** uses phone + bcrypt password (not access code) since the
   admin account needs stronger protection — see `passwordHash` column.
2. **Customer auth** is a permanent, admin-generated access code (8
   characters, unambiguous alphabet) instead of OTP. The admin creates the
   merchant via `POST /users/customers`, gets the plaintext code back
   exactly once in that response, and relays it to the merchant directly
   (call, in person, Telegram message). Only a SHA-256 hash is stored —
   the code cannot be recovered, only regenerated (which invalidates the
   old one). Login is rate-limited per IP (`AuthService.enforceLoginRateLimit`)
   since the code alone is the credential. JWTs issued at login are valid
   180 days so merchants don't need to re-enter the code often.
3. **Manual ledger credits** (`POST /ledgers/credit`) cover cash payments
   collected outside the order flow, not just automatic order debits.
4. **Out-of-stock cart items** are rejected as a whole at checkout
   (`orders.service.ts`) with the offending product IDs returned, so the
   frontend can prompt the merchant to adjust their cart rather than
   silently dropping items.
5. **Ledger balance writes** (order creation, order rejection, manual
   credit) all run inside a `db.transaction()` with a Postgres advisory
   lock (`pg_advisory_xact_lock`) keyed on the customer id, and compute
   the balance fresh as `SUM(debit) - SUM(credit)` rather than trusting
   the previous row's cached balance. This closes a lost-update race
   where two concurrent writes for the same merchant could otherwise
   produce a wrong balance.
