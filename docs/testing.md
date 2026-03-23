# Testing (Puppeteer UI tests)

This document describes the UI test suite maintained for the POS project. All UI tests use **Puppeteer** (Chrome/Chromium) and live under `front/scripts/`. Run them when the app is up (e.g. via Docker).

## Prerequisites

- **Chrome** installed (e.g. `/Applications/Google Chrome.app` on macOS).
- **App built and running** (e.g. `docker compose up`; frontend must serve successfully — see `AGENTS.md` for port and logs). If the frontend build fails (e.g. TypeScript errors), UI tests will get 503 or timeouts.
- Optional: `.env` in repo root with `DEMO_LOGIN_EMAIL`, `DEMO_LOGIN_PASSWORD` for tests that need login.

Tests auto-detect the first responding port among **4203, 4202, 4200** when `BASE_URL` is not set. For production (e.g. satisfecho.de), set `BASE_URL` explicitly.

## Environment variables (common)

| Variable | Description |
|----------|-------------|
| `BASE_URL` | App base URL (e.g. `http://127.0.0.1:4203`, `http://satisfecho.de`). Default: auto-detect localhost port or fallback. |
| `HEADLESS` | Default **headless**. Set `0`, `false`, or `no` for a visible Chrome window. |
| `PUPPETEER_EXECUTABLE_PATH` | Path to Chrome binary; default macOS: `/Applications/Google Chrome.app/Contents/MacOS/Google Chrome`. |
| `LOGIN_EMAIL` / `LOGIN_PASSWORD` | Staff/demo user for login-required tests. Often loaded from `.env` as `DEMO_LOGIN_EMAIL` / `DEMO_LOGIN_PASSWORD`. |

All commands below are from **repo root** unless noted.

## Backend (reservation capacity)

Turn time and walk-in buffer logic is in `tests/test_reservable_capacity_turn_walkin.py`. It uses **in-memory SQLite** with a **minimal** table subset (a full schema uses Postgres-only types such as JSONB). These tests are **included** when you run `pytest /app/tests` in the back container.

```bash
# Pytest (recommended; same pattern as the rest of backend tests):
docker compose -f docker-compose.yml -f docker-compose.dev.yml exec -T back python3 -m pytest /app/tests/test_reservable_capacity_turn_walkin.py -q

# Or run the file directly (no pytest):
docker compose -f docker-compose.yml -f docker-compose.dev.yml exec -T back sh -c 'cd /app && PYTHONPATH=. python3 tests/test_reservable_capacity_turn_walkin.py'
# On host: PYTHONPATH=back python3 back/tests/test_reservable_capacity_turn_walkin.py
```

### Pytest + FastAPI `TestClient` (e.g. auth)

`back/requirements.txt` includes **httpx** (required by Starlette/FastAPI `TestClient`) and **pytest**. After changing Python dependencies, rebuild the back image:

`docker compose -f docker-compose.yml -f docker-compose.dev.yml build back`

```bash
# One file (anonymous GET /users/me → 200 + null):
docker compose -f docker-compose.yml -f docker-compose.dev.yml exec -T back python3 -m pytest /app/tests/test_users_me_anonymous.py -q

# Full suite under tests/ (adjust if some tests need extra env):
docker compose -f docker-compose.yml -f docker-compose.dev.yml exec -T back python3 -m pytest /app/tests -q --tb=short
```

Pytest sets **`RATE_LIMIT_ENABLED=false`** via `back/tests/conftest.py` (and `pg_client_mixin.py` for direct test runs) so rate limiting does not interfere with `TestClient`.

**Docker dev — landing footer:** optional host **`COMMIT_HASH`** ( **`./run.sh`** exports it from **`git rev-parse --short HEAD`** when unset before **`docker compose up`**) keeps the footer git short hash aligned with the repo; see **README** / **AGENTS.md**.

`tests/test_public_menu_order_response.py` checks that the first public menu order response is **`created`** and the next is **`updated`** (same `order_id`).

`tests/test_settings_defaults.py` asserts the **`EMAIL_FROM`** settings default is **`noreply@satisfecho.de`** (not **`example.com`**).

