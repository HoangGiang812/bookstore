# Bookish Backend (MVC)

This is a reference implementation that **covers the full feature set** you requested, mapped to your MongoDB dump
(`bookish.*` collections). It includes both **Customer** and **Admin** flows.

> Built on: Express + Mongoose. Date generated: 2025-09-13

## Quick start
```bash
cp .env.example .env
# edit .env (MONGO_URI, JWT secrets, SMTP, etc.)

npm i
npm run dev
# API will run at http://localhost:4000
```

## Notes
- Models align with your dump: `authors`, `banners`, `books`, `categories`, `collections`, `contacts`, `coupons`, `coupon_usages`,
  `email_verifications`, `inventories`, `inventory_movements`, `newsletters`, `orders`, `pages`, `publishers`, `reviews`, `rmas`,
  `sessions`, `settings`, `users`, `audit_logs`.
- Implemented: reviews (only buyers), coupon application, order cancel, RMA, newsletter/contact, admin CRUD for entities,
  banner/page public, logout-all, settings-driven shipping/tax, audit log, email confirmations.
- Inventory movements are updated on order create/cancel/RMA.
