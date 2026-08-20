# Broker Frontend

Next.js (App Router) frontend for the B2B Wholesale Order, Logistics & Ledger
Management System. Fully Amharic UI for merchants, plus an admin dashboard.

## Design

Ledger-book visual language: dark navy "cover" chrome (`--ink-navy`) around
cream "paper" cards (`--paper-raised`), with an ochre accent (`--ochre`) tying
back to the edible-oil trade this system was built for. The signature element
is the tilted rubber **stamp** badge ("አለ" / "አልቋል") on every product card —
a nod to the paper ledger stamps this app replaces. Typefaces: Noto Sans
Ethiopic for all UI text (required for Ge'ez glyphs), IBM Plex Mono for
prices and ledger figures.

## Setup

```bash
npm install
cp .env.example .env.local   # point NEXT_PUBLIC_API_URL at the NestJS backend
npm run dev
```

## Pages

| Route | Who | Purpose |
|---|---|---|
| `/login` | Customer | Phone number + OTP login, auto-registers new merchants |
| `/catalog` | Customer | Browse products, binary stock stamps, add to cart |
| `/checkout` | Customer | Review cart, upload payment receipt, submit order (FR-03) |
| `/orders` | Customer | Order history, status, live dispatch tracking (FR-05) |
| `/admin/login` | Admin | Phone + password login |
| `/admin/products` | Admin | Add products, toggle "አለ/አልቋል" stock (FR-02) |
| `/admin/orders` | Admin | Approve/reject orders, record dispatch details (FR-04, FR-05) |
| `/admin/ledgers` | Admin | Merchant balances, manual credit entries, monthly sales (FR-06) |

## Notes

- Cart state persists in `localStorage` (client-only, not an Anthropic
  artifact — real browser storage is fine here).
- The customer OTP flow auto-detects new phone numbers: if `verifyOtp`
  returns a 400 asking for registration details, the login page switches to
  a short store-name/owner-name form before re-submitting.
- All image uploads (receipts and product photos) go through the same
  `/uploads/receipt` backend endpoint.