**Note:** `GET /users/me` returns **200** with JSON **`null`** when there is no session (not **401**), so the SPA auth probe does not show as a failed request for guests.

---

## Test scripts

### 1. Reservations (public + staff)

**Public flow** (no login: book page → submit → view/cancel by token):

```bash
node front/scripts/debug-reservations-public.mjs
# Optional: BASE_URL=http://127.0.0.1:4203 TENANT_ID=1 HEADLESS=1
```

**Staff flow** (login → reservations → create → cancel):

```bash
source .env   # optional
export LOGIN_EMAIL="${DEMO_LOGIN_EMAIL:-$LOGIN_EMAIL}"
export LOGIN_PASSWORD="${DEMO_LOGIN_PASSWORD:-$LOGIN_PASSWORD}"
node front/scripts/debug-reservations.mjs
```

**Run both public (and optionally staff) on multiple URLs** (e.g. localhost + production):

```bash
./scripts/run-reservation-tests.sh
# With staff test: STAFF_TEST=1 ./scripts/run-reservation-tests.sh
# Headless: HEADLESS=1 ./scripts/run-reservation-tests.sh
# Custom URLs: BASE_URLS="http://127.0.0.1:4203 http://satisfecho.de" ./scripts/run-reservation-tests.sh
```

| Script | Purpose |
|--------|---------|
| `front/scripts/debug-reservations-public.mjs` | Public booking flow; no credentials. |
| `front/scripts/debug-reservations.mjs` | Staff reservations flow; needs `LOGIN_EMAIL` / `LOGIN_PASSWORD`. |
| `front/scripts/test-reservation-create.mjs` | Create one public reservation **with email** (for deploy/amvara9). Use after deploy to trigger confirmation email; check backend logs for "Reservation confirmation email sent" or "skipped". |
| `scripts/run-reservation-tests.sh` | Runs public (and optionally staff) reservation tests on each URL in `BASE_URLS`. |

**Create test reservation (e.g. after deploy to amvara9):**

```bash
node front/scripts/test-reservation-create.mjs
# amvara9 headless (sends confirmation to ralf.roeber@amvara.de by default):
#   BASE_URL=https://www.satisfecho.de HEADLESS=1 node front/scripts/test-reservation-create.mjs
# Override email: TEST_EMAIL=you@your-domain.com node front/scripts/test-reservation-create.mjs
# Or: npm run test:reservation-create --prefix front
```

---

### 2. Demo data

Checks tenant 1 has ≥10 tables, ≥10 products, and that `/book/1` loads. Uses login to hit `/api/products` and `/api/tables/with-status`.

```bash
npm run test:demo-data --prefix front
# Or: BASE_URL=http://satisfecho.de LOGIN_EMAIL=... LOGIN_PASSWORD=... node front/scripts/test-demo-data.mjs
```

- **Env:** `BASE_URL`, `LOGIN_EMAIL`, `LOGIN_PASSWORD`, `BOOK_TENANT_ID` (default `1`), `HEADLESS`.

---

### 2b. Working plan (schedule roles)

Smoke test for the Working plan (shift schedule) page. Logs in as a user with schedule access (e.g. owner), opens `/working-plan`, and asserts the page and Add shift button are present.

```bash
npm run test:working-plan --prefix front
# Or: LOGIN_EMAIL=owner@amvara.de LOGIN_PASSWORD=secret node front/scripts/test-working-plan.mjs
# Headless: BASE_URL=http://127.0.0.1:4202 HEADLESS=1 LOGIN_EMAIL=... LOGIN_PASSWORD=... node front/scripts/test-working-plan.mjs
```

