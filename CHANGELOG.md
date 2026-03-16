# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

### Added

- **Products page – search**: On `/products`, a search input above the category filters lets you filter the product list by name, ingredients, description, category, or subcategory (case-insensitive, live as you type). Works together with the existing category/subcategory ribbons. i18n: `PRODUCTS.SEARCH_PLACEHOLDER` (en, de, es, fr, ca, zh-CN, hi).
- **Per-tenant SMTP / email settings**: Restaurant owners can configure their own SMTP (host, port, TLS, user, password, from address/name) in **Settings → Email (SMTP)**. If left empty, the app uses the global SMTP from `config.env`. Backend: new optional fields on `Tenant` and `TenantUpdate`; GET/PUT `/tenant/settings` read and update them (password masked in responses). Email service uses tenant config when both `smtp_user` and `smtp_password` are set, otherwise falls back to global. Migration `20260316150000_add_tenant_smtp_email.sql`. i18n: `SETTINGS.EMAIL_SETTINGS`, `SMTP_*`, `EMAIL_FROM*` (en).
- **Gmail setup guide**: `docs/0018-gmail-setup.md` – step-by-step: create Gmail account, enable 2FA, create App Password at myaccount.google.com/apppasswords, then enter Gmail and password in **POS → Settings → Email (SMTP)**.
- **SMTP debug script**: `back/scripts/debug_smtp.py` – minimal script that parses `config.env` (handles passwords with apostrophes when wrapped in double quotes), tests SMTP connection, and optionally sends a test email. Run: `PYTHONPATH=back python back/scripts/debug_smtp.py [to_email]` from repo root, or pipe `config.env` into the back container.
- **Products – category labels from i18n**: On `/products`, the main category names (Starters, Main Course, Desserts, Beverages, Sides) are now translated. Added `PRODUCTS.CATEGORY_STARTERS`, `CATEGORY_MAIN_COURSE`, `CATEGORY_DESSERTS`, `CATEGORY_BEVERAGES`, `CATEGORY_SIDES` in en, de, es, ca, fr, zh-CN, hi. Category filter pills, dropdowns, table column, and Categories tab use the translated labels; stored values remain in English.
- **Supply chain hardening (npm)**: Pinned all dependency versions in `front/package.json` and the lockfile root to exact versions (no `^`/`~`). Added `front/.npmrc` with `save-exact=true` and `ignore-scripts=true` so new deps are pinned and install lifecycle scripts never run. Dockerfiles (`front/Dockerfile`, `front/Dockerfile.prod`) now copy `.npmrc` and use `npm ci --ignore-scripts`.
- **French (Français) locale**: New language for Morocco and Francophone users. Added `fr` to supported languages (label "Français", locale fr-FR) and full translation file `front/public/i18n/fr.json`. Language picker and app UI available in French.
- **Translations**: Review of remaining locales (de, es, ca, hi, zh-CN): removed English-only strings (e.g. Dashboard → Übersicht, Website → Webseite in German; Balance → Saldo, Stock → Existencias in Spanish), added missing keys (COMMON, MENU, ORDERS, REPORTS, RESERVATIONS, KITCHEN_DISPLAY, SETTINGS where needed), and localized placeholders (e.g. yourbusiness → example/udaharan where appropriate).
- **Invoice – open source footer**: Printed invoices (Print invoice / Print Factura) now show a small grey line at the bottom: "Open source · Made with ♥ in Barcelona and Mexico", GitHub repo URL (plain text for print), app version, and commit hash. A separator line above this block matches the total-row line; spacing is symmetric. Styled in 9px grey. i18n: `ORDERS.INVOICE_FOOTER`, `ORDERS.INVOICE_OSS_PREFIX` (en, es, ca, de, hi, zh-CN).
- **Tables – confirm before closing** ([#18](https://github.com/satisfecho/pos/issues/18)): Clicking "Close Table" now opens a confirmation modal ("Close table \"…\"? This will end the current session.") with Confirm and Cancel. On confirm, the table is closed and a success snackbar ("Table closed.") is shown. i18n: `TABLES.CLOSE_TABLE_CONFIRM`, `TABLES.TABLE_CLOSED` (en, de, es, fr, ca, zh-CN, hi).
- **Login and register – language selector** ([#16](https://github.com/satisfecho/pos/issues/16)): The login and create-account (register) pages now include the same language dropdown as the rest of the app, in the top-right of the auth card header, so users can switch language before signing in or creating an account.
- **Password confirmation and show/hide** ([#17](https://github.com/satisfecho/pos/issues/17)): Registration (tenant and provider) and user create/edit now have a "Confirm password" field; both fields must match before submit. All password inputs (login, register, provider login/register, Users modal) have an eye icon to toggle visibility. i18n: `AUTH.CONFIRM_PASSWORD`, `AUTH.PASSWORDS_DO_NOT_MATCH`, `AUTH.SHOW_PASSWORD`, `AUTH.HIDE_PASSWORD`; `USERS.CONFIRM_PASSWORD`, `USERS.PASSWORDS_DO_NOT_MATCH`, `USERS.SHOW_PASSWORD`, `USERS.HIDE_PASSWORD` (en, de, es, ca, fr, zh-CN, hi).
- **Reservations – email field**: The table reservation (book a table) page and staff reservations now include an optional **Email** field. Public booking form, success confirmation, and view-by-token page show it when provided; staff list and create/edit modal display and persist it. Backend: `customer_email` on `Reservation`, `ReservationCreate`, `ReservationUpdate`; migration `20260316160000_add_reservation_customer_email.sql`. i18n: `RESERVATIONS.CUSTOMER_EMAIL` (en, de, es, ca, fr, zh-CN, hi).
- **Opening hours – copy to other days and summary**: In **Settings → Opening hours**, a "Copy from [day]" dropdown and **Copy to other days** button copy one day’s hours to all others. A formatted summary (e.g. "Mon–Fri 09:00–22:00, Sat 10:00–20:00, Sun closed") is shown above the grid. Public tenant API now returns `opening_hours` so the book page can display them. i18n: `SETTINGS.COPY_FROM_DAY`, `SETTINGS.COPY_TO_OTHER_DAYS`, `BOOK.OPENING_HOURS` (en, de, es, ca, fr, zh-CN, hi).

### Changed

- **Opening hours summary – localized**: The opening hours summary in **Settings → Opening hours** and the opening hours text on the public book page now use the current UI language: short day names (e.g. Lun, Mar, Mié in Spanish; Mon, Tue, Wed in English) via `Intl.DateTimeFormat`, and the word "closed" from `SETTINGS.CLOSED` (e.g. Cerrado, Closed, Geschlossen).
- **Opening hours and reservation time – 15-minute steps, 24h format**: Settings opening hours and the book (reservation) page now use time selectors with minutes **0, 15, 30, 45** only, in European 24h format (e.g. 20:00). Settings: time inputs replaced by dropdowns; existing values are rounded to the nearest quarter hour. Book page: time is a dropdown, default **20:00**; opening hours are shown in the hero when set. Next-available reservation slot API returns 15-minute slots.
- **Kitchen display**: On `/kitchen`, only orders that have at least one item in **pending** or **preparing** are shown; within each order only those items are listed (ready/delivered/cancelled lines are hidden). Status badge and dropdown buttons use the same size as on the Orders page (min-height 44px / 48px) for thumb-friendly tapping.
- **Documentation**: Merged `GEMINI.md` into `AGENTS.md`. Agent instructions now include project overview, architecture, setup & development (quick start, manual commands), development conventions, and key URLs in a single file.

### Fixed

- **Logout – single click and land on login view** ([#19](https://github.com/satisfecho/pos/issues/19)): Clicking "Close session" (logout) now logs out and navigates to the landing/login view in one click. Previously the app cleared auth state only after the logout request completed, while navigation ran immediately, so the landing page still saw a valid session and redirected back to the dashboard; a second click was needed. Now local state is cleared immediately and navigation runs after the server has processed logout. Same behaviour for provider dashboard logout.
- **Products – waiter cannot add/edit** ([#20](https://github.com/satisfecho/pos/issues/20)): Users without `product:write` (e.g. waiter) no longer see the "Add product" button. When they open a product (Edit), the form is read-only with the message "Only owners can edit products."; all inputs and the Save button are disabled, image upload is hidden, and Delete is not shown. Inline category/subcategory editing is disabled for non-editors. i18n: `PRODUCTS.ONLY_OWNERS_CAN_EDIT` (en, de, es, fr, ca, zh-CN, hi).
- **Products form – validation feedback** ([#15](https://github.com/satisfecho/pos/issues/15)): When adding or editing a product, submitting without a name or without a valid price now shows clear feedback: required fields are marked with an asterisk, a banner message asks to fill name and price, and inline errors appear under the name and price fields. Errors clear when the user corrects each field. i18n: `PRODUCTS.FILL_REQUIRED_FIELDS`, `PRODUCTS.NAME_REQUIRED`, `PRODUCTS.PRICE_REQUIRED` (en, de, es, fr, ca, zh-CN, hi).
- **Backend – config.env loading on reload**: Settings now load env files only from absolute paths under the project root, and only include paths that exist. This prevents `FileNotFoundError: config.env` when the backend reloads (e.g. after file changes) and the subprocess has a different working directory.

### Removed

- **GEMINI.md**: Removed; content merged into `AGENTS.md`.

## [1.0.14] - 2026-03-16

### Added

- **Billing customers (Factura)**: Register customers that require a tax invoice (Factura) with company details. New **Customers** section at `/customers`: add, edit, search by name, company, tax ID, or email. From **Orders** (active, not paid, or history): **Print Factura** opens a modal to select a billing customer; the printed invoice includes a "Bill to" block with company name, tax ID, address, and email. Optionally save the selected customer on the order for future reference. Backend: `BillingCustomer` model, `GET/POST/PUT/DELETE /billing-customers` with search, `PUT /orders/:id/billing-customer`; migration `20260316140000_add_billing_customer.sql`. Permissions: `billing_customer:read` / `billing_customer:write`. i18n: `CUSTOMERS.*`, `NAV.CUSTOMERS` (en, es, ca, de, zh-CN, hi). See `docs/0017-billing-customers-factura.md`.

### Changed

- **Sidebar and dashboard order**: Most-used options first: **Orders**, **Reservations**, **Tables**, **Kitchen display**, **Beverages display** (bar view, same route as kitchen), then Customers, Products, Catalog, Reports, etc. Dashboard quick-action cards follow the same order.
- **Dashboard Help section**: Friendlier, inviting copy (“Need help?”, “We’re here for you…”) and new line encouraging users to start a discussion for enhancements or open an issue. Light gradient background and clearer call-to-action. i18n: `DASHBOARD.HELP_TITLE`, `HELP_DESC`, `HELP_INVITE` (en, es, ca, de, zh-CN, hi).
- **Kitchen display – clickable item status**: On `/kitchen`, the item status badge (e.g. "Preparando") is now clickable for users with `order:item_status`. Clicking it opens the same status dropdown as on the Orders page (Move forward / Go back), so kitchen staff can advance items to "Ready" (Listo) or move them back without leaving the kitchen view. Uses the same transition logic and API as the Orders page.

## [1.0.13] - 2026-03-16

### Added

- **Settings – Tax ID and CIF**: In Settings → Contact, tenants can set **Tax ID / VAT** and **CIF / NIF** (e.g. for Spanish CIF). Values are stored in the database (migration `20260316120000_add_tenant_tax_id_cif.sql`) and included on printed invoices.
- **Orders – Print invoice**: Each order card on `/orders` has a **Print invoice** button. Clicking it opens a new window with a print-optimized invoice (business name, logo, address, Tax ID, CIF, order number, date, table, customer, line items, total) and triggers the browser print dialog so staff can print or save as PDF for customer handover. i18n: `ORDERS.PRINT_INVOICE`, `ORDERS.INVOICE`, `ORDERS.INVOICE_FOOTER` (en, es).

## [1.0.12] - 2026-03-15

### Added

- **Demo orders on virgin deploy**: Bootstrap now runs `seed_demo_orders` so tenant 1 gets paid and active orders (spread over ±90 days, biased to last 30). Reports (Informes) show meaningful revenue, by product, by table, etc. without manual seeding. New seed `back/app/seeds/seed_demo_orders.py` (idempotent: runs only when tenant 1 has no orders). `back/run_seeds.sh` supports `--demo-orders` to run the seed manually.

## [1.0.11] - 2026-03-15

### Added

- **Bartender role**: New user role for staff who prepare drinks and beverages. Same permissions as kitchen (order:read, order:item_status, product/catalog read); can access Orders and Kitchen display. Backend: `UserRole.bartender` in `models.py`, permissions in `permissions.py`; migration `20260315130000_add_bartender_role.sql` adds enum value. Frontend: role in Users (create/edit), i18n in all locales. Puppeteer test: `test:bartender-role` (admin/owner → Users → Add user → role dropdown includes Bartender). See `docs/testing.md` §12.

### Fixed

- **Product images on /products**: Demo products (from `seed_demo_products`) had no images. New seed `link_demo_products_to_catalog` runs after catalog imports (beer, pizza, wine) and links tenant products without images to provider products that have images. `GET /products` then backfills `Product.image_filename` from the catalog when staff load the Products page. Deploy script runs the seed automatically; on existing installs run `docker compose exec back python -m app.seeds.link_demo_products_to_catalog` then reload `/products`. See `back/app/seeds/link_demo_products_to_catalog.py`.

## [1.0.10] - 2026-03-15

### Added

- **Reports – average payment per client**: New KPI in the Reports (Informes) summary: average revenue per order (total revenue ÷ number of orders), shown as "Average payment per client" in a summary card. Backend: `average_revenue_per_order_cents` in `GET /reports/sales` summary. i18n for all locales (en, es, de, ca, hi, zh-CN).

## [1.0.9] - 2026-03-15

### Added

- **Reports – reservation stats**: Reports page now shows total reservations in the date range and breakdown by source (Public book page vs Staff). Source is inferred from reservation token (token set = public, no token = staff). Summary card and "By source" block; Excel export includes a Reservations sheet.
- **Dashboard sections** (`/dashboard`): Quick-action cards for Catalog, Reservations, Kitchen display, Reports, Inventory, Users, and Configuration. Reports, Inventory, Users, and Configuration are shown only to owner/admin; Catalog, Reservations, and Kitchen display are shown to all authenticated staff with route access.
- **Dashboard Help section**: Links to [GitHub Issues](https://github.com/satisfecho/pos/issues) and [GitHub Discussions](https://github.com/satisfecho/pos/discussions) for documentation and support. i18n for all new dashboard labels (en, es, de, ca, hi, zh-CN).

### Changed

- **Reports payload**: API `GET /reports/sales` and export now include `reservations: { total, by_source: [{ source, count }] }`. Reports empty state refined so summary and reservation stats are always visible; sales sections only when there are orders.

## [1.0.8] - 2026-03-15

### Added

- **Reports (Sales & Revenue)** (`/reports`): New section for restaurant owners and admins. Sales by date range (from/to), summary (total revenue, order count, daily series), by product, by category, by table, and by waiter. Simple CSS bar charts; export to CSV or Excel (full workbook). Uses existing order and product data (paid/completed orders only). Permission `report:read` for owner and admin. Backend: `GET /reports/sales`, `GET /reports/export`; dependency `openpyxl` for Excel. See [docs/0016-reports.md](docs/0016-reports.md).
- **Smoke tests required (AGENTS.md)**: New section stating that smoke tests are **required** after every new feature, fix, or code change; minimum (curl or landing test) and flow-specific tests (e.g. `npm run test:reports`).
- **Puppeteer test**: `test:reports` — login as owner/admin, open `/reports`, assert page and date range load. Script `front/scripts/test-reports.mjs`; npm script `test:reports`. Documented in `docs/testing.md`.

### Changed

- **Sidebar**: Reports link (chart icon) for users with report access (owner/admin).

## [1.0.7] - 2026-03-15

### Added

- **Migration `20260314000000_add_user_provider_id.sql`**: Adds `user.provider_id` and `user_role` value `'provider'` (required for provider portal login/register). Tracked in repo for deploy consistency.
- **CI/CD amvara9 doc**: Sections on login/register 500 (migrations to run), demo login (ralf@roeber.de) and how to restore it, and that deploy does not run `remove_extra_tenants`.

### Changed

- **remove_extra_tenants seed**: Docstring WARNING that it deletes all users of removed tenants (e.g. demo account); not run by deploy; how to restore demo login or use set_user_password.
- **deploy-amvara9.sh**: Comment clarifying the script does not run `remove_extra_tenants` and that that seed deletes other tenants and their users.

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
- **Deploy guide**: `docs/0003-deploy-server.md` for deploying latest master to a server (e.g. amvara8 at `/development/pos`).
- **Reservation tests (localhost + production)**: Script `scripts/run-reservation-tests.sh` runs public (and optional staff) Puppeteer reservation tests against configurable `BASE_URLS` (default: `http://127.0.0.1:4203` and `http://satisfecho.de`). See AGENTS.md.
- **CI/CD (amvara9)**: GitHub Actions workflow `.github/workflows/deploy-amvara9.yml` deploys to amvara9 on push to master/main (SSH key in repo secret `SSH_PRIVATE_KEY_AMVARA9`). Server setup: deploy key in `authorized_keys`, repo at `/development/pos`, `config.env` from example. See `docs/0001-ci-cd-amvara9.md`.

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
