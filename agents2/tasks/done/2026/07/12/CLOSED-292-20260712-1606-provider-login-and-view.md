---
## Closing summary (TOP)

- **What happened:** Issue #292 requested a platform-operator login and read-only dashboard for SaaS-level metrics (tenants, sign-ups, logins), separate from provider and tenant-staff portals.
- **What was done:** Added `platform_operator` role with `?scope=platform` auth, `login_event` table and migration, read-only `/platform/metrics` API, Angular `/platform/login` and dashboard UI, operator seed, and `docs/0015-platform-operator-portal.md`.
- **What was tested:** Migration, operator seed, API login/metrics, Puppeteer dashboard flow, Angular build health, and tenant-staff 403 isolation — all **PASS**.
- **Why closed:** All tester pass criteria met; platform operator portal is functional end-to-end and ready for onboarding via seed + env.
- **Closed at (UTC):** 2026-07-12 16:16
---

# Platform operator dashboard (tenants, logins, sign-ups)

## GitHub Issues
- **Issue:** https://github.com/satisfecho/pos/issues/292
- **292**

## Problem / goal

As the **SaaS platform operator** (not a restaurant tenant or product supplier), we need a way to **log in and view platform-level metrics**, including:

- Number of clients / tenants
- Logins (activity)
- Sign-ups (new tenant registrations)

The issue title mentions “provider login and view”, but the ask is **platform administration / operator visibility**, distinct from the existing **provider portal** (`/provider`, see **`docs/0014-provider-portal.md`**) and from **tenant staff** login.

Design and implement the smallest viable operator experience: auth model, routes, API endpoints (tenant-scoped data must not leak across tenants), and a read-only dashboard for the metrics above.

## High-level instructions for coder

- Review existing auth (`User` roles, JWT scopes, `/token`) and multi-tenant patterns in **`back/`** and **`front/`**; identify whether a **platform operator** role already exists or must be added.
- Propose a dedicated login route (e.g. `/platform/login` or `/admin`) and protected dashboard route; do **not** reuse provider or tenant staff flows without clear separation.
- Backend: add read-only endpoints for operator metrics (tenant count, recent sign-ups, login/audit events if available). Preserve tenant isolation — operator sees aggregates, not cross-tenant PII unless explicitly required and authorized.
- Frontend: simple dashboard page listing the three metric areas; follow existing Angular patterns and i18n (`front/public/i18n/`).
- Document the operator setup (how to create the first operator user, env/secrets) in **`docs/`** if new configuration is needed.
- Smoke-test: app responds 200; operator login and dashboard load without Angular build errors (`docker logs --since 10m pos-front`).
- Append **Testing instructions** when implementation is complete.

## Implementation summary

- Added **`platform_operator`** role, JWT flag `is_platform_operator`, and login scope **`?scope=platform`**.
- New **`login_event`** table records successful logins (all scopes) for operator metrics.
- Backend: **`GET /platform/me`**, **`GET /platform/metrics`** (read-only aggregates, no PII).
- Frontend: **`/platform/login`**, **`/platform`** dashboard with metric cards and recent tenants/logins tables.
- Seed: **`python -m app.seeds.ensure_platform_operator`** (env: `PLATFORM_OPERATOR_EMAIL`, `PLATFORM_OPERATOR_PASSWORD`).
- Docs: **`docs/0015-platform-operator-portal.md`**.

## Testing instructions

1. **Migration:** `docker compose exec back python -m app.migrate` (applies `20260712180000_platform_operator_login_events.sql`).

2. **Create operator user:**
   ```bash
   docker compose exec -e PLATFORM_OPERATOR_EMAIL=ops@yourcompany.de \
     -e PLATFORM_OPERATOR_PASSWORD='your-secure-password' \
     back python -m app.seeds.ensure_platform_operator
   ```

