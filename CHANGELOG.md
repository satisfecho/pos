# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

## [1.0.6] - 2026-03-15

### Added

- **Kitchen display** (`/kitchen`): Dedicated full-screen view for the kitchen — large, readable order cards; auto-refresh every 15 seconds and live updates via WebSocket; optional sound on new orders (toggle persisted in localStorage). Read-only: shows active orders (pending, preparing, ready, partially_delivered) with table, items, and item status. Access: same roles as Orders (owner, admin, kitchen, waiter, receptionist). Nav link "Kitchen display" in sidebar. i18n: EN, DE, ES, CA. See [docs/0015-kitchen-display.md](docs/0015-kitchen-display.md).

## [1.0.5] - 2026-03-15

### Added

- **Provider dashboard**: List and tile view toggle plus search (by name, catalog name, external ID) on `/provider`.
- **Company details toast**: Success toast "Company details saved." after saving provider company details.
- **Puppeteer test**: `test:provider-add-product` (login as provider, add product, assert it appears in list). Migration `20260315100000_add_provider_company_fields.sql` for provider table company/bank columns.

### Fixed

- **Provider create product 500**: Endpoint returns `model_dump(mode="json")` and wraps in try/except so DB/serialization errors return a clear 500 message.
- **Landing provider links test**: Navigate by URL to `/provider/register` instead of waiting for client-side navigation after click (fixes timeout with Angular routing).

## [1.0.4] - 2026-03-15

### Added

- **Provider portal**: Providers can register and log in to manage their catalog. New routes: `/provider/login`, `/provider/register`, `/provider` (dashboard). Provider users have `provider_id` on `User`; JWT supports `provider_id` for provider-scoped auth. API: `POST /register/provider`, `POST /token?scope=provider`, `GET/PUT /provider/me`, `GET/POST/PUT/DELETE /provider/products`, `POST /provider/products/:id/image`, `GET /provider/catalog`. Landing page footer includes a "Provider portal" link. `provider.guard.ts` and provider routes in `app.routes.ts`.
- **Provider registration company details**: Registration and profile support full company name, address, tax number, phone, company email, and bank details (IBAN, BIC, bank name, account holder). `PUT /provider/me` updates company details; dashboard shows a "Company details" section and edit modal.
- **Catalog on deploy**: Deploy script runs beer, pizza, and wine catalog imports so production (amvara9) has the same catalog as development. Deploy ensures `back/uploads` is writable by the back container (uid 1000) so import images are saved.
- **Puppeteer tests**: `front/scripts/test-catalog.mjs` (npm `test:catalog`) for catalog page and image loading; `test-order-8-status.mjs` (npm `test:order-8-status`) for order status dropdown on a given order; `test-register-page.mjs` (npm `test:register-page`) for register page "Who is this for?" explanation; `test-landing-provider-links.mjs` and `test-provider-register.mjs` for provider portal flows.
- **Register page explanation**: "Who is this for?" block on `/register` clarifying that the form is for restaurant/business owners (providers), not for guests. Guest hint: use "Book a table" or "Enter table code" on the homepage. i18n keys `REGISTER_WHO_IS_THIS_FOR`, `REGISTER_FOR_PROVIDERS`, `REGISTER_GUEST_HINT` in en, de, es, ca, zh-CN, hi.
- **Git hooks**: `scripts/git-hooks/prepare-commit-msg` strips Cursor/agent attribution from commit messages; `scripts/install-git-hooks.sh` installs hooks from `scripts/git-hooks/` into `.git/hooks/`.
- **Documentation**: `docs/0014-provider-portal.md` for provider portal; `docs/testing.md` for testing notes.

### Changed

- **Mark as paid**: `PUT /orders/{order_id}/mark-paid` now uses computed order status from items (all active items delivered) instead of stored `order.status`, so completed orders can be marked paid even when DB status was out of sync. Stored status is synced to `completed` before setting to `paid`. See `docs/0008-order-management-logic.md` edge case.
- **Order status dropdown**: `getOrderStatusTransitions` and `getItemStatusTransitions` normalize status with `(currentStatus ?? '').toString().toLowerCase()` so the transition map always matches; fixes pending orders not showing "Preparing" when status came in a different casing or type.
- **AGENTS.md**: Updates for provider tests and hooks as needed.

### Fixed

- **Nginx production**: `location ^~ /api/` so that `/api/uploads/.../image.jpg` is proxied to the backend instead of being handled by the static-asset regex (which was returning 404 for catalog images).
- **beer_import --clear**: Use `session.execute(text(...))` for raw SQL when checking tenant product references; `session.exec()` is for ORM only.

### Migration (existing DBs)

- **User.provider_id**: `ALTER TABLE "user" ADD COLUMN IF NOT EXISTS provider_id INTEGER REFERENCES provider(id);`
- **user_role enum**: For provider registration to work, add the new value:  
  `ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'provider';`  
  (PostgreSQL; without this, provider registration returns 500.)