- **Env:** `BASE_URL`, `LOGIN_EMAIL`/`LOGIN_PASSWORD` or `ADMIN_EMAIL`/`ADMIN_PASSWORD` or `DEMO_LOGIN_EMAIL`/`DEMO_LOGIN_PASSWORD` (from `.env`). `TENANT_ID` (default `1`) — login uses `/login?tenant=1` so the user is in the correct tenant. User must have schedule access (owner, admin, kitchen, bartender, waiter, receptionist). `HEADLESS`.
- **Asserts:** After login, `/working-plan` loads; `[data-testid="working-plan-page"]` and `[data-testid="working-plan-add-shift"]` are present; week navigation is present; switching to Calendar view shows `[data-testid="working-plan-calendar-grid"]` with header and day cells; days that do not meet personnel requirements (too many or too few staff) are marked red. The working-plan route is lazy-loaded—if UI changes don’t appear after editing, do a full page refresh or restart the dev server.

---

### 2c. Changelog (What's new)

Smoke test for the dashboard "What's new" tile and changelog modal. Logs in, opens the dashboard, clicks the What's new tile, and asserts the changelog is loaded from the API and shown (no 404).

```bash
npm run test:changelog --prefix front
# Or: LOGIN_EMAIL=owner@amvara.de LOGIN_PASSWORD=secret node front/scripts/test-changelog.mjs
# Headless: BASE_URL=http://127.0.0.1:4202 HEADLESS=1 npm run test:changelog --prefix front
```

- **Env:** `BASE_URL`, `LOGIN_EMAIL`/`LOGIN_PASSWORD` or `DEMO_LOGIN_EMAIL`/`DEMO_LOGIN_PASSWORD` (from `.env`). `TENANT_ID` (default `1`). `HEADLESS`.
- **Asserts:** After login, dashboard "What's new" tile is present; clicking it opens the modal; changelog content loads (no error); body contains version-like headings or "Unreleased". Requires backend to serve `CHANGELOG.md` (single file at project root; Docker: `./CHANGELOG.md` mounted at `/app/CHANGELOG.md` in back container).

---

### 2d. Settings → Providers (personal providers)