3. **API smoke (optional):**
   ```bash
   curl -s -c /tmp/pf.txt -X POST "http://127.0.0.1:4202/api/token?scope=platform" \
     -H "Content-Type: application/x-www-form-urlencoded" \
     -d "username=ops@yourcompany.de&password=your-secure-password"
   curl -s -b /tmp/pf.txt http://127.0.0.1:4202/api/platform/metrics
   ```
   Expect JSON with `tenant_count`, `signups_last_30_days`, `logins_last_24_hours`, `recent_tenants`, `recent_logins`.

4. **Frontend build:** `docker logs --since 10m pos-front | grep -iE "error|failed"` — no TS/NG errors.

5. **Puppeteer:** from `front/`:
   ```bash
   BASE_URL=http://127.0.0.1:4202 \
     PLATFORM_OPERATOR_EMAIL=ops@yourcompany.de \
     PLATFORM_OPERATOR_PASSWORD='your-secure-password' \
     node scripts/test-platform-operator.mjs
   ```
   Expect `OK: platform operator login and dashboard`.

6. **Manual:** open `http://127.0.0.1:4202/platform/login`, sign in, confirm dashboard shows four metric cards and tables.

7. **Isolation:** sign in as tenant staff at `/login` — `/platform/metrics` must return 403.

## Test report

1. **Date/time (UTC):** 2026-07-12 16:15–16:17 UTC (log window: same period).

2. **Environment:** `docker-compose.yml` + `docker-compose.dev.yml`; `BASE_URL=http://127.0.0.1:4202`; branch `development` (synced). Operator seed: `platform-test@amvara.de` (matches `test-platform-operator.mjs` defaults). Staff isolation: tenant-1 owner `ralf@roeber.de` with temporary local test password (DB only, not committed — `.env` demo creds stale, consistent with prior tester runs).

3. **What was tested:** Migration `20260712180000_platform_operator_login_events.sql`, operator seed, platform-scoped API login/metrics, Angular build health, Puppeteer operator flow, tenant-staff isolation on `/platform/metrics`.

4. **Results:**
   - Migration applied (`schema version 20260712180000`) — **PASS**.
   - Operator seed (`ensure_platform_operator`) — **PASS** (`Updated platform operator: platform-test@amvara.de`).
   - API `POST /api/token?scope=platform` → 200; `GET /api/platform/metrics` returns `tenant_count`, `signups_last_30_days`, `logins_last_24_hours`, `recent_tenants`, `recent_logins` — **PASS**.
   - Front build: transient TS errors during hot-reload at 16:09:42–16:09:46, then `Application bundle generation complete` at 16:09:48; no errors in last 5m — **PASS**.
   - Puppeteer `test-platform-operator.mjs` → `OK: platform operator login and dashboard` (4 metric cards) — **PASS**.
   - Isolation: tenant staff `POST /api/token?tenant_id=1` → 200; `GET /api/platform/metrics` → **403** `Platform operator account required` — **PASS**.

5. **Overall:** **PASS** (all criteria met).

6. **Product owner feedback:** Platform operator portal is functional end-to-end: dedicated login scope, read-only metrics API with aggregates (no PII leak in response shape tested), dashboard renders metric cards, and tenant staff are correctly denied platform endpoints. Ready for operator onboarding via seed + env docs.

7. **URLs tested:**
   1. `http://127.0.0.1:4202/platform/login`
   2. `http://127.0.0.1:4202/platform` (post-login dashboard)
   3. `http://127.0.0.1:4202/api/token?scope=platform`
   4. `http://127.0.0.1:4202/api/platform/metrics`
   5. `http://127.0.0.1:4202/api/token?tenant_id=1` (staff isolation)

8. **Relevant log excerpts:**
   ```
   pos-front: Application bundle generation complete. [0.499 seconds] - 2026-07-12T16:09:48.684Z
   pos-back: POST /token?scope=platform HTTP/1.1" 200 OK
   pos-back: GET /platform/metrics HTTP/1.1" 200 OK
   pos-back: GET /platform/metrics HTTP/1.1" 403 Forbidden
   ```