- **Provider company fields**: For provider registration/company details to persist, add columns to `provider` (PostgreSQL):  
  `ALTER TABLE provider ADD COLUMN IF NOT EXISTS full_company_name VARCHAR; ALTER TABLE provider ADD COLUMN IF NOT EXISTS address VARCHAR; ALTER TABLE provider ADD COLUMN IF NOT EXISTS tax_number VARCHAR; ALTER TABLE provider ADD COLUMN IF NOT EXISTS phone VARCHAR; ALTER TABLE provider ADD COLUMN IF NOT EXISTS email VARCHAR; ALTER TABLE provider ADD COLUMN IF NOT EXISTS bank_iban VARCHAR; ALTER TABLE provider ADD COLUMN IF NOT EXISTS bank_bic VARCHAR; ALTER TABLE provider ADD COLUMN IF NOT EXISTS bank_name VARCHAR; ALTER TABLE provider ADD COLUMN IF NOT EXISTS bank_account_holder VARCHAR;`

## [1.0.3] - 2026-03-14

(No notable changes.)

## [1.0.2] - 2026-03-14

### Added

- **Landing page version bar**: Footer shows app version and commit hash (from environment). Puppeteer test `front/scripts/test-landing-version.mjs` and npm script `test:landing-version`.
- **Products/Catalog placeholders**: When a product has no image, Products list and Catalog show a clear image-icon placeholder instead of empty/broken area; same for image load errors in Products.
- **remove_extra_tenants seed**: `back/app/seeds/remove_extra_tenants.py` keeps only the tenant named "Cobalto" (or renames tenant id=1 to Cobalto) and deletes all other tenants and their data. Used to clean amvara9 to a single Cobalto restaurant.
- **set_user_password seed**: `back/app/seeds/set_user_password.py` sets a user's password from env (`NEW_PASSWORD`, optional `USER_EMAIL`). For server/admin use (e.g. match dev password).

### Changed

- **Landing version Puppeteer test**: Uses fallback selector `.landing-version-bar` and 15s timeout for lazy route.

## [1.0.1] - 2025-03-14

### Added

