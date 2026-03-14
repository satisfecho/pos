# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

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
