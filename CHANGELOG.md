# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [2.0.26] - 2026-03-22

### Changed

- **Docs**: `docs/testing.md` — reservation capacity tests: note they run under **`pytest /app/tests`**, add a **`-T`** `docker compose exec` example, and clarify why SQLite uses a minimal table set.

### Fixed

- **Comments**: `create_order` shared-order branch comment now mentions **cancelled** as well as paid when describing when a new order row is created.

## [2.0.25] - 2026-03-22

### Added

- **Backend test** `tests/test_public_menu_order_response.py`: Asserts the first **`POST /menu/{token}/order`** on a table returns **`status: "created"`** and a follow-up post returns **`"updated"`** with the same `order_id` (regression guard for shared-order `is_new_order`).

## [2.0.24] - 2026-03-22

### Fixed

- **Public menu `POST /menu/{token}/order`**: Removed a line that always forced `is_new_order = False`, so the first order on a table again returns **`status: "created"`** and publishes **`new_order`** to Redis (was incorrectly always **`updated`** / **`items_added`**).

### Changed

- **Backend**: Replaced `print` debug noise in `get_menu` and `create_order` with **`logger.debug`** (and **`logger.exception`** on menu query failure). Dropped a duplicated CORS comment line.

## [2.0.23] - 2026-03-22

### Changed

- **Backend**: Replaced deprecated FastAPI `@app.on_event("startup" | "shutdown")` with a single **`lifespan`** context manager (same DB init, migrations, and reservation reminder heartbeat). Removes `DeprecationWarning` noise during `pytest` and matches current FastAPI guidance.

## [2.0.22] - 2026-03-22

### Fixed

- **Public menu — customer cancel**: Clearing the table’s `active_order_id` when the shared order is cancelled so the next `POST /menu/{token}/order` creates a **new** order (matches “new order after cancel” behaviour and avoids reusing a cancelled row).
- **`GET /menu/{token}/order`**: Ignores **cancelled** shared orders the same way as **paid** ones so customers do not see a cancelled cart as current.

### Changed

- **Backend tests**: `RATE_LIMIT_ENABLED=false` for pytest / `PgClientTestCase` (`tests/conftest.py`, `tests/pg_client_mixin.py`) so SlowAPI does not break or flake on `TestClient` runs. Session-isolation test binds `Order.session_id` in the DB to assert PUT/DELETE session checks. Guest feedback, payment security, and public-tenant WhatsApp tests use the same Postgres rollback mixin instead of SQLite `create_all`.

## [2.0.21] - 2026-03-22

### Added

- **Backend dev/test deps**: `httpx` and `pytest` in `back/requirements.txt` so `TestClient` tests run inside the **back** Docker image after rebuild (`docker compose build back`).

### Changed

- **Docs**: `docs/testing.md` — run backend `pytest` in the **back** container (after `docker compose build back`).
- **`tests/test_users_me_anonymous.py`**: Uses `TestClient` only (no in-memory SQLite `create_all`; full schema uses Postgres-only types such as JSONB). Imports `app` from the package root so it runs both on the host (`back/`) and in Docker (`/app`).

## [2.0.20] - 2026-03-22

### Changed

- **API — `GET /users/me`**: Returns **200** with JSON **`null`** when there is no valid session (instead of **401**). Same as before when logged in (user JSON). Lets the SPA check auth without a failed-network / console noise for guests. **Breaking** for any client that relied on 401 to detect “not logged in”; use status **200** + null body instead.

### Added

- **Backend test**: `tests/test_users_me_anonymous.py` asserts anonymous `GET /users/me` → 200 + null (uses FastAPI `TestClient`; `httpx` is now in `requirements.txt`).

## [2.0.19] - 2026-03-22

### Fixed

- **Landing page**: Stopped calling `checkAuth()` a second time on load. `ApiService` already requests `/users/me` once at bootstrap; the landing component now waits for that to finish via `waitForInitialAuthCheck()`, then redirects or loads public tenants. Cuts duplicate requests and avoids an extra **401** in the network log for guests.

## [2.0.18] - 2026-03-22

