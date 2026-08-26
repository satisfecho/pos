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

# Password reset API (GitHub #93; Postgres + rolled-back session):
docker compose -f docker-compose.yml -f docker-compose.dev.yml exec -T back python3 -m pytest /app/tests/test_password_reset.py -q

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

### 2a. Waiting list (public + staff)

Smoke for public `/waitlist/:tenantId` (form + join → success) and staff `/reservations` → Waitlist tab (list GET without hard fail). Creates a unique guest name/phone per run (idempotent; leaves a `waiting` row).

```bash
npm run test:waiting-list --prefix front
# Or: BASE_URL=http://127.0.0.1:4202 TENANT_ID=1 node front/scripts/test-waiting-list.mjs
```

- **Env:** `BASE_URL`, `TENANT_ID` (default `1`), `LOGIN_EMAIL` / `LOGIN_PASSWORD` (or `DEMO_LOGIN_*` from `.env` for staff tab), `HEADLESS`.
- Staff Waitlist tab is skipped (public join still required) when credentials are unset.

---

### 2a2. Restaurant groups (Settings)

Smoke for **Settings → Restaurant group** (`docs/0054-restaurant-groups.md`). Logs in as owner/admin, opens the Restaurant group tab (`settings-restaurant-group-tab`), and asserts the section (`settings-restaurant-group-section`) with either create/join or member/leave UI.

```bash
npm run test:restaurant-groups --prefix front
# Or: BASE_URL=http://127.0.0.1:4202 TENANT_ID=1 node front/scripts/test-restaurant-groups.mjs
```

- **Env:** `BASE_URL`, `TENANT_ID` (default `1`), `LOGIN_EMAIL` / `LOGIN_PASSWORD` (or `DEMO_LOGIN_*` / `ADMIN_*` from `.env`; must be owner/admin), `HEADLESS`.

---

### 2a3. Staff Satisfecho Delivery (create + edit)

Smoke for staff **`/staff/orders`**: open **New delivery order**, create a Satisfecho Delivery order (address, phone, one product; optional courier), assert Delivery tab channel badge / address, then **Edit delivery** and save a phone change. Does not cover public checkout (`test:delivery-checkout`) or courier portal (`test:courier-actions`).

```bash
npm run test:staff-delivery --prefix front
# Or: BASE_URL=http://127.0.0.1:4202 TENANT_ID=1 node front/scripts/test-staff-delivery.mjs
```

- **Env:** `BASE_URL`, `TENANT_ID` (default `1`), `LOGIN_EMAIL` / `LOGIN_PASSWORD` (or `DEMO_LOGIN_*` / `ADMIN_*` from `.env`; user needs order-update permission), `HEADLESS`.
- Leaves one delivery order per run (demo hygiene OK).

---

### 2a3a. Public Satisfecho Delivery checkout