- **Public landing page (`/`)**: Tenant/restaurant list with "Book a table", "Login", and "Enter table code" for ordering. Logout redirects to `/`.
- **Booking page (`/book/:id`)**: Hero header matching menu (logo, restaurant name, description, phone, email). Language selector. Extended public tenant API with `description`, `phone`, `email` and `GET /public/tenants/:id`.
- **Reservation view (`/reservation?token=...`)**: Same hero header as book/menu with restaurant branding and language selector.
- **Language selector**: On landing, booking, and menu pages. Default language from browser; `LanguageService` initialized at app bootstrap.
- **Reservation number**: Unique reservation number (#id) shown to client on booking success and on reservation view page. i18n key `RESERVATIONS.RESERVATION_NUMBER` in all locales.

## [1.0.0] - 2025-03-14

### Added

- **AVIF image upload support**: Accept AVIF format for all photo/picture uploads.
  - **Settings (tenant logo)**: File input and backend accept `image/avif`; logo upload validates and optimizes AVIF (Pillow), keeps `.avif` extension.
  - **Product details**: Product image upload accepts `image/avif` in the file picker and API; backend `ALLOWED_IMAGE_TYPES` and `optimize_image()` handle AVIF; stored filenames may use `.avif`.
  - Backend: `ALLOWED_IMAGE_TYPES` includes `image/avif`; `optimize_image()` saves AVIF with `AVIF_QUALITY`; allowed extensions for logo and product image include `.avif`.
  - Frontend: `accept` attributes updated to `image/jpeg,image/png,image/webp,image/avif` for both settings and products.
- **Table reservations**
  - **Staff**: Reservations list (`/reservations`) with filters (date, phone, status); create, edit, cancel, seat at table, finish. Table column always visible (name or "—" when not assigned). Permissions `reservation:read` and `reservation:write` for owner, admin, waiter, receptionist. Tables canvas: status "Reserved" (amber) when a reservation is assigned.
  - **End users (public)**: Book at **`/book/:tenantId`** (date, time, party size, name, phone; no login). After booking, link to **`/reservation?token=...`** to view or cancel. See `docs/0011-table-reservation-user-guide.md` for URLs and flow.
  - **API**: `POST/GET/PUT /reservations`, seat/finish/cancel; public create (with `tenant_id`), `GET /reservation/by-token`, `PUT /reservation/{id}/cancel?token=...`. Reservation responses include **`table_name`** when assigned. Table status in `GET /tables/with-status`: `available` | `reserved` | `occupied`.
- **Order history (public menu)**: Backend `GET /menu/{table_token}/order-history`; frontend menu shows order history section and `getOrderHistory()`; `OrderHistoryItem` in API service.
- **WebSocket**: Token-based auth for WS (`/ws-token`, token in URL); ws-bridge Dockerfile and main.py updates; frontend `getWsToken()` and URL handling for relative/absolute WS URLs. Script `front/scripts/test-websocket.mjs` for owner login and WS connectivity check.
- **Documentation**
  - `docs/0011-table-reservation-user-guide.md`: End-user flow, URL reference (book, view/cancel), testing steps.
  - `docs/0010-table-reservation-implementation-plan.md`: Implementation plan (existing).
  - Documentation consolidated under `docs/`: CUSTOMER_FEATURES_PLAN, DEPLOYMENT, EMAIL_SENDING_OPTIONS, GMAIL_SETUP_INSTRUCTIONS, IMPLEMENTATION_VERIFICATION, ORDER_MANAGEMENT_LOGIC, TABLE_PIN_SECURITY, TRANSLATION_IMPLEMENTATION, VERIFICATION_ALTERNATIVES (moved from repo root).
  - README rewritten: POS2 branding, features table, built-with, getting started; references to `docs/` and ROADMAP. ROADMAP updated: completed/missing features and doc references.
- **Agent / ops**
  - AGENTS.md: Docker status, port detection, log commands, reservation Puppeteer tests, demo tables seed/test instructions.
  - Frontend debug script `scripts/debug-reservations.mjs` (Puppeteer: login, create reservation, cancel). `.env` for demo credentials (gitignored); `puppeteer-core` dev dependency.
  - Public user test `scripts/debug-reservations-public.mjs` (Puppeteer: open `/book/:tenantId` without login, fill form, submit, then view/cancel by token). npm script: `debug:reservations:public`.
  - WebSocket test script `scripts/test-websocket.mjs` (Puppeteer: login, check WS connection after navigating to /orders).
  - Frontend dev proxy config `proxy.conf.json` for local API/WS proxying.
- **Demo tables**: Seed script `back/app/seeds/seed_demo_tables.py` (floor "Main" + **T01–T10** for tenant 1; idempotent). Check script `back/app/seeds/check_demo_tables.py` to verify T01–T10 exist. **Deploy** (`scripts/deploy-amvara9.sh`) runs the seed after migrations so tenant 1 always has 10 demo tables on new deployment. See AGENTS.md.
- **Demo products**: Seed script `back/app/seeds/seed_demo_products.py` (default menu for tenant 1: main courses + beverages; idempotent, no images). Deploy runs it after demo tables so the Demo Restaurant has tables and products on new deployment.
- **Puppeteer test (demo data)**: `front/scripts/test-demo-data.mjs` checks ≥10 tables, ≥10 products, and public /book/:id; use `LOGIN_EMAIL`/`LOGIN_PASSWORD` for full check. Optional `BOOK_TENANT_ID` (default 1). `npm run test:demo-data` or `node front/scripts/test-demo-data.mjs`.
- **Seeds for all tenants**: `seed_demo_tables` and `seed_demo_products` now run for every tenant that has no tables/products (not only tenant 1), so e.g. ralf@roeber.de (tenant 2) gets demo data on deploy. Table seed sets `is_active=false` for prod NOT NULL.
- **Deploy guide**: `docs/0003-deploy-server.md` for deploying latest master to a server (e.g. amvara8 at `/development/pos2`).
- **Reservation tests (localhost + production)**: Script `scripts/run-reservation-tests.sh` runs public (and optional staff) Puppeteer reservation tests against configurable `BASE_URLS` (default: `http://127.0.0.1:4203` and `http://satisfecho.de`). See AGENTS.md.
- **CI/CD (amvara9)**: GitHub Actions workflow `.github/workflows/deploy-amvara9.yml` deploys to amvara9 on push to master/main (SSH key in repo secret `SSH_PRIVATE_KEY_AMVARA9`). Server setup: deploy key in `authorized_keys`, repo at `/development/pos2`, `config.env` from example. See `docs/0001-ci-cd-amvara9.md`.

### Fixed

- **Migration 20260313150000 (tenant timezone)**: Idempotent `ADD COLUMN IF NOT EXISTS` so re-run or pre-existing column does not fail.
- **Production nginx (satisfecho.de)**: Front container’s `nginx.conf` now strips the `/api` prefix when proxying to the backend (`location /api` → `proxy_pass http://pos-back:8020/`), so the backend receives `/reservations` etc. and public reservation booking works on production.
- Reservation create "failed to create": DB columns `reservation_date` and `reservation_time` were `timestamp`; migration updates them to `DATE` and `TIME`.
- Reservations route and sidebar: Staff route `/reservations` before public `/reservation`; permission-based `reservationAccessGuard`; frontend build (Router, `minDate()`, `LowerCasePipe`).
- Reservation API: invalid date/time return HTTP 400 with clear message; parsing validates length and format.
- Reservations list: Table column always shown; API returns `table_name`; frontend shows name or "—" (`RESERVATIONS.TABLE_NOT_ASSIGNED`).
- Puppeteer test: create/cancel uses DOM form values and date filter; cancel confirmation works.
- Admin layout: main content full width (removed `max-width` on `.main`).
- API service: resolved merge (OrderHistoryItem, WebSocket URL handling); reservation and public menu APIs.