### Fixed

- **Docker dev — version footer**: `docker-entrypoint.sh` runs `get-commit-hash.js` before `ng serve` so `commit-hash.ts` tracks **`package.json` version** on each container start. The script **keeps the previous short hash** when git is unavailable (e.g. only `./front` is bind-mounted), instead of overwriting with `git hash`.

## [2.0.17] - 2026-03-22

### Fixed

- **Angular NG0505 (hydration)**: Removed `provideClientHydration` from the **browser** `app.config.ts`. Shipped dev and prod builds use CSR only (`development-no-ssr`, `production-static`), so there was no serialized SSR payload and the client logged NG0505 on every load. SSR builds still get hydration via `app.config.server.ts`.
- **Dev landing version string**: Regenerated `commit-hash.ts` so `version` matches `package.json` (was `0.0.0`, which forced the stale `DEV_VERSION_FALLBACK`). Aligned `DEV_VERSION_FALLBACK` with the current package version for when the script has not run.

## [2.0.16] - 2026-03-22

### Fixed

- **Reports (NG0955)**: `@for` over “by product” now tracks **product id + name** (matches backend aggregation key), so duplicate `product_id` values no longer break change detection. Revenue chart Y-axis ticks track by **Y position** so max revenue **1¢** does not duplicate the `tick.value` key.

## [2.0.15] - 2026-03-22

### Added