Smoke test for the personal providers feature (issue #25). Logs in with tenant=1 (using `.env` credentials), opens Settings, clicks the Providers tab, and asserts the Providers section and Add provider button are present.

```bash
npm run test:settings-providers --prefix front
# Uses .env: DEMO_LOGIN_EMAIL, DEMO_LOGIN_PASSWORD; TENANT_ID=1
# Or: BASE_URL=http://127.0.0.1:4202 HEADLESS=1 npm run test:settings-providers --prefix front
```

- **Env:** `BASE_URL`, `LOGIN_EMAIL`/`LOGIN_PASSWORD` or `DEMO_LOGIN_EMAIL`/`DEMO_LOGIN_PASSWORD` (from `.env`). `TENANT_ID` (default `1`). `HEADLESS`.
- **Asserts:** After login, `/settings` loads; Providers tab is present; clicking it shows the Providers section and the Add provider button (`data-testid="settings-providers-section"`, `data-testid="settings-add-provider-btn"`).

---

### 3. Tables page (view toggle and table view)

Login, open `/tables`, then if the view toggle is present (tables exist), switch to Table view and assert the data table with columns is shown.

```bash
npm run test:tables-page --prefix front
# Or: BASE_URL=http://127.0.0.1:4202 LOGIN_EMAIL=... LOGIN_PASSWORD=... node front/scripts/test-tables-page.mjs
```

- **Env:** `BASE_URL`, `LOGIN_EMAIL`, `LOGIN_PASSWORD`, `HEADLESS`.
- Asserts: on `/tables` after login; when view toggle exists, Table view shows `.tables-data-table` with header columns.

**Tables canvas – view options and switching Floor plan / Tiles / Table:**

```bash
npm run test:tables-canvas-view-options --prefix front
# Or: BASE_URL=http://127.0.0.1:4202 HEADLESS=1 node front/scripts/test-tables-canvas-view-options.mjs
```

- **Env:** `BASE_URL`, `LOGIN_EMAIL`/`LOGIN_PASSWORD` or `DEMO_LOGIN_EMAIL`/`DEMO_LOGIN_PASSWORD` (from `.env`). `TENANT_ID` (default `1`). Demo tables must be seeded for tenant 1. `HEADLESS`.
- **Asserts:** Login (tenant=1), open `/tables/canvas`; three view options visible; click “Add table”, options stay visible; switch to **Tiles** (click Tiles link → `/tables`, tiles view `.table-grid`); switch to **Table** (click Table button → `.tables-data-table`); switch back to **Floor plan** (click Floor plan link → `/tables/canvas`); switch to Table list again (click Table link from canvas → `/tables` with table view).

---

### 4. Landing page

**Version in footer:**

```bash
npm run test:landing-version --prefix front
# Or: BASE_URL=http://127.0.0.1:4202 node front/scripts/test-landing-version.mjs
```

- Asserts `[data-testid="landing-version"]` or `.landing-version-bar` is visible and contains a version-like string (e.g. `1.0.1`). Skips if redirected to dashboard/login.

**Provider login and register links:**

```bash
npm run test:landing-provider-links --prefix front
# Or: node front/scripts/test-landing-provider-links.mjs
```

- Asserts footer has provider login and “Register as provider” links; clicks register and checks navigation to `/provider/register` and presence of registration form.

---

### 5. Provider section

Tests for the provider portal: landing links, registration, login, and dashboard (add product).

**Landing → provider links** (see §4): `test-landing-provider-links` checks footer links to `/provider/login` and `/provider/register` and that the register link opens the provider registration form.

**Provider registration** (creates a new provider account; no cleanup — leaves DB entry):

```bash
npm run test:provider-register --prefix front
# Or: BASE_URL=http://127.0.0.1:4202 HEADLESS=1 node front/scripts/test-provider-register.mjs
```

- **Env:** `BASE_URL`, `PROVIDER_NAME`, `PROVIDER_EMAIL` (default: `provider-<timestamp>@amvara.de`), `PROVIDER_PASSWORD`, `PROVIDER_FULL_NAME`, `HEADLESS`.
- Opens `/provider/register`, fills form, submits; asserts success or reports error.

**Provider login + add product** (requires an existing provider account):

```bash
PROVIDER_TEST_EMAIL=pos-provider@amvara.de PROVIDER_TEST_PASSWORD=secret npm run test:provider-add-product --prefix front
# Or: BASE_URL=http://127.0.0.1:4202 HEADLESS=1 node front/scripts/test-provider-add-product.mjs
```

- **Env:** `BASE_URL`, `PROVIDER_TEST_EMAIL`, `PROVIDER_TEST_PASSWORD` (required), `PRODUCT_NAME` (optional), `HEADLESS`.
- Logs in at `/provider/login`, goes to `/provider`, opens Add product, fills form, submits; asserts product appears or no error.

| Script | Purpose |
|--------|---------|
| `front/scripts/test-landing-provider-links.mjs` | Landing footer provider login/register links and register page load. |
| `front/scripts/test-provider-register.mjs` | Full provider registration flow. |
| `front/scripts/test-provider-add-product.mjs` | Provider login and add product on dashboard. |

---

### 6. Register page (staff/restaurant)

**Content (Who is this for? explanation):**

```bash
npm run test:register-page --prefix front
# Or: BASE_URL=http://127.0.0.1:4202 HEADLESS=1 node front/scripts/test-register-page.mjs
```

- Loads `/register`, checks `.register-explanation` and provider/guest text (English when `Accept-Language: en`).

**Full registration flow** (fill form, submit, check success/error):

```bash
npm run test:register --prefix front
# Or: BASE_URL=http://satisfecho.de node front/scripts/test-register.mjs
```

- **Env:** `BASE_URL`, `REGISTER_EMAIL`, `REGISTER_PASSWORD`, `REGISTER_FULL_NAME`, `REGISTER_TENANT_NAME`, `HEADLESS`. Uses unique email by default (`test-<timestamp>@amvara.de`).

---

### 7. Orders (status dropdown)

Order #8 (or `ORDER_ID`) status dropdown and “next status” options (e.g. Preparing).

```bash
npm run test:order-8-status --prefix front
# Or: ORDER_ID=8 BASE_URL=http://127.0.0.1:4203 LOGIN_EMAIL=... LOGIN_PASSWORD=... node front/scripts/test-order-8-status.mjs
```

- **Env:** `BASE_URL`, `LOGIN_EMAIL`, `LOGIN_PASSWORD`, `ORDER_ID` (default `8`), `HEADLESS`. Requires the order to exist in Active Orders.

---

### 7b. Orders – order edit widget and status popover

Review test for the staff Orders page: Edit button on cards and in History grid, order edit modal (add/remove/change items, billing, print), and status popover visibility (z-index). Logs in with tenant=1 (using `.env` credentials), opens `/staff/orders`, clicks Edit on the first order card and verifies the order edit modal opens; then checks the status dropdown is visible with sufficient z-index; then switches to Order History and clicks Edit in the grid and verifies the same modal opens.

```bash
node front/scripts/review-order-edit-puppeteer.mjs
# Or: BASE_URL=http://127.0.0.1:4202 HEADLESS=1 node front/scripts/review-order-edit-puppeteer.mjs
```

- **Env:** `BASE_URL` (default `http://127.0.0.1:4202`), `LOGIN_EMAIL`/`LOGIN_PASSWORD` or `DEMO_LOGIN_EMAIL`/`DEMO_LOGIN_PASSWORD` (from `.env`), `TENANT_ID` (default `1`), `HEADLESS`.
- **Asserts:** Edit button on card found; clicking it opens the order edit modal (title, items, billing). Status button opens dropdown that is visible (z-index ≥ 100). In History tab, Edit button in grid opens the same order edit modal. If the modal does not open from the card, the script still passes when it opens from the History grid (and suggests rebuilding/refreshing the frontend). On failure, a screenshot is saved to `front/scripts/screenshots/review-edit-modal-fail.png`.
- No npm script; run with `node` from repo root.

---

### 8. Reports (Sales & Revenue) smoke test

Login as **owner or admin**, open `/reports`, and assert the Reports page loads (date range inputs and `[data-testid="reports-page"]` present). Use after Reports feature work.

```bash
npm run test:reports --prefix front
# Or: BASE_URL=http://127.0.0.1:4202 HEADLESS=1 LOGIN_EMAIL=... LOGIN_PASSWORD=... node front/scripts/test-reports.mjs
```

- **Env:** `BASE_URL`, `LOGIN_EMAIL`, `LOGIN_PASSWORD` (must be owner or admin), `HEADLESS`.

---

### 9. Catalog (products + images)

Login, open `/catalog`, count cards and how many show real images vs placeholders.

```bash
npm run test:catalog --prefix front
# Or: LOGIN_EMAIL=... LOGIN_PASSWORD=... BASE_URL=http://satisfecho.de node front/scripts/test-catalog.mjs
```

- **Env:** `BASE_URL`, `LOGIN_EMAIL`, `LOGIN_PASSWORD`, `HEADLESS`.

---

### 10. Menu logo

Restaurant logo (e.g. Cobalto SVG) on customer menu page `/menu/{tableToken}`.

```bash
node front/scripts/test-menu-logo.mjs
```

- **Env:** `BASE_URL`, `TABLE_TOKEN` (optional; default: fetched via API after login), `LOGIN_EMAIL`, `LOGIN_PASSWORD`. Loads `.env` from project root if vars unset. No npm script; run with `node` from repo root.

---

### 11. WebSocket

WebSocket connectivity after owner login (e.g. on `/orders`). Requires full stack including ws-bridge.

```bash
node front/scripts/test-websocket.mjs
# With stack: BASE_URL=http://localhost:4202 node front/scripts/test-websocket.mjs
```

- **Env:** `BASE_URL`, `LOGIN_EMAIL`, `LOGIN_PASSWORD`. Loads `.env` from project root. No npm script; run with `node` from repo root.

---

### 12. Bartender role (Users page)

Login as admin or owner, open `/users`, click “Add user”, and assert the role dropdown includes the “Bartender” option.

```bash
npm run test:bartender-role --prefix front
# Or: LOGIN_EMAIL=... LOGIN_PASSWORD=... node front/scripts/test-bartender-role.mjs
```

- **Env:** `BASE_URL`, `LOGIN_EMAIL`, `LOGIN_PASSWORD` (admin or owner), `HEADLESS`.

---

### 13. Kitchen display – status dropdown visible

Login, open `/kitchen`, click the first clickable item status badge (e.g. "Preparando"), assert the status dropdown appears and is fully visible in the viewport (not clipped by the order card).

```bash
npm run test:kitchen-status-dropdown --prefix front
# Or: BASE_URL=http://127.0.0.1:4202 HEADLESS=1 LOGIN_EMAIL=... LOGIN_PASSWORD=... node front/scripts/test-kitchen-status-dropdown.mjs
```

- **Env:** `BASE_URL`, `LOGIN_EMAIL`, `LOGIN_PASSWORD` (staff with `order:item_status`, e.g. owner, admin, kitchen), `HEADLESS`.

---

## npm scripts (front)

From repo root: `npm run <script> --prefix front`. From `front/`: `npm run <script>`.

| Script | Script file |
|--------|-------------|
| `debug:reservations` | `scripts/debug-reservations.mjs` |
| `debug:reservations:public` | `scripts/debug-reservations-public.mjs` |
| `test:register` | `scripts/test-register.mjs` |
| `test:demo-data` | `scripts/test-demo-data.mjs` |
| `test:tables-page` | `scripts/test-tables-page.mjs` |
| `test:tables-canvas-view-options` | `scripts/test-tables-canvas-view-options.mjs` (Tables: switch Floor plan → Tiles → Table → Floor plan → Table; .env demo user, tenant=1) |
| `test:landing-version` | `scripts/test-landing-version.mjs` |
| `test:landing-provider-links` | `scripts/test-landing-provider-links.mjs` |
| `test:provider-register` | `scripts/test-provider-register.mjs` |
| `test:provider-add-product` | `scripts/test-provider-add-product.mjs` |
| `test:catalog` | `scripts/test-catalog.mjs` |
| `test:order-8-status` | `scripts/test-order-8-status.mjs` |
| `test:register-page` | `scripts/test-register-page.mjs` |
| `test:reports` | `scripts/test-reports.mjs` (Reports page smoke; owner/admin) |
| `test:changelog` | `scripts/test-changelog.mjs` (Dashboard What's new → changelog modal; API serves CHANGELOG.md) |
| `test:settings-providers` | `scripts/test-settings-providers.mjs` (Settings → Providers tab; personal providers smoke; uses .env, tenant=1) |
| `test:bartender-role` | `scripts/test-bartender-role.mjs` (Users → Add user → role dropdown includes Bartender) |
| `test:kitchen-status-dropdown` | `scripts/test-kitchen-status-dropdown.mjs` (Kitchen display: status dropdown visible, not clipped) |
| `test:rate-limit` | `scripts/test-rate-limit.mjs` (API rate limiting: login 5/15min, register 3/hour; expects 429 after limit) |
| `test:rate-limit-puppeteer` | `scripts/test-rate-limit-puppeteer.mjs` (Puppeteer: login page, 6 wrong attempts, expects error banner) |

`test-menu-logo`, `test-websocket`, and `review-order-edit-puppeteer` have no npm script; run via `node front/scripts/<name>.mjs`.

---

## Backend / data checks (non-Puppeteer)

- **Demo tables:** `docker compose exec back python -m app.seeds.check_demo_tables` (exit 0 = T01–T10 present for tenant 1).
- **Seed tables:** `docker compose exec back python -m app.seeds.seed_demo_tables` (idempotent).
- **Seed demo products:** `docker compose exec back python -m app.seeds.seed_demo_products` (idempotent).
- **Link demo products to catalog (images on /products):** `docker compose exec back python -m app.seeds.link_demo_products_to_catalog` — links products without images to provider products that have images; deploy runs this after catalog imports.
- **Demo orders (Reports):** `docker compose exec back python -m app.seeds.seed_demo_orders` — seeds tenant 1 with paid and active orders over ±90 days; idempotent (skips if orders exist). Bootstrap runs this on virgin deploy. Optional: `./run_seeds.sh --demo-orders` from `back/`.

See `AGENTS.md` for full seed and deploy notes.

---

## Long-running smoke loop (`go-ahead-loop.sh`)

For **hours-long** checks while the stack stays up, **`scripts/go-ahead-loop.sh`** runs **`git pull --rebase --autostash`**, then **backend pytest** via Docker and **`npm run test:landing-version`** from **`front/`**. It does **not** auto-edit or auto-commit repo files (avoiding endless **`commit-hash.ts`** churn).

This **does not** replace an AI “go ahead” for product code; it only automates **pull + smoke**.

**Safety:** the script exits unless **`GO_AHEAD_LOOP=1`**.

```bash
chmod +x scripts/go-ahead-loop.sh scripts/start-go-ahead-loop-background.sh
# Default: ~8 hours, 10 minutes between cycles (requires Docker + app on BASE_URL)
GO_AHEAD_LOOP=1 ./scripts/go-ahead-loop.sh
```

**Background (~8h, survives terminal close):** `start-go-ahead-loop-background.sh` sets `GO_AHEAD_LOOP=1`, runs the loop under **`nohup`**, and writes **`pid`** to **`.go-ahead-loop.pid`** (gitignored).

```bash
./scripts/start-go-ahead-loop-background.sh
# tail -f .go-ahead-loop.log
# kill "$(cat .go-ahead-loop.pid)" && rm -f .go-ahead-loop.pid
```

| Variable | Default | Meaning |
|----------|---------|---------|
| `DURATION_SECONDS` | `28800` | Stop after this many seconds (~8h). |
| `INTERVAL_SECONDS` | `600` | Sleep between cycles (minimum `1`). |
| `BASE_URL` | `http://127.0.0.1:4202` | Landing smoke (`test:landing-version`). |
| `GO_AHEAD_LOG` | `.go-ahead-loop.log` (repo root) | Append log (gitignored). |
| `SKIP_TESTS` | unset | Set to `1` to skip pytest and landing test. |
| `COMPOSE_FILES` | `-f docker-compose.yml -f docker-compose.dev.yml` | Passed to **`docker compose`**. |

**One short dry cycle** (pull + log only):

```bash
GO_AHEAD_LOOP=1 DURATION_SECONDS=120 INTERVAL_SECONDS=60 SKIP_TESTS=1 ./scripts/go-ahead-loop.sh
```

---

## Coverage summary

| Area | Covered by | Notes |
|------|------------|--------|
| **Reservations** | Public + staff scripts, `run-reservation-tests.sh` | Public flow cancels booking by token; staff flow creates/cancels. |
| **Demo data** | `test-demo-data.mjs` | Tenant 1: tables, products, `/book/1`. |
| **Tables** | `test-tables-page.mjs` | View toggle, Table view and data table. |
| **Landing** | Version, provider links | Version bar; footer links to provider login/register. |
| **Provider portal** | Register, add-product, landing links | No dedicated “login only” test; add-product covers login + dashboard. |
| **Staff auth** | Register page content, full register | Who-is-this-for; full registration (no cleanup). |
| **Orders** | Order #8 status dropdown; `review-order-edit-puppeteer.mjs` (Edit button, order edit modal, status popover) | Order #8: requires existing order in Active Orders. Review script: login, /staff/orders, card + History Edit, status dropdown z-index. |
| **Reports** | `test-reports.mjs` | Smoke: page loads (owner/admin). |
| **Users / Bartender role** | `test-bartender-role.mjs` | Admin/owner: /users → Add user → role dropdown includes Bartender. |
| **Kitchen display** | `test-kitchen-status-dropdown.mjs` | Status dropdown visible and not clipped on /kitchen. |
| **Catalog** | `test-catalog.mjs` | Cards and image placeholders. |
| **Menu (customer)** | `test-menu-logo.mjs` | Logo on `/menu/:token`. |
| **WebSocket** | `test-websocket.mjs` | Post-login WS (ws-bridge required). |
| **Rate limiting** | `test-rate-limit.mjs`, `test-rate-limit-puppeteer.mjs` | API: 429 after limit; Puppeteer: login page shows error banner (e.g. "Too many login attempts") when rate limited. See `docs/0020-rate-limiting-production.md` for all limits (login, register, payment, public menu, upload, admin). |

**Not covered (or partial):** No automated cleanup of test-created data (e.g. provider/restaurant registration leaves DB entries). No Puppeteer tests for settings, inventory, or tables canvas. Unit tests (Karma/Jasmine) are separate; see `npm test` in front.

**When running many tests in a row:** Login-based tests (demo-data, tables-page, reports, order-8-status, catalog, etc.) hit the same API; rate limiting (e.g. 429) can occur. Space out runs or run login tests in a separate session if you see 429 on login.

---

## Known issues and follow-up (to address later)

- **test-provider-register** — Often ends in “Unknown state” (no success or error banner after submit; stays on `/provider/register`). Likely backend/API or UI timing/selectors; to fix: confirm provider registration API and success/error UI, then adjust backend or test.
- **debug-reservations-public** — API can return 422; time field (e.g. `20:00`) may trigger validation or parsing issues; success UI not shown. To fix: align reservations API and book form (time format/validation) so the test payload is accepted and success is visible.
- **Login-based tests (demo-data, tables-page, reports, etc.)** — Can fail with 429 Too Many Requests when run in quick succession. To fix later: relax or bypass rate limiting in test env, or run login tests in a separate session / with delays.
- **Test data cleanup** — Provider and restaurant registration tests create real DB rows and do not remove them. To fix later: add teardown (e.g. delete created provider/tenant), use a dedicated test DB that is reset, or document manual cleanup.

---

### Rate limiting (API)

Verifies that login and register endpoints return HTTP 429 after the configured limit (login: 5 per 15 minutes per IP, register: 3 per hour per IP). Uses direct API calls (no browser). Requires backend and Redis running.

```bash
npm run test:rate-limit --prefix front
# Or: BASE_URL=http://127.0.0.1:4202 node front/scripts/test-rate-limit.mjs
# Skip register test (creates DB entries): SKIP_REGISTER_LIMIT=1 node front/scripts/test-rate-limit.mjs
```

- **Env:** `API_URL` or `BASE_URL` (API = BASE_URL + `/api`), `SKIP_LOGIN_LIMIT`, `SKIP_REGISTER_LIMIT`.

**Puppeteer (browser):** Opens `/login`, submits wrong credentials 6 times; asserts an error banner is shown (401 or 429). When rate limited, the UI shows "Too many login attempts. Please try again later."

```bash
npm run test:rate-limit-puppeteer --prefix front
# Or: BASE_URL=http://127.0.0.1:4202 HEADLESS=1 node front/scripts/test-rate-limit-puppeteer.mjs
```

---

### Bartender role (Users page)

Login as admin or owner, open `/users`, click “Add user”, and assert the role dropdown includes the “Bartender” option.

```bash
npm run test:bartender-role --prefix front
# Or: LOGIN_EMAIL=... LOGIN_PASSWORD=... node front/scripts/test-bartender-role.mjs
```

- **Env:** `BASE_URL`, `LOGIN_EMAIL`, `LOGIN_PASSWORD` (admin or owner), `HEADLESS`.

---

## Maintenance notes

- **Selectors:** Tests use stable selectors (e.g. `[data-testid="..."]`, `.auth-card`, `.order-card`). When changing UI, update tests or add data-testids so tests stay green.
- **Port detection:** Scripts try 4203, 4202, 4200 then fallback (e.g. satisfecho.de). For CI or fixed port, set `BASE_URL`.
- **Credentials:** Never commit real credentials. Use `.env` (gitignored) or env vars; document only variable names in this file.
- **Chrome:** Use `puppeteer-core` and system Chrome; no install of Chromium via npm (see AGENTS.md). On other OS, set `PUPPETEER_EXECUTABLE_PATH` if needed.