Smoke for public **`/delivery/:tenantId`** checkout (`docs/0053-satisfecho-delivery-order-channel.md`, shipped CLOSED-302 / #304): menu → cart → address → create order. Also asserts product `<img>` src uses **`/api/uploads/...`** (not bare `/uploads/...`, which 404s on HAProxy front — FEAT-312 / #312). Script is committed on `development` (`front/scripts/test-delivery-checkout.mjs`). Does not cover staff create/edit (`test:staff-delivery`), track page (`test:delivery-track`), or courier portal (`test:courier-actions`).

```bash
npm run test:delivery-checkout --prefix front
# Or: BASE_URL=http://127.0.0.1:4202 TENANT_ID=1 node front/scripts/test-delivery-checkout.mjs
```

- **Env:** `BASE_URL`, `TENANT_ID` (default `1`), `HEADLESS`. No login.
- Leaves one public delivery order per successful run (demo hygiene OK).

---

### 2a3b. Public Satisfecho Delivery track (invalid token)

Smoke for the token-gated customer track page at `/delivery/:tenantId/track` (`docs/0053-satisfecho-delivery-order-channel.md`). Opens the route with a missing/invalid `public_order_token` and asserts an error / not-found state (no raw `DELIVERY_TRACK.*` i18n keys). Does not create a paid order or cover the happy-path track flow.

```bash
npm run test:delivery-track --prefix front
# Or: BASE_URL=http://127.0.0.1:4202 TENANT_ID=1 node front/scripts/test-delivery-track.mjs
```

- **Env:** `BASE_URL`, `TENANT_ID` (default `1`), `HEADLESS`. No login.

---

### 2a3c. Courier portal actions

Smoke for the courier dashboard (`/courier`, login at `/courier/login`): open Mine (or Available), open an order, run one available status action, assert status updates. See `docs/0053-satisfecho-delivery-order-channel.md`. Does not cover public checkout or staff delivery create.

```bash
npm run test:courier-actions --prefix front
# Or: BASE_URL=http://127.0.0.1:4202 node front/scripts/test-courier-actions.mjs
```

- **Env:** `BASE_URL`, `COURIER_EMAIL` / `COURIER_PASSWORD` (defaults `courier-test-phase1@amvara.de` / `secret`; also in `config.env.example`), `HEADLESS`.
- Demo seed: `docker compose exec back python -m app.seeds.seed_demo_courier_user` (bootstrap / `reset_demo_data` also run this).

---

### 2a3d. Platform operator portal

Smoke for the SaaS platform operator dashboard (`/platform`, login at `/platform/login`): log in, assert metric cards on the dashboard, open a tenant detail page, and confirm the public Satisfecho Delivery link for that tenant. See `docs/0059-platform-operator-portal.md`. Does not cover tenant staff login, paywall (`test:paywall`), or courier portal (`test:courier-actions`).

```bash
npm run test:platform-operator --prefix front
# Or: BASE_URL=http://127.0.0.1:4202 node front/scripts/test-platform-operator.mjs
```

- **Env:** `BASE_URL`, `PLATFORM_OPERATOR_EMAIL` / `PLATFORM_OPERATOR_PASSWORD` (defaults `platform-test@amvara.de` / `test-platform-ops-123`; also commented in `config.env.example`), `HEADLESS`.
- Seed operator (idempotent): `docker compose exec back python -m app.seeds.ensure_platform_operator` (pass the same email/password via env if not using defaults).

---

### 2a4. Staff guest feedback

Smoke for staff **Guest feedback** at `/guest-feedback` (Reservations module). Logs in, opens the page, asserts the page shell (heading / QR card), trends analytics panel, Export CSV control, that `GET /tenant/guest-feedback` and `GET /tenant/guest-feedback/summary` do not hard-fail, and that raw `FEEDBACK.*` i18n keys are not dumped. Empty list is OK. Does not cover public `/feedback/:tenantId` (see `test:feedback-public-i18n`).

```bash
npm run test:guest-feedback-staff --prefix front
# Or: BASE_URL=http://127.0.0.1:4202 TENANT_ID=1 node front/scripts/test-guest-feedback-staff.mjs
```

- **Env:** `BASE_URL`, `TENANT_ID` (default `1`), `LOGIN_EMAIL` / `LOGIN_PASSWORD` (or `DEMO_LOGIN_*` / `ADMIN_*` from `.env`; user needs reservations access), `HEADLESS`.

---

### 2b. Working plan (schedule roles)

Smoke test for the Working plan (shift schedule) page. Logs in as a user with schedule access (e.g. owner), opens `/working-plan`, and asserts the page and Add shift button are present.

```bash
npm run test:working-plan --prefix front
# Or: LOGIN_EMAIL=owner@amvara.de LOGIN_PASSWORD=secret node front/scripts/test-working-plan.mjs
# Headless: BASE_URL=http://127.0.0.1:4202 HEADLESS=1 LOGIN_EMAIL=... LOGIN_PASSWORD=... node front/scripts/test-working-plan.mjs
```

- **Env:** `BASE_URL`, `LOGIN_EMAIL`/`LOGIN_PASSWORD` or `ADMIN_EMAIL`/`ADMIN_PASSWORD` or `DEMO_LOGIN_EMAIL`/`DEMO_LOGIN_PASSWORD` (from `.env`). `TENANT_ID` (default `1`) — login uses `/login?tenant=1` so the user is in the correct tenant. User must have schedule access (owner, admin, kitchen, bartender, waiter, receptionist). `HEADLESS`.
- **Asserts:** After login, `/working-plan` loads; `[data-testid="working-plan-page"]` and `[data-testid="working-plan-add-shift"]` are present; week navigation is present; switching to Calendar view shows `[data-testid="working-plan-calendar-grid"]` with header and day cells; days that do not meet personnel requirements (too many or too few staff) are marked red; **Excel export** controls `[data-testid="working-plan-export-worker"]` and `[data-testid="working-plan-export-excel"]` are present when the tenant has schedulable users. The working-plan route is lazy-loaded—if UI changes don’t appear after editing, do a full page refresh or restart the dev server.

**Calendar route smoke** (`test:working-plan-calendar` — differs from `test:working-plan`): opens **`/working-plan/calendar` directly** (no week-view navigation) and **fails if the page logs console errors**. Use this when changing the calendar route or lazy-load; use `test:working-plan` for week grid, in-page calendar switch, staffing colours, and Excel export asserts.

```bash
npm run test:working-plan-calendar --prefix front
# Or: LOGIN_EMAIL=owner@amvara.de LOGIN_PASSWORD=secret node front/scripts/test-working-plan-calendar.mjs
# Headless: BASE_URL=http://127.0.0.1:4202 HEADLESS=1 LOGIN_EMAIL=... LOGIN_PASSWORD=... node front/scripts/test-working-plan-calendar.mjs
```

- **Env:** Same as `test:working-plan` (`BASE_URL`, `LOGIN_*` / `DEMO_LOGIN_*` / `ADMIN_*`, `TENANT_ID` default `1`, `HEADLESS`).
- **Asserts:** After login, `/working-plan/calendar` loads; calendar chrome is present; no console `error` messages during the run.

**Debug (inspect red / staffing days — not a pass/fail smoke):**

```bash
npm run debug:working-plan-calendar --prefix front
# Or: LOGIN_EMAIL=... LOGIN_PASSWORD=... BASE_URL=http://127.0.0.1:4202 node front/scripts/debug-working-plan-calendar.mjs
```

- Logs into the working-plan calendar and prints cell / red-day counts for diagnosing staffing-day colouring. Same login env as `test:working-plan` (`LOGIN_*` / `DEMO_LOGIN_*`, optional `TENANT_ID`, `BASE_URL`). For CI-style checks use **`test:working-plan`** and **`test:working-plan-calendar`**.

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
- **Asserts:** After login, `/settings` loads; Providers tab is present; clicking it shows the Providers section and the Add provider button (`data-testid="settings-providers-section"`, `data-testid="settings-add-provider-btn"`). Personal providers also show **Edit provider** (`data-testid="settings-edit-provider-btn"`).

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
npm run test:tables-canvas-open-orders --prefix front
# Or: BASE_URL=http://127.0.0.1:4202 HEADLESS=1 node front/scripts/test-tables-canvas-open-orders.mjs
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
- After a **`front/package.json`** version bump, run **`node front/scripts/get-commit-hash.js`** and commit **`commit-hash.ts`** with the bump so the footer semver matches (see committer / commit-changelog-version rule).
- When `LOGIN_EMAIL`/`LOGIN_PASSWORD` or `DEMO_LOGIN_EMAIL`/`DEMO_LOGIN_PASSWORD` are set (e.g. from repo `.env`), also logs in with `TENANT_ID` (default `1`), then from `/dashboard` clicks each visible sidebar `a.nav-link` and each inventory `a.nav-sublink` (opens the inventory section when needed). Fullscreen routes (`/kitchen`, `/bar`) have no sidebar, so the test returns to `/dashboard` before each link. Without credentials, only the landing check runs (CI-friendly).
- Set `LANDING_VERSION_ONLY=1` to force only the landing/version step even when `.env` defines demo login vars (e.g. `BASE_URL=https://satisfecho.de` smoke without a **401** from wrong credentials).
- For **non-local** `BASE_URL`, the script runs a short HTTP reachability probe to `/` before Puppeteer so firewall/sandbox issues fail fast with a clear hint. Set `LANDING_SMOKE_NO_REACHABILITY_PROBE=1` to skip that probe. Use `SKIP_LANDING_PACKAGE_VERSION_CHECK=1` when the deployed footer semver may differ from this checkout’s `front/package.json`.

**Provider login and register links:**

```bash
npm run test:landing-provider-links --prefix front
# Or: node front/scripts/test-landing-provider-links.mjs
```

- Asserts footer has provider login and “Register as provider” links, a **Contact us** link with `mailto:hello@satisfecho.de`, and `data-testid="landing-contact-us"`; clicks register and checks navigation to `/provider/register` and presence of registration form.

**Public features page (`/features`):**

```bash
npm run test:features --prefix front
# Or: BASE_URL=http://127.0.0.1:4202 node front/scripts/test-features.mjs
```

- No login. Opens `/features`, asserts `.features-page` shell, translated hero title (not a raw `FEATURES_PAGE.*` key), at least one `.features-category`, and brand link to `/` or a register CTA. Clicks through to `/features/reservations` and asserts `.feature-detail-page` hero plus at least two benefit bullets. Fails on pageerror or bad HTTP for the document.

**Public pricing page (`/pricing`):**

```bash
npm run test:pricing --prefix front
# Or: BASE_URL=http://127.0.0.1:4202 node front/scripts/test-pricing.mjs
```

- No login. Fetches `GET /api/saas/config`, opens `/pricing` (must not redirect home), asserts translated hero, price and trial text matching config, self-host card, register CTA, and billing-active vs inactive note matching `enabled`. Fails on pageerror.

**Public about page (`/about`):**

```bash
npm run test:about --prefix front
# Or: BASE_URL=http://127.0.0.1:4202 node front/scripts/test-about.mjs
```

- No login. From home, asserts footer `data-testid="landing-about"` and company line with **Amvara Consulting S.L.**; opens `/about`, asserts translated hero, company section naming Amvara Consulting S.L., no pageerror.

---

### 5. Provider section

Tests for the provider portal: landing links, registration, login, and dashboard (add product).

**Landing → provider links** (see §4): `test-landing-provider-links` checks footer links to `/provider/login` and `/provider/register`, the **Contact us** `mailto:hello@satisfecho.de` link, and that the register link opens the provider registration form.

**Provider registration** (creates a new provider account; no cleanup — leaves DB entry):

```bash
npm run test:provider-register --prefix front
# Or: BASE_URL=http://127.0.0.1:4202 HEADLESS=1 node front/scripts/test-provider-register.mjs
```

- **Env:** `BASE_URL`, `PROVIDER_NAME`, `PROVIDER_EMAIL` (default: `provider-<timestamp>@amvara.de`), `PROVIDER_PASSWORD`, `PROVIDER_FULL_NAME`, `HEADLESS`.
- Opens `/provider/register`, fills form, submits; asserts success or reports error.

**End-user customer register + login** (#340; creates a customer account; no cleanup):

```bash
npm run test:customer-register-login --prefix front
# Or: BASE_URL=http://127.0.0.1:4202 HEADLESS=1 node front/scripts/test-customer-register-login.mjs
```

- **Env:** `BASE_URL`, `CUSTOMER_EMAIL` (default: `customer-<timestamp>@amvara.de`), `CUSTOMER_PASSWORD`, `CUSTOMER_FULL_NAME`, `HEADLESS`.
- Opens `/customer/register`, submits, then `/customer/login` → `/customer`; asserts empty orders state.

**Talk to POS** (#344; staff voice/text navigation demo):

```bash
LOGIN_EMAIL=… LOGIN_PASSWORD=… npm run test:talk --prefix front
# Or: BASE_URL=http://127.0.0.1:4202 HEADLESS=1 node front/scripts/test-talk.mjs
```

- **Env:** `BASE_URL`, `LOGIN_EMAIL` / `LOGIN_PASSWORD` (or `DEMO_LOGIN_*`), `HEADLESS`.
- Logs in, opens `/talk`, types `kitchen`, asserts navigation to `/kitchen`. See `docs/0076-talk-to-pos.md`.

**Provider login + add product** (requires an existing provider account):

```bash
PROVIDER_TEST_EMAIL=pos-provider@amvara.de PROVIDER_TEST_PASSWORD=secret npm run test:provider-add-product --prefix front
# Or: BASE_URL=http://127.0.0.1:4202 HEADLESS=1 node front/scripts/test-provider-add-product.mjs
```

- **Env:** `BASE_URL`, `PROVIDER_TEST_EMAIL`, `PROVIDER_TEST_PASSWORD` (required), `PRODUCT_NAME` (optional), `HEADLESS`.
- Logs in at `/provider/login`, goes to `/provider`, opens Add product, fills form, submits; asserts product appears or no error.

| Script | Purpose |
|--------|---------|
| `front/scripts/test-landing-provider-links.mjs` | Landing footer provider login/register links, contact mailto link, and register page load. |
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

**Guided signup wizard** (multi-step intro → account fields; non-destructive):

```bash
npm run test:guided-signup-wizard --prefix front
# Or: BASE_URL=http://127.0.0.1:4202 HEADLESS=1 node front/scripts/test-guided-signup-wizard.mjs
```

- Opens `/register`, asserts step-0 intro + **Get started**, advances to restaurant/account fields (tenant, address, phone, email, password) with Back/Next, then Back to intro. Does **not** submit or create a tenant. Prefer local HAProxy (`BASE_URL=http://127.0.0.1:4202`).

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
npm run test:review-order-edit --prefix front
# Or: BASE_URL=http://127.0.0.1:4202 HEADLESS=1 node front/scripts/review-order-edit-puppeteer.mjs
```

- **Env:** `BASE_URL` (default `http://127.0.0.1:4202`), `LOGIN_EMAIL`/`LOGIN_PASSWORD` or `DEMO_LOGIN_EMAIL`/`DEMO_LOGIN_PASSWORD` (from `.env`), `TENANT_ID` (default `1`), `HEADLESS`.
- **Asserts:** Edit button on card found; clicking it opens the order edit modal (title, items, billing). Status button opens dropdown that is visible (z-index ≥ 100). In History tab, Edit button in grid opens the same order edit modal. If the modal does not open from the card, the script still passes when it opens from the History grid (and suggests rebuilding/refreshing the frontend). On failure, a screenshot is saved to `front/scripts/screenshots/review-edit-modal-fail.png`.

---

### 8. Reports (Sales & Revenue) smoke test

Login as **owner or admin**, open `/reports`, and assert the Reports page loads (date range inputs and `[data-testid="reports-page"]` present). Use after Reports feature work.

```bash
npm run test:reports --prefix front
# Or: BASE_URL=http://127.0.0.1:4202 HEADLESS=1 LOGIN_EMAIL=... LOGIN_PASSWORD=... node front/scripts/test-reports.mjs
```

- **Env:** `BASE_URL`, `LOGIN_EMAIL`, `LOGIN_PASSWORD` (must be owner or admin), `HEADLESS`.

### 8b. Order tip entry mode + Reports tips card (GitHub #123)

Owner/admin: Settings → Payments → `#tip_entry_mode` (switch to overpayment, save, restore preset), then `/reports` and `[data-testid="reports-summary-tips"]`.

```bash
npm run test:order-tip-flows --prefix front
# Or: BASE_URL=http://127.0.0.1:4202 LOGIN_EMAIL=... LOGIN_PASSWORD=... node front/scripts/test-order-tip-flows.mjs
```

- **Env:** `BASE_URL`, `LOGIN_EMAIL` / `LOGIN_PASSWORD` or `DEMO_LOGIN_*` from `.env`, `TENANT_ID` (default `1`), `HEADLESS`.

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
npm run test:menu-logo --prefix front
# Or: BASE_URL=http://127.0.0.1:4202 node front/scripts/test-menu-logo.mjs
```

- **Env:** `BASE_URL`, `TABLE_TOKEN` (optional; default: fetched via API after login), `LOGIN_EMAIL`, `LOGIN_PASSWORD`. Loads `.env` from project root if vars unset.

---

### 11. WebSocket

WebSocket connectivity after owner login (e.g. on `/orders`). Requires full stack including ws-bridge.

```bash
npm run test:websocket --prefix front
# With stack: BASE_URL=http://localhost:4202 npm run test:websocket --prefix front
```

- **Env:** `BASE_URL`, `LOGIN_EMAIL`, `LOGIN_PASSWORD`. Loads `.env` from project root. Needs HAProxy + `ws-bridge`.

---

### 11b. API docs (`/api/docs`)

Swagger UI and OpenAPI spec load at `/api/docs` (no login).

```bash
npm run test:api-docs --prefix front
# Or: BASE_URL=http://127.0.0.1:4202 HEADLESS=1 npm run test:api-docs --prefix front
```

- **Env:** `BASE_URL` (auto-detect 4203/4202/4200), `HEADLESS`.

---

### 11c. amvara9 production smoke

Landing, login page, public book page, and `/api/health` against production. **Default `BASE_URL` is `https://www.satisfecho.de`** — set an explicit local `BASE_URL` if you do not intend to hit prod.

```bash
npm run test:amvara9-smoke --prefix front
# Local override: BASE_URL=http://127.0.0.1:4202 npm run test:amvara9-smoke --prefix front
```

- **Env:** `BASE_URL` (default production), `HEADLESS`. No login credentials.

---

### 11d. Settings → Contact default tax dropdown

Login, open Settings → Contact information, assert the default tax select has at least one IVA option (not an empty wrapper).

```bash
npm run test:settings-contact-tax --prefix front
# Or: BASE_URL=http://127.0.0.1:4202 HEADLESS=1 npm run test:settings-contact-tax --prefix front
```

- **Env:** `BASE_URL`, `LOGIN_EMAIL` / `LOGIN_PASSWORD` or `DEMO_LOGIN_*`, `TENANT_ID` (default `1`), `HEADLESS`.

---

### 11e. Staff “Open menu” link (skip PIN)

Login, open `/staff/orders`, click **Open menu** on the first order, add a product and place order; asserts the PIN modal does **not** appear.

```bash
npm run test:staff-menu-link --prefix front
# Or: BASE_URL=http://127.0.0.1:4202 node front/scripts/test-staff-menu-link-puppeteer.mjs
```

- **Env:** `BASE_URL`, `LOGIN_EMAIL` / `LOGIN_PASSWORD` or `DEMO_LOGIN_*` (tenant 1), `HEADLESS`. Needs an open order on staff orders.

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

### 13b. Bar display – route smoke

Login, open `/bar`, assert URL contains `/bar`, kitchen/bar chrome (`.kitchen-view` header, timer settings, fullscreen toggle), and title is Bar display (not Kitchen).

```bash
npm run test:bar-display --prefix front
# Or: BASE_URL=http://127.0.0.1:4202 HEADLESS=1 LOGIN_EMAIL=... LOGIN_PASSWORD=... node front/scripts/test-bar-display.mjs
```

- **Env:** `BASE_URL`, `LOGIN_EMAIL`/`LOGIN_PASSWORD` or `DEMO_LOGIN_*` / `ADMIN_*` (staff with `kitchen_bar` module), `HEADLESS`.

---

### 13c. Settings → logo upload

Login as owner/admin, open Settings, upload a logo file, save, and assert success.

```bash
npm run test:settings-logo --prefix front
# Or: BASE_URL=http://127.0.0.1:4202 HEADLESS=1 LOGIN_EMAIL=... LOGIN_PASSWORD=... node front/scripts/test-settings-logo-upload.mjs
```

- **Env:** `BASE_URL`, `LOGIN_EMAIL` / `LOGIN_PASSWORD` or `DEMO_LOGIN_*` (owner/admin), `TENANT_ID` (default `1`), `HEADLESS`.

---

### 13d. Support access (Users → Add Satisfecho support)

Login as admin or owner, open `/users`, use **Add Satisfecho support**, and assert the form pre-fills `support@satisfecho.de` as admin.

```bash
npm run test:support-access --prefix front
# Or: BASE_URL=http://127.0.0.1:4202 HEADLESS=1 LOGIN_EMAIL=... LOGIN_PASSWORD=... node front/scripts/test-support-access.mjs
```

- **Env:** `BASE_URL`, `LOGIN_EMAIL`, `LOGIN_PASSWORD` (admin or owner), `HEADLESS`.

---

### 13e. Kitchen display – timer settings

Login, open `/kitchen`, assert **Timer settings** is visible (and **Waiting** timer when orders exist).

```bash
npm run test:kitchen-timer --prefix front
# Or: BASE_URL=http://127.0.0.1:4202 HEADLESS=1 LOGIN_EMAIL=... LOGIN_PASSWORD=... node front/scripts/test-kitchen-timer.mjs
```

- **Env:** `BASE_URL`, `LOGIN_EMAIL`, `LOGIN_PASSWORD` (staff with kitchen access), `HEADLESS`.

---

### 13f. Book page – WhatsApp CTA

Public `/book/1` (no login): assert a WhatsApp link when the tenant has a WhatsApp number. Optional `API_BASE` if the API is on another origin than `BASE_URL`.

```bash
npm run test:book-whatsapp --prefix front
# Or: BASE_URL=http://127.0.0.1:4202 HEADLESS=1 node front/scripts/test-book-whatsapp-puppeteer.mjs
# API on another origin: API_BASE=http://127.0.0.1:8020 npm run test:book-whatsapp --prefix front
```

- **Env:** `BASE_URL`, `HEADLESS`, `API_BASE` (optional; defaults to `BASE_URL`). No login credentials.

---

### 13g. My shift – venue clock QR

When venue clock QR is required, `/my-shift` loads clock-qr-status and shows **Scan venue QR** (`.scan-cta`) with no token in session. Prefer `OWNER_*` to toggle clock QR via API and `LOGIN_*` for the user opening My shift (often a waiter).

```bash
npm run test:my-shift-clock-qr --prefix front
# Or: BASE_URL=http://127.0.0.1:4202 HEADLESS=1 LOGIN_EMAIL=... LOGIN_PASSWORD=... OWNER_EMAIL=... OWNER_PASSWORD=... node front/scripts/test-my-shift-clock-qr.mjs
```

- **Env:** `BASE_URL`, `LOGIN_EMAIL` / `LOGIN_PASSWORD` (staff that can open `/my-shift` and has `SETTINGS_UPDATE` if regenerating QR), optional `OWNER_EMAIL` / `OWNER_PASSWORD` when different from staff, `HEADLESS`.

---

## npm scripts (front)

From repo root: `npm run <script> --prefix front`. From `front/`: `npm run <script>`.

| Script | Script file |
|--------|-------------|
| `debug:reservations` | `scripts/debug-reservations.mjs` |
| `debug:reservations:public` | `scripts/debug-reservations-public.mjs` |
| `debug:working-plan-calendar` | `scripts/debug-working-plan-calendar.mjs` (inspect red/staffing days on calendar; not a pass/fail smoke — use `test:working-plan` / `test:working-plan-calendar` for CI) |
| `test:working-plan` | `scripts/test-working-plan.mjs` (week view + in-page calendar switch, staffing colours, Excel export; needs schedule access + `LOGIN_*` / `DEMO_LOGIN_*`) |
| `test:working-plan-calendar` | `scripts/test-working-plan-calendar.mjs` (direct `/working-plan/calendar` load; fails on console errors; same login env as `test:working-plan`) |
| `test:register` | `scripts/test-register.mjs` |
| `test:demo-data` | `scripts/test-demo-data.mjs` |
| `test:tables-page` | `scripts/test-tables-page.mjs` |
| `test:tables-canvas-view-options` | `scripts/test-tables-canvas-view-options.mjs` (Tables: switch Floor plan → Tiles → Table → Floor plan → Table; .env demo user, tenant=1) |
| `test:tables-canvas-open-orders` | `scripts/test-tables-canvas-open-orders.mjs` (Floor plan: select table → staff orders shortcut link with `focusOrder` / `focusTableId`; .env demo user) |
| `test:tables-waiter-assignment` | `scripts/test-tables-waiter-assignment.mjs` (Waiter: Table view has read-only assignment cells, no `select.waiter-select-inline`; requires `WAITER_LOGIN_EMAIL` / `WAITER_LOGIN_PASSWORD`, else skips with exit 0) |
| `test:landing-version` | `scripts/test-landing-version.mjs` |
| `record-promo-video` | `scripts/record-promo-video.mjs` (marketing walkthrough screencast → 1080p MP4 + copyleft bed; see `docs/0075-promo-videos.md`; outputs under `tmp/promo/`) |
| `test:features` | `scripts/test-features.mjs` (public `/features`: hero title, category sections, home/register nav; no login) |
| `test:pricing` | `scripts/test-pricing.mjs` (public `/pricing`: live `GET /saas/config` price/trial, self-host card, billing note vs `enabled`; no login) |
| `test:about` | `scripts/test-about.mjs` (public `/about`: footer About link, Amvara Consulting S.L. on page + footer; no login) |
| Print agent (manual / API) | Backend: `pytest tests/test_print_jobs.py`; LAN dry-run: create agent in Settings → Printing, then `PRINT_AGENT_API_BASE=http://127.0.0.1:4202/api PRINT_AGENT_TOKEN=… PRINT_AGENT_DRY_RUN=1 python3 scripts/print-agent/print_agent.py` and enqueue via Orders → Print kitchen / invoice (`docs/0070-hardware-printing.md`) |
| `test:feedback-public-i18n` | `scripts/test-feedback-public-i18n.mjs` (public `/feedback/:tenant` and `?token=`; locale picker en/de/fr/es/ca/zh-CN/hi; invalid `/feedback/0`; no raw `FEEDBACK.*` in DOM; document titles localized) |
| `test:guest-feedback-staff` | `scripts/test-guest-feedback-staff.mjs` (staff `/guest-feedback`: login → shell + list GET; empty OK; no raw `FEEDBACK.*`; needs `LOGIN_*` / `DEMO_LOGIN_*`) |
| `test:landing-provider-links` | `scripts/test-landing-provider-links.mjs` |
| `test:provider-register` | `scripts/test-provider-register.mjs` |
| `test:customer-register-login` | `scripts/test-customer-register-login.mjs` |
| `test:talk` | `scripts/test-talk.mjs` (staff `/talk`: typed `kitchen` → `/kitchen`; needs `LOGIN_*` / `DEMO_LOGIN_*`) |
| `test:provider-add-product` | `scripts/test-provider-add-product.mjs` |
| `test:catalog` | `scripts/test-catalog.mjs` |
| `test:order-8-status` | `scripts/test-order-8-status.mjs` |
| `test:review-order-edit` | `scripts/review-order-edit-puppeteer.mjs` (staff Orders: Edit button, edit modal, status popover z-index; needs `LOGIN_*` / `DEMO_LOGIN_*`) |
| `test:register-page` | `scripts/test-register-page.mjs` |
| `test:guided-signup-wizard` | `scripts/test-guided-signup-wizard.mjs` (guided `/register` wizard: step 0 intro → Get started → account fields + Back/Next; no tenant create) |
| `test:reports` | `scripts/test-reports.mjs` (Reports page smoke; owner/admin) |
| `test:order-tip-flows` | `scripts/test-order-tip-flows.mjs` (Settings tip entry mode + Reports tips card; owner/admin) |
| `test:changelog` | `scripts/test-changelog.mjs` (Dashboard What's new → changelog modal; API serves CHANGELOG.md) |
| `test:settings-providers` | `scripts/test-settings-providers.mjs` (Settings → Providers tab; personal providers smoke; uses .env, tenant=1) |
| `test:bartender-role` | `scripts/test-bartender-role.mjs` (Users → Add user → role dropdown includes Bartender) |
| `test:kitchen-status-dropdown` | `scripts/test-kitchen-status-dropdown.mjs` (Kitchen display: status dropdown visible, not clipped) |
| `test:bar-display` | `scripts/test-bar-display.mjs` (Bar display `/bar`: route + chrome + Bar title) |
| `test:settings-logo` | `scripts/test-settings-logo-upload.mjs` (Settings logo upload; owner/admin `LOGIN_*` / `DEMO_LOGIN_*`) |
| `test:support-access` | `scripts/test-support-access.mjs` (Users → Add Satisfecho support pre-fills `support@satisfecho.de`; admin/owner) |
| `test:kitchen-timer` | `scripts/test-kitchen-timer.mjs` (Kitchen `/kitchen`: Timer settings + Waiting timer when orders exist) |
| `test:book-whatsapp` | `scripts/test-book-whatsapp-puppeteer.mjs` (public `/book/1` WhatsApp CTA; optional `API_BASE`; no login) |
| `test:my-shift-clock-qr` | `scripts/test-my-shift-clock-qr.mjs` (My shift venue clock QR / `.scan-cta`; waiter `LOGIN_*` + optional `OWNER_*`) |
| `test:rate-limit` | `scripts/test-rate-limit.mjs` (API rate limiting: login 5/15min, register 3/hour; expects 429 after limit) |
| `test:rate-limit-puppeteer` | `scripts/test-rate-limit-puppeteer.mjs` (Puppeteer: login page, 6 wrong attempts, expects error banner) |
| `test:paywall` | `scripts/test-paywall.mjs` (SaaS hard paywall: register → `/paywall` → Start free trial → dashboard; skips exit 0 when `SAAS_PAYWALL_ENABLED=false`) |
| `test:platform-operator` | `scripts/test-platform-operator.mjs` (platform `/platform/login` → dashboard metrics → tenant detail delivery link; `PLATFORM_OPERATOR_*`; seed `ensure_platform_operator`; see `docs/0015`) |
| `test:waiting-list` | `scripts/test-waiting-list.mjs` (public `/waitlist/:tenant` join → success; staff Reservations → Waitlist tab + GET `/waiting-list`) |
| `test:restaurant-groups` | `scripts/test-restaurant-groups.mjs` (Settings → Restaurant group tab; create/join or member/leave UI; owner/admin) |
| `test:order-comments` | `scripts/test-order-comments.mjs` (public Take Away menu: item + order comments → kitchen `.item-notes` / `.order-notes`; needs `LOGIN_*` / `DEMO_LOGIN_*`) |
| `test:courier-actions` | `scripts/test-courier-actions.mjs` (courier portal status actions; `COURIER_EMAIL` / `COURIER_PASSWORD`, defaults `courier-test-phase1@amvara.de` / `secret` — also in `config.env.example`) |
| `test:delivery-checkout` | `scripts/test-delivery-checkout.mjs` (public `/delivery/:tenantId` menu → cart → address → create; no login; see `docs/0053`) |
| `test:delivery-track` | `scripts/test-delivery-track.mjs` (public `/delivery/:tenantId/track` invalid-token / error-state; see `docs/0053`) |
| `test:staff-delivery` | `scripts/test-staff-delivery.mjs` (staff `/staff/orders`: create Satisfecho Delivery + edit address/phone; needs `LOGIN_*` / `DEMO_LOGIN_*`) |
| `test:api-docs` | `scripts/test-api-docs.mjs` (Swagger `/api/docs` + OpenAPI; no login) |
| `test:websocket` | `scripts/test-websocket.mjs` (post-login WS on `/orders`; needs ws-bridge + `LOGIN_*` / `DEMO_LOGIN_*`) |
| `test:amvara9-smoke` | `scripts/test-amvara9-smoke.mjs` (prod smoke: landing/login/book + `/api/health`; **default `BASE_URL=https://www.satisfecho.de`**) |
| `test:menu-logo` | `scripts/test-menu-logo.mjs` (customer `/menu/:token` shows restaurant logo; needs `LOGIN_*` or `TABLE_TOKEN`) |
| `test:settings-contact-tax` | `scripts/test-settings-contact-tax-dropdown.mjs` (Settings → Contact default tax IVA options; needs `LOGIN_*` / `DEMO_LOGIN_*`) |
| `test:staff-menu-link` | `scripts/test-staff-menu-link-puppeteer.mjs` (staff Open menu → place order without PIN modal; needs open order + `LOGIN_*`) |

---

## Backend / data checks (non-Puppeteer)

- **Demo tables:** `docker compose exec back python -m app.seeds.check_demo_tables` (exit 0 = T01–T10 present for tenant 1).
- **Overbooking 0025 (one empty table / full slot):** `docker compose exec back python -m app.seeds.check_overbooking_0025` (exit 0 = pass; creates/cleanup test data). Unittest: `docker compose exec back python -m tests.test_overbooking_0025 -v`. Scenario notes: `docs/0058-test-scenario-one-empty-table.md` (demo seats = 5×4 + 5×2 = 30).
- **Seed tables:** `docker compose exec back python -m app.seeds.seed_demo_tables` (idempotent).
- **Seed demo products:** `docker compose exec back python -m app.seeds.seed_demo_products` (idempotent; fills missing DEMO_PRODUCTS names on partial tenants).
- **Import products CSV (migration #321):** dry-run then apply — see [0062-pos-migration-import.md](0062-pos-migration-import.md). Example: `docker compose exec back python -m app.seeds.import_products_csv --tenant-id 1 --csv /app/fixtures/migration/sample_products.csv --dry-run`. Tests: `docker compose exec back python3 -m pytest tests/test_import_products_csv.py -q`.
- **Demo products check:** `docker compose exec back python -m app.seeds.check_demo_products` (exit 0 = tenant 1 has all DEMO_PRODUCTS names; extra catalog rows OK).
- **Link demo products to catalog (images on /products):** `docker compose exec back python -m app.seeds.link_demo_products_to_catalog` — links products without images to provider products that have images; deploy runs this after catalog imports.
- **Clear orphan provider product images:** `docker compose exec back python -m app.seeds.clear_orphan_provider_product_images` — sets `ProviderProduct.image_filename` (and Product `providers/...` refs) to null when the file is missing under `uploads/providers/`, so catalog stops requesting 404 URLs.
- **Sync Product images after catalog import:** `docker compose exec back python -m app.seeds.sync_product_images` — repairs stale `Product.image_filename` from linked `TenantProduct`/provider files (safe for custom tenant uploads). Deploy runs this automatically.
- **Product image health (deploy):** `docker compose exec back python -m app.seeds.check_product_image_health` — fails when public menu shows an image for a linked product but `/products` would not (tenant 1 by default).
- **Demo courier user:** `docker compose exec back python -m app.seeds.seed_demo_courier_user` — ensures tenant 1 has one `courier` role user when missing (`COURIER_EMAIL` / `COURIER_PASSWORD`, defaults `courier-test-phase1@amvara.de` / `secret`). Bootstrap / `reset_demo_data` run this **before** demo orders so Delivery samples can assign courier / `out_for_delivery`.
- **Demo orders (Reports + Delivery):** `docker compose exec back python -m app.seeds.seed_demo_orders` — seeds tenant 1 with paid/active **table** orders over ±90 days plus a small Satisfecho Delivery mix; idempotent (skips if orders exist). Bootstrap / `reset_demo_data` run this. Optional: `./run_seeds.sh --demo-orders` from `back/`.
- **Demo delivery orders check:** `docker compose exec back python -m app.seeds.check_demo_delivery_orders` (exit 0 = tenant 1 has ≥1 `order_channel=satisfecho_delivery` row; soft-warns if none have `courier_user_id`).
- **Demo waiting list:** `docker compose exec back python -m app.seeds.seed_demo_waiting_list` — seeds tenant 1 with a few `waiting` + one `notified` entry for staff Waitlist / public `/waitlist/1`; idempotent (skips if entries exist). Bootstrap / `reset_demo_data` run this.
- **Demo waiting list check:** `docker compose exec back python -m app.seeds.check_demo_waiting_list` (exit 0 = tenant 1 has ≥1 `waiting` and ≥1 `notified` row).
- **Demo delivery fee/zone:** `docker compose exec back python -m app.seeds.seed_demo_delivery_settings` — sets tenant 1 fee (250¢) + postal codes when unset; idempotent. Bootstrap / `reset_demo_data` run this.
- **Demo delivery settings check:** `docker compose exec back python -m app.seeds.check_demo_delivery_settings` (exit 0 = tenant 1 has non-zero fee and/or postal/radius).

See `AGENTS.md` for full seed and deploy notes.

### i18n locale leaf parity (`en.json` vs siblings)

When adding ngx-translate keys, every shipped locale under `front/public/i18n/*.json` should gain the same **leaf** keys as `en.json`. Run this standalone check (Python stdlib only; no npm packages):

```bash
python3 scripts/check-i18n-locale-parity.py
# Sample more missing paths: python3 scripts/check-i18n-locale-parity.py --sample 20
# Report drift without failing (optional CI / loop soft mode):
#   I18N_PARITY_WARN_ONLY=1 python3 scripts/check-i18n-locale-parity.py
#   # or: python3 scripts/check-i18n-locale-parity.py --warn-only
```

Exit **0** when all locales match; exit **1** when any locale is missing keys present in `en.json` (prints per-locale counts and a short sample of missing dotted paths). Extra keys in a locale (not in `en.json`) are reported as `extra=` but do not fail the check. Not wired into deploy; `go-ahead-loop.sh` may run it in warn-only mode when `I18N_PARITY_CHECK=1`.

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
| `I18N_PARITY_CHECK` | unset | Set to `1` to also run **`scripts/check-i18n-locale-parity.py`** in warn-only mode (logs drift; does not fail the loop). |
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
| **Tables** | `test-tables-page.mjs`, `test-tables-waiter-assignment.mjs` (optional waiter creds) | View toggle, Table view and data table; waiter assignment visibility (no empty dropdown). |
| **Landing** | Version, provider links | Version bar; footer links to provider login/register. |
| **Provider portal** | Register, add-product, landing links | No dedicated “login only” test; add-product covers login + dashboard. |
| **Staff auth** | Register page content, guided wizard, full register | Who-is-this-for; guided step 0→1 (no create); full registration (no cleanup). |
| **Orders** | Order #8 status dropdown; `test:review-order-edit` (Edit button, order edit modal, status popover) | Order #8: requires existing order in Active Orders. Review script: login, /staff/orders, card + History Edit, status dropdown z-index. |
| **Reports** | `test-reports.mjs` | Smoke: page loads (owner/admin). |
| **Tips (POS)** | `test-order-tip-flows.mjs` | Settings Payments tip mode toggle + Reports tips summary card. |
| **Users / Bartender role** | `test-bartender-role.mjs` | Admin/owner: /users → Add user → role dropdown includes Bartender. |
| **Kitchen / Bar display** | `test-kitchen-status-dropdown.mjs`, `test-bar-display.mjs`, `test-order-comments.mjs` | Status dropdown on `/kitchen`; `/bar` route + chrome + Bar title; guest item/order comments highlighted. |
| **Catalog** | `test-catalog.mjs` | Cards and image placeholders. |
| **Menu (customer)** | `test:menu-logo`, `test:order-comments` | Logo on `/menu/:token`; Take Away comments → kitchen. |
| **WebSocket** | `test:websocket` | Post-login WS (ws-bridge required). |
| **API docs** | `test:api-docs` | `/api/docs` Swagger + OpenAPI (no login). |
| **amvara9 prod smoke** | `test:amvara9-smoke` | Default BASE_URL is production (`www.satisfecho.de`). |
| **Settings contact tax** | `test:settings-contact-tax` | Default tax dropdown has IVA options. |
| **Staff menu link** | `test:staff-menu-link` | Open menu from staff orders skips PIN. |
| **Rate limiting** | `test-rate-limit.mjs`, `test-rate-limit-puppeteer.mjs` | API: 429 after limit; Puppeteer: login page shows error banner (e.g. "Too many login attempts") when rate limited. See `docs/0020-rate-limiting-production.md` for all limits (login, register, payment, public menu, upload, admin). |
| **SaaS signup paywall** | `test-paywall.mjs` | Requires `SAAS_PAYWALL_ENABLED=true` (see `docs/0052-saas-signup-paywall.md`). Registers a new tenant, asserts `/paywall` + localized copy (no raw `PAYWALL.*`), starts free trial, confirms `/dashboard` unlocks. Skips with exit 0 when paywall is off; set `REQUIRE_PAYWALL=1` to fail instead. |
| **Platform operator** | `test-platform-operator.mjs` | `/platform/login` → dashboard metrics → tenant detail + `/delivery/{id}` link (`docs/0059-platform-operator-portal.md`). Seed with `ensure_platform_operator`; `PLATFORM_OPERATOR_EMAIL` / `PLATFORM_OPERATOR_PASSWORD`. |

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

### SaaS signup paywall

Hard paywall for new restaurant signups when `SAAS_PAYWALL_ENABLED=true` (see `docs/0052-saas-signup-paywall.md`). Registers a fresh tenant via API, logs in, asserts `/paywall` with localized copy (no raw `PAYWALL.*` keys), clicks **Start free trial**, and confirms `/dashboard` unlocks.

```bash
# Paywall off (default): exits 0 with SKIP message
BASE_URL=http://127.0.0.1:4202 npm run test:paywall --prefix front

# Full path — set SAAS_PAYWALL_ENABLED=true in config.env, recreate back with env-file, then:
docker compose --env-file config.env -f docker-compose.yml -f docker-compose.dev.yml up -d back
BASE_URL=http://127.0.0.1:4202 REQUIRE_PAYWALL=1 npm run test:paywall --prefix front
# Restore SAAS_PAYWALL_ENABLED=false afterward for normal local/demo.
```

- **Env:** `BASE_URL`, `HEADLESS`, `REQUIRE_PAYWALL` (fail instead of skip when disabled), optional `REGISTER_EMAIL` / `REGISTER_PASSWORD`. Creates a real tenant row (no cleanup).

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