- **Reports export (#35)**: CSV/Excel column and sheet titles follow the UI language. `GET /reports/export` accepts optional `lang` (e.g. en, es, de, ca, fr, zh-CN, hi). The app sends the current ngx-translate language when downloading exports.

### Changed

- **Reports & Products — locale for numbers (#41)**: Shared `intlLocaleFromTranslate` maps the UI language to a BCP 47 locale for `Intl` — currency and short dates on Reports match the selected language, and changing language refreshes formatted values. **Products**: tenant currency settings load before the product list (avoids a flash of the wrong symbol); price formatting uses the same locale mapping; when settings omit currency, the default prefix is **€** instead of **$**.

## [2.0.14] - 2026-03-22

### Fixed

- **Customers / orders (#30)**: English string **Print invoice** instead of “Print Factura” for `CUSTOMERS.PRINT_FACTURA`.
- **Catalog (#43, #42, #44)**: “Set your price” field uses a **currency prefix + input** row so the symbol no longer overlaps the amount; catalog card **image area** has padding and a neutral background; **Remove from menu** is an **outline** button so it reads clearly vs solid **Add to menu**.
- **Reports (#45)**: Data table cells use **vertical-align: middle**; **Share (%)** column cells get a **minimum height** so the last row aligns better with the bar + percentage.

## [2.0.13] - 2026-03-22

### Added

- **Guest feedback (issue #54 – MVP)**: Public page `/feedback/:tenantId` (optional `?token=` reservation magic link) for star rating, optional comment, and optional contact fields; thank-you step with button to the tenant’s **Google review URL** when configured. Staff list at `/guest-feedback` (same access as reservations). Settings: **Google review link** (`public_google_review_url`, http/https only). API: `POST /public/tenants/{id}/guest-feedback` (rate-limited per IP/hour, `RATE_LIMIT_GUEST_FEEDBACK_PER_HOUR`), `GET /tenant/guest-feedback`; public tenant payloads include `public_google_review_url`. Migration `20260322190000_guest_feedback_and_google_review_url.sql`. i18n: `FEEDBACK.*`, `NAV.GUEST_FEEDBACK`, `SETTINGS.PUBLIC_GOOGLE_REVIEW_*`, `RESERVATIONS.VIEW_FEEDBACK_PAGE` (en, de, es + en strings for fr, ca, hi, zh-CN). Reservation view links to the feedback form with token when present.

## [2.0.12] - 2026-03-22

### Fixed

- **Cancel reservation modal**: The footer no longer shows the left dismiss button—only **Yes, cancel reservation** remains (header × and clicking the backdrop still close without cancelling). Applies to staff reservations list and public reservation view. Other confirmation modals keep both footer buttons via `showSecondaryButton` (default `true`).

## [2.0.11] - 2026-03-22

### Fixed

- **Public booking – “View or cancel” link**: Reservations created via `/book/...` while a staff session cookie was present had no `token`, so the success-page link and token-based flow failed. Every new reservation now receives a magic-link token (staff-created bookings included).
- **Cancel reservation dialog**: Confirm and dismiss actions no longer both read as “Cancel” in English; primary action is **Yes, cancel reservation**, secondary is **Close** (staff list and public reservation view).

### Added

- **Contact on confirmation**: After a successful public booking, the success card shows the restaurant’s phone, WhatsApp, and email when configured.
- **Email validation**: `email-validator` on `POST /register`, `POST /register/provider`, admin `POST/PUT /users`, and reservation create/update when an email is provided; registration and booking forms use stricter client checks.
- **Phone validation**: `phonenumbers` (libphonenumber) on reservation create/update and optional provider registration phone; numbers stored in E.164 when valid.
- **12-month booking horizon**: Reservation date cannot be more than ~12 months ahead (366 days, tenant-local “today”) on create and staff update.
- **Delay notice**: `PUT /reservations/{id}/public` rate-limits non-empty delay updates per client IP per reservation (rolling 1h, Redis; configurable via `RATE_LIMIT_RESERVATION_DELAY_PER_HOUR`). UI `maxlength="500"` and API `max_length=500` on delay text.

## [2.0.10] - 2026-03-22

### Fixed

- **POST /register and POST /register/provider 500 (SlowAPI)**: With `headers_enabled`, SlowAPI’s sync wrapper injects rate-limit headers into a `Response` instance. Endpoints that returned a plain `dict` passed `None` there and raised, producing `500 Internal Server Error` on account creation. Both routes now return `JSONResponse` with `201 Created` (same approach as public menu and table mutations).

## [2.0.9] - 2026-03-22

### Added

- **Reservations – turn time and walk-in buffer**: Tenant settings `reservation_average_table_turn_minutes` (optional) and `reservation_walk_in_tables_reserved` (default 0). When turn is set, capacity treats each table as busy only for `[start, start + turn)` from the earliest of `reservation.seated_at` (set when staff seats), `order.created_at`, or `table.activated_at` / now for active sessions. When turn is unset, busy tables remain excluded for the full calendar day (tenant TZ) as before. Walk-in buffer removes the smallest tables (by `seat_count`, then `id`) from the reservation pool. Migration `20260322120000_reservation_turn_walk_in_seated_at.sql` (`reservation.seated_at`, tenant columns, backfill seated rows). Settings UI (en, es, de, ca, fr) and `docs/0025-reservation-overbooking-detection.md`. Unit tests: `back/tests/test_reservable_capacity_turn_walkin.py`.

### Changed

- **Reservations – opening hours and per-slot capacity**: `POST/PUT /reservations` reject times outside opening hours; slot capacity endpoints evaluate **per requested time** (not only once per day). Overbooking report top-level `total_seats` / `total_tables` are physical counts; each slot row uses reservable capacity for that time. Public book time dropdown respects opening hours. `GET /tables/with-status` and seating a reservation treat `is_active` and `partially_delivered` orders as occupied; seating is blocked if the table is still activated for ordering.

## [Unreleased]

### Changed

- **Docs**: `AGENTS.md` documents optional `ssh amvara9` access from the configured dev machine for production diagnostics; reservation-email troubleshooting doc updated accordingly.

### Added

- **Orders – unmark paid**: Staff can revert a paid order to unpaid. "Unmark paid" in the status popover clears the paid mark only; order status is restored from item statuses. Backend: `PUT /orders/{id}/unmark-paid`; permission `order:mark_paid`. i18n: `ORDERS.UNMARK_PAID` (en, es, ca, de, fr, zh-CN, hi).
- **Orders – soft-delete**: Orders can be marked as deleted (excluded from list and book-keeping) for test/cleanup. Backend: `Order.deleted_at`, `deleted_by_user_id`; migration `20260320100000_add_order_deleted_at.sql`; `DELETE /orders/{id}` (soft-delete, clears table active_order_id); permission `order:delete` (owner, admin); list, reports, and public order history exclude deleted orders. Frontend: "Delete order" button on order cards and in history grid (with confirmation); i18n: `ORDERS.DELETE_ORDER`, `DELETE_ORDER_CONFIRM`, etc.

### Changed

- **Orders – status popover**: Popover opens directly below the status button, has no animation, and uses a higher z-index so it appears above adjacent order cards.
- **Tables – canvas header**: `/tables/canvas` now shows the same header options as `/tables`: title "Tables", Floor Plan (active), List View link, Tiles/Table view links, Add Table button (focuses shape palette), and Save Layout when there are unsaved changes.

### Added

- **Orders – pre-pay (mark as paid before delivery)**: Staff can mark an order as paid on `/staff/orders` even when not all items are delivered (e.g. customer pays while kitchen is still preparing). Backend: `PUT /orders/{id}/mark-paid` no longer requires order status “completed”; it only rejects already-paid or cancelled orders. Frontend: “Mark as paid” appears in the order status dropdown for any non-paid, non-cancelled order (pending, preparing, ready, partially_delivered, completed).
- **Docs – printing when backend is outside restaurant WiFi**: `docs/PRINTING.md` describes the print-agent-on-LAN approach, options (WebSocket bridge, browser extension + native host, Node/Python agent), and references (WebApp Hardware Bridge, Ninja Printer, node-thermal-printer, etc.).

- **Tax system (IVA)**: Tax-inclusive pricing with per-line and per-rate totals on invoices. Backend: `Tax` model (name, rate_percent, valid_from, valid_to), tenant default tax, product-level tax override; order items store applied tax snapshot (tax_id, tax_rate_percent, tax_amount_cents). Spanish IVA: 10% (food/drinks immediate consumption), 21% (services), 0% (exempt). Settings: default tax dropdown, Taxes tab with CRUD; Products: tax override dropdown. Seed: `back/app/seeds/seed_spanish_taxes.py`. Migrations: `20260318100000_add_tax_system.sql`, product availability dates, provider tenant_id, `20260318130000_ensure_provider_tenant_id.sql` (idempotent repair).
- **Smoke test – sidebar navigation**: `test-settings-logo-upload.mjs` now visits every sidebar link after the logo flow and asserts no 5xx responses (catalog, tenant-products, tables, etc.).

### Fixed

- **Orders – history tab**: "Historial de Pedidos" now includes paid orders (`completedOrders` filter includes status `paid`) so paid invoices appear in the history list.
- **Kitchen/bar timer and frontend build**: Timer settings button and per-order “Waiting” timer now appear after fixing Angular template errors: use component methods instead of `Object.keys`/`Array.isArray` in templates (kitchen-display, orders, menu); optional chaining for `tenant()` in book and reservation-view. Added Puppeteer test `test-kitchen-timer.mjs` and npm script `test:kitchen-timer`.
- **Backend 500 (slowapi)**: Endpoints that return dict/list under global rate limiting now inject `response: Response` and/or return `JSONResponse` so slowapi can set rate-limit headers. Fixed for `/catalog`, `/catalog/categories`, `/catalog/{id}`, `/tenant-products`, `/tables/with-status`, tenant settings, tenant logo, and tax CRUD. **Public menu endpoints** now return `JSONResponse`: `GET /menu/{token}`, `GET /menu/{token}/order`, `GET /menu/{token}/order-history`, `POST /menu/{token}/order`, `POST /menu/{token}/order/{id}/request-payment`, `POST /menu/{token}/call-waiter`, `DELETE`/`PUT` order items, `DELETE` order (fixes 500 when opening table menu or requesting payment). Repair migration `20260318130000_ensure_provider_tenant_id.sql` ensures `provider.tenant_id` exists when schema version was applied without the column.

### Changed

- **Toasts – dismiss only on action**: Success and error toasts no longer auto-dismiss; they stay until the user closes them. Applies to Orders, Working plan, Tables, Provider dashboard, and Settings (Settings success/error toasts now have a dismiss button).
- **Orders – waiter alert shows customer message**: When a customer sends a message with “Call waiter” or “Request payment”, the staff alert banner now displays that message (in quotes) below the table name.
- **Docs – consolidation**: Removed `docs/0006-gmail-setup-instructions.md` (redundant with `docs/0018-gmail-setup.md`); all references (README, ROADMAP, config.env.example) now point to 0018. Merged `docs/0003-deploy-server.md` into `docs/0004-deployment.md`: single deployment guide with configuration (API_URL, WS_URL, CORS) and deploy steps (git pull, compose, migrations, seeds). Deleted 0003; docs index and CHANGELOG updated.

### Added

- **Rate limiting (extended)**: Public menu endpoints 30/min per IP; file uploads (tenant logo, product image, provider product image) 10/hour per user; admin/management endpoints (tenant settings, tables, providers) 30/min per user; per-order payment attempts 3/hour per IP. See `docs/0020-rate-limiting-production.md` and ROADMAP.md.

- **HAProxy SSL (amvara9) – durable certificate path**: SSL cert loaded from `./certbot/haproxy-certs` (same path used for certbot on amvara9). Compose mounts this dir into HAProxy; deploy creates `certbot/www` and `certbot/haproxy-certs` and does not overwrite certs. Workflow: `certbot certonly --webroot -w .../certbot/www`, then `cat fullchain+privkey > certbot/haproxy-certs/satisfecho.de.pem`, then `docker exec pos-haproxy kill -HUP 1`. See `certbot/README.md` and `docs/0026-haproxy-ssl-amvara9.md`.
- **Deploy**: Script run from server repo (not stdin); version inject via `front/scripts/inject-version-into-index.js`; force-remove front image before build; smoke test cache-bust and 5s delay; deploy step timeout 20 min.
- **Docs**: `docs/0026-haproxy-ssl-amvara9.md` (SSL durable setup and restore); `certbot/README.md`, `certs/README.md` (point to certbot path).

### Changed

- **HAProxy**: Bind 443 with `ssl crt /etc/haproxy/certs`; redirect HTTP to HTTPS except `/.well-known/acme-challenge`; removed `daemon` for Docker.
- **Working plan – Owner and Administrator as workers**: Owner and Administrator can be selected as the worker when adding/editing shifts. Backend: `create_shift`/`update_shift` accept `owner` and `admin`; frontend: `getUsersForSchedule()` includes owner/admin in dropdown.

### Fixed

- **Angular hydration (NG0505)**: Added `provideClientHydration(withEventReplay())` to the server app config (`app.config.server.ts`) so the server includes serialized hydration data in the response when using SSR. This removes the console warning "Angular hydration was requested on the client, but there was no serialized information present in the server response."
- **Deploy (amvara9) – front CSS / stale build**: Deploy script now builds the front image with `--no-cache` so each deploy serves assets from the current code (fixes wrong styling e.g. Settings > Opening hours). Nginx in the front container sends `Cache-Control: no-cache` for the HTML document so clients get new hashed asset URLs after deploy. See `docs/0024-deploy-css-fix-amvara9.md`.
- **Deploy (amvara9) – version not updating**: Fixed `docker compose build` flag order (`build --no-cache front`); added `up -d --force-recreate` so the front container is recreated with the new image; added a post-deploy step that prints the version served by the front container for verification.

## [2.0.8] - 2026-03-20

### Fixed

- **Public reservation – confirmation button**: Button on the confirmation page ("View or Cancel") now uses high-contrast styling (white background, dark text) so it remains readable when the tenant sets a blue or other colored public background.

## [2.0.7] - 2026-03-19

### Added

- **Tenant branding (public theme)**: Public background color (hex) and header background image for customer-facing pages. **Backend:** `Tenant.public_background_color`, `Tenant.header_background_filename`; migrations `20260319100000_add_tenant_public_background_color.sql`, `20260319110000_add_tenant_header_background.sql`; GET/POST/DELETE for header image (`/tenant/header-background`); public tenant and menu endpoints expose theme. **Frontend:** Settings > Business profile: color picker with RAL5002 (Azul) preset, header background upload and remove; book, menu, and reservation-view use tenant background color and header image (dark overlay when image set). i18n: `SETTINGS.PUBLIC_BACKGROUND_COLOR`, `HEADER_BACKGROUND`, etc. (en, es, ca, fr). See `docs/0028-tenant-public-branding.md`.
- **HAProxy self-signed certificate**: Base `docker-compose.yml` mounts `./haproxy/certs` (contains `default.pem`) so HAProxy can bind 443 without a real certificate. Fixes "unable to stat SSL certificate" when `certbot/haproxy-certs` is missing. Production override still uses `certbot/haproxy-certs`. See `haproxy/certs/README.md`.
- **Cursor rule – commit/changelog/version**: `.cursor/rules/commit-changelog-version.mdc` reminds to review CHANGELOG, README, and docs on "commit" and to bump version when changelog has substantial changes.
- **Smoke test – amvara9**: `front/scripts/test-amvara9-smoke.mjs` for amvara9 smoke runs.

## [2.0.6] - 2026-03-18

### Added

- **Cost price and profit**: Optional cost price per product for profit calculation. **Backend:** `cost_cents` on Product, TenantProduct, and OrderItem (snapshot when item is added); migration `20260318150000_add_product_cost_cents.sql`; product/tenant-product CRUD and order item creation accept and store cost; when adding from catalog, cost defaults from provider price; sales reports and CSV/Excel export include total cost, total profit, and per-product/category/table/waiter cost and profit. **Frontend:** Products form and table: cost price field and column; Reports: Total cost and Total profit summary cards, Cost and Profit columns in by-product/category/table/waiter when cost data exists; i18n for cost/profit labels (en, es, ca, de, fr, hi, zh-CN).

## [2.0.5] - 2026-03-18

### Fixed

- **Tables view – 500 when assigning waiter or activating table**: Rate-limited table endpoints (`PUT /tables/{id}/assign-waiter`, `POST /tables/{id}/activate`, `POST /tables/{id}/close`, `POST /tables/{id}/regenerate-pin`) now return `JSONResponse` so slowapi can inject rate-limit headers (fixes "parameter response must be an instance of starlette.responses.Response").

## [2.0.4] - 2026-03-18

### Fixed

- **Production build (TS2367)**: Cast `version` to `string` in `environment.ts` so the comparison with `'0.0.0'` is valid when the build injects the real version from package.json (fixes "This comparison appears to be unintentional because the types have no overlap" during `production-static` build).

## [2.0.3] - 2026-03-17

### Added

- **Reservations – overbooking detection and seating warnings (0025)**: Per-slot capacity checks and warnings. **Backend:** Capacity/demand helpers; `GET /reservations/overbooking-report` (per-slot metrics: over_seats, over_tables); `GET /reservations/slot-capacity` (seats/tables left for create/edit); `GET /reservations/upcoming-no-table-count` (for seat modal); create/update reservation returns 400 when slot would be over capacity; `GET /reservations/next-available` uses capacity (party_size param) instead of "first empty slot"; `GET /tables/with-status` includes `upcoming_reservation` per reserved table; reports payload adds `reservations.overbooking_slots_count`. **Frontend:** Reservations list shows "Overbooked" badge for over-capacity slots; create/edit shows seats left and tables left, keeps form open on 400; seat modal shows "You have N upcoming reservation(s) today with no table assigned" and per-table "Table X has an upcoming reservation at HH:MM (Name). Seat here anyway?"; reports show Overbooked slots card when count > 0. i18n: `RESERVATIONS.OVERBOOKED`, `SEATS_LEFT`, `TABLES_LEFT`, `UPCOMING_NO_TABLE`, `TABLE_UPCOMING`; `REPORTS.OVERBOOKING_SLOTS` (en, es). See `docs/0025-reservation-overbooking-detection.md`.

## [2.0.2] - 2026-03-17

### Added

- **Dashboard – Working plan card**: Quick-action card for Working plan (shift schedule) on the dashboard, with title and description from i18n.
- **Reports – revenue graph over time**: On `/reports`, a **Revenue over time** chart shows daily revenue as an SVG line chart with gradient area fill. Uses existing `summary.daily` data; Y-axis shows formatted currency (max, mid, zero), X-axis shows first/middle/last date. i18n: `REPORTS.REVENUE_OVER_TIME` (en, de, es, fr, ca, zh-CN, hi).
- **Tables – reassign orders and reservations when deleting**: Deleting a table that has orders no longer only blocks with an error. The UI offers to **reassign** its orders and reservations to another table, then delete. List and canvas table views: when delete returns 400 ("has orders"), a modal opens to choose the target table and confirm **Reassign and delete**. i18n: `TABLES.REASSIGN_AND_DELETE_TITLE`, `REASSIGN_AND_DELETE_MESSAGE`, `REASSIGN_TO_TABLE`, `REASSIGN_AND_DELETE`, `VIEW_TILES`, `VIEW_TABLE` (en, de, es, fr, ca, zh-CN, hi).
- **Tables – view mode persisted**: Tiles/table view preference is stored in `localStorage` and restored on load; view toggle buttons have icons and titles.
- **Tables – inline edit**: Table list inline edit supports floor dropdown and seat count in separate cells; layout adjusted for clarity.
- **App – dev favicon**: In development, the app uses a white favicon (`favicon-dev.svg`) to distinguish from production.
- **Working plan and opening hours – i18n (all locales)**: `WORKING_PLAN` section and `SETTINGS.PERSONNEL_PER_SHIFT`, `STAFF_*` added in ca, es, fr, hi, zh-CN; `NAV.WORKING_PLAN`, `DASHBOARD.WORKING_PLAN_TITLE` / `WORKING_PLAN_DESC` where missing.
- **.env.example**: Comments for test credentials (`LOGIN_EMAIL`, `LOGIN_PASSWORD`, `TENANT_ID`) for Puppeteer and other scripts.
- **Docs**: `docs/0022-oauth-social-login-notes.md` (OAuth/social login design notes).
- **Puppeteer**: `front/scripts/test-settings-logo-upload.mjs` for settings logo upload; `test-tables-page.mjs` improvements.

## [2.0.1] - 2026-03-17

### Added

- **Working plan (shift schedule) – full feature (0021)**: Shift CRUD with opening-hours alignment, personnel-per-shift in Settings (bar, waiter, kitchen, receptionist), owner notification (* in sidebar when staff update the plan), time step (30 min / 1 h), and "use any hour" option for cleaning. Schedule access for owner, admin, kitchen, bartender, waiter, receptionist. Backend: `Shift` model, GET/POST/PUT/DELETE `/schedule`, GET `/schedule/notification`; tenant fields `working_plan_updated_at` / `working_plan_owner_seen_at`. Frontend: `/working-plan` week view, add/edit/delete modal. See `docs/0021-working-plan.md`.
- **Working plan – suggested date**: When adding a shift, the form suggests the next open day with a free slot for the current user's role; closed days (e.g. Monday) are skipped. Owner/admin see the first day with any role gap; fallback is the first open day of the week. Current user is pre-selected when in the schedule list.
- **Working plan – toast notifications**: Success toasts on create ("Shift saved."), update ("Shift updated."), delete ("Shift removed."); error toasts with API message (e.g. role restriction). i18n: `WORKING_PLAN.SAVED`, `UPDATED`, `SAVE_FAILED`, `DELETED`, `DELETE_FAILED` (en, de).
- **AGENTS.md – compilation errors rule**: MUST ALWAYS DO rule: when working on the frontend, always check `docker compose logs --tail=80 front` for TypeScript/Angular build errors before concluding a change is done.

### Changed

- **Working plan – owner seen**: The asterisk (*) next to "Working plan" in the sidebar is cleared when the owner visits the page; backend now commits the "seen" timestamp after `_mark_working_plan_seen_by_owner` in GET `/schedule`.
- **Backend – shift assignment**: Receptionist can be assigned to shifts; `create_shift` allows kitchen, bartender, waiter, and receptionist (error message updated).
- **Docs**: `docs/0021-working-plan.md` added (implementation plan and status); `docs/0023-prioritisation-019-022.md` marks 0021 as Done; `docs/testing.md` Working plan test described as schedule roles (owner, admin, kitchen, bartender, waiter, receptionist).

### Fixed

- **Working plan – confirmation modal**: Fixed NG8002 (removed invalid `[open]` and other bindings on `app-confirmation-modal`; use conditional render and correct inputs).
- **Settings – setStaffRequired**: Method accepts `string` for role key to fix template type error; cast internally.
- **Working plan – DayHours**: Interface moved above `@Component` so the class is correctly decorated (fixes "Decorators are not valid here" build error).
- **Working plan – getApiErrorMessage**: Centralised API error extraction (string or validation array) for toast and form error.

## [1.0.15] - 2025-03-16

### Added

- **Testing docs – known issues and follow-up**: `docs/testing.md` now has a **Known issues and follow-up (to address later)** section: test-provider-register (unknown state), debug-reservations-public (422/time validation), login tests hitting 429 when run in quick succession, and no test data cleanup for provider/restaurant registration. Coverage summary table includes Kitchen display; cross-reference §5 → §4 fixed.

- **Rate limiting**: API rate limits per the security roadmap: global 100 req/min per IP; login `POST /token` 5 per 15 minutes; register `POST /register` and `POST /register/provider` 3 per hour; payment endpoints 10/min. Uses slowapi + Redis (in-memory fallback when Redis is down). Client IP from `X-Forwarded-For` when behind proxy. Each 429 is logged (path, method, client). Login page shows "Too many login attempts. Please try again later." on 429. Env: `RATE_LIMIT_ENABLED`, `RATE_LIMIT_REDIS_URL`, `RATE_LIMIT_*` (see `docs/0020-rate-limiting-production.md`). Tests: `test:rate-limit` (API, 429 after limit), `test:rate-limit-puppeteer` (Puppeteer, login 6 wrong attempts → error banner).
- **Reservations – no-show feature (standing out)**: Because “they didn’t show” deserved its own status. Staff can **mark as no-show** (with confirmation), freeing the table and recording the outcome instead of pretending it was a cancellation. Filter and badge for no-shows; optional **Send reminder** for booked reservations with an email (SMTP required). Backend: `ReservationStatus.no_show`, status handler clears `table_id`; `POST /reservations/{id}/send-reminder`; `send_reservation_reminder` in email service. i18n: STATUS_NO_SHOW, NO_SHOW, SEND_REMINDER, etc. (en, de, es, fr, ca, zh-CN, hi). The one feature that admits your guests are human.
- **No-show – implementation plan**: `docs/0019-no-show-implementation-plan.md` documents goals, what was implemented, step-by-step implementation plan (backend model/API/email, frontend, i18n), optional extensions (reports, view link in reminder, scheduled reminders), and a checklist. README Documentation table updated with link to the new doc.
- **Reports – reservations by status**: Sales report now includes reservation counts by status (booked, seated, finished, cancelled, no_show). Backend: `reservations_summary.by_status` in `_build_report_payload`; Excel export Reservations sheet includes Status/Count rows. Frontend: Reports page shows “Reservations – By status” block with translated labels; `SalesReport.reservations.by_status` and `getReservationStatusLabel()`. i18n: `REPORTS.RESERVATIONS_BY_STATUS` (en, de, es, fr, ca, zh-CN, hi).
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

- **ROADMAP and README – customer accounts**: Customer accounts (end-customer registration, login, email verification, MFA, order history, customer-facing invoices) are now listed under **Completed** in [ROADMAP.md](ROADMAP.md). README planned list and Roadmap section no longer list them as planned; docs table entry for `docs/0002-customer-features-plan.md` describes the implemented scope.
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
- **Deploy guide**: `docs/0004-deployment.md` for configuration and deploying latest master to a server (e.g. amvara8 at `/development/pos`).
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
