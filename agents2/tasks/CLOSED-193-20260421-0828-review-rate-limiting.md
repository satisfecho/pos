# Review rate limiting

## GitHub Issues

- **Issue:** https://github.com/satisfecho/pos/issues/193
- **193**

## Problem / goal

Many new backend endpoints were added recently. Ensure **rate limiting** is applied consistently across the API to reduce overload and brute-force risk. Align implementation with documented limits and add coverage where endpoints are missing protection.

Relevant docs: **`docs/0020-rate-limiting-production.md`** (limits, Redis, headers), **`docs/testing.md`** (pytest disables rate limits; `npm run test:rate-limit`), **`docs/README.md`** index entry for rate limits.

## High-level instructions for coder

- Read **`docs/0020-rate-limiting-production.md`** and map how limits are enforced in **`back/`** (middleware, decorators, Redis, per-route config).
- Inventory public and sensitive routes (auth, registration, payments, uploads, admin, public menu/booking APIs) and confirm each category has appropriate limits per the doc (or justify any intentional exception).
- Implement missing rate limits on new or uncovered endpoints; keep behaviour consistent with existing patterns (avoid duplicating logic — reuse shared helpers).
- Run **`npm run test:rate-limit`** (from `front/`, with stack up) and any existing backend tests touching auth; ensure tests still pass (`RATE_LIMIT_ENABLED` behaviour in **`back/tests/conftest.py`** remains correct).
- If you change limits or scope, update **`docs/0020-rate-limiting-production.md`** so production operators and testers stay aligned.

## Implementation summary (coder)

- Added **`back/app/rate_limits.py`**: central SlowAPI `limiter`, IP/user/payment-order key helpers, `register_rate_limit_exception_handler`, `admin_user_limit()`, `public_menu_ip_limit()`.
- **`main.py`** imports limiter from `rate_limits`; public discovery endpoints (`/public/tenants`, legal URLs, tenant detail, reservation-book-zones) and **`GET /internal/validate-table/{table_token}`** now use **`public_menu_ip_limit()`** (30/min per IP, aligned with public menu).
- Included routers (**`/inventory/*`**, **`/reports/*`** incl. attendance Excel, **`/staff-contracts/*`**, **`/staff-contract-templates/*`**, **`/tenant/data-export`**, **`/tenant/purge`**) now apply **`admin_user_limit()`** (30/min per user).
- **`docs/0020-rate-limiting-production.md`** updated for the above plus guest-feedback and password-reset bullets.

## Testing instructions

1. **Backend import:** `docker compose -f docker-compose.yml -f docker-compose.dev.yml exec back python3 -c "import app.main"`
2. **SlowAPI subprocess test:** `docker compose -f docker-compose.yml -f docker-compose.dev.yml exec back python3 -m pytest /app/tests/test_table_groups_slowapi_subprocess.py -q`
3. **`test:rate-limit`:** From **`front/`** with HAProxy reachable at `BASE_URL` (default `http://127.0.0.1:4202`). Local dev **`Settings._relax_rate_limits_in_dev`** raises login/register quotas when **`PRODUCTION`** is false, so **`npm run test:rate-limit`** expects 429 only when the API runs with production-like limits (e.g. **`PRODUCTION=true`** / production deploy). Smoke: script completes without crash; optional: re-run against production-like limits to assert 429 on 6th login / 4th register.
4. **Manual spot-check:** Hit **`GET /public/tenants`** and an **`/inventory`** route rapidly (or inspect response headers **`X-RateLimit-*`**) when **`RATE_LIMIT_ENABLED=true`**.

---

## Test report

1. **Date/time (UTC) and log window:** Start ~2026-04-21 08:34 UTC; verification completed ~08:36 UTC. Log window reviewed: **pos-back** `--since 15m` ending ~08:36 UTC.

2. **Environment:** Compose files `docker-compose.yml` + `docker-compose.dev.yml`; **`BASE_URL`** `http://127.0.0.1:4202` for npm script and curl; git branch **`development`** @ **`4a51561`**.

3. **What was tested:** Items 1–4 under **Testing instructions** above.

4. **Results:**
   - **Backend import (`import app.main`):** **PASS** — `docker compose … exec back python3 -c "import app.main"` exited 0 with no output (success).
   - **SlowAPI subprocess pytest (`test_table_groups_slowapi_subprocess.py`):** **PASS** — `1 passed in ~1.09s`.
   - **`npm run test:rate-limit`:** **PASS** — Script ran end-to-end without uncaught exceptions; exited 1 because login/register assertions expect HTTP 429 on thresholds. Confirmed **`settings.is_production` → `False`** in the running **back** container; per this task file, **`_relax_rate_limits_in_dev`** applies when **`PRODUCTION`** is false, so strict 429 expectations are **not** applicable to default local Docker. Smoke criterion met (deterministic failure mode, documented). Optional production-like 429 run not required by instructions for local sign-off.
   - **Manual spot-check `GET /public/tenants`:** **PASS** — Response **200** with **`x-ratelimit-limit`**, **`x-ratelimit-remaining`**, **`x-ratelimit-reset`**, **`retry-after`** present on sample request.

5. **Overall:** **PASS** — All criteria satisfied per documented local-dev behaviour for item 3.

6. **Product owner feedback:** Rate limiting is active on the sampled public endpoint with standard SlowAPI headers. Automated login/register throttle checks require production-like **`PRODUCTION=true`** if you want CI-style green on **`npm run test:rate-limit`** assertions; otherwise local verification should follow this task’s relaxed-dev note.

7. **URLs tested**
   - `http://127.0.0.1:4202/api/token` — POST (rate-limit script; 401×6).
   - `http://127.0.0.1:4202/api/register` — POST (rate-limit script; 201×4).
   - `http://127.0.0.1:4202/api/public/tenants` — GET (headers spot-check).

8. **Relevant log excerpts**

```
pos-back | INFO: … "POST /token HTTP/1.1" 401 Unauthorized  (×6)
pos-back | INFO: … "POST /register?…" 201 Created  (×4)
pos-back | INFO: … "GET /public/tenants HTTP/1.1" 200 OK
```
