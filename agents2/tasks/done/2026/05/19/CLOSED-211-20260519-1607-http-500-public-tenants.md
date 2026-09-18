---
## Closing summary (TOP)

- **What happened:** `GET /public/tenants` returned HTTP 500 on production because the DB schema lagged behind code after a partial fiscal migration left `tenant.fiscal_mode` missing.
- **What was done:** Made migration `20260501120000_fiscal_invoice_verifactu` idempotent, added `back/tests/test_public_tenants_list.py`, repaired amvara9 tenant fiscal columns and schema version, and recorded the fix in CHANGELOG (#211).
- **What was tested:** Tester **PASS**: pytest (1 passed), local and production `/api/public/tenants` return 200, amvara9 `migrate --check` at `20260501120000`, no `fiscal_mode` errors in back logs.
- **Why closed:** All acceptance criteria met; test report overall **PASS**.
- **Closed at (UTC):** 2026-05-19 16:13
---

# HTTP 500 on GET /public/tenants

## GitHub Issues
- **Issue:** https://github.com/satisfecho/pos/issues/211
- **211**

## Problem / goal

**pos-back** returned **500 Internal Server Error** on **`GET /public/tenants`** (logged as unhandled failure while building the public tenant list). This endpoint is unauthenticated and used for tenant discovery (landing, public flows). A 500 breaks any client that lists tenants before login.

## Root cause (coder)

On **amvara9**, **`schema_version`** was at **`20260427143000`** while code expected **`tenant.fiscal_mode`** (migration **`20260501120000_fiscal_invoice_verifactu`**). **`list_public_tenants`** does **`select(models.Tenant)`**, so SQLAlchemy selected missing columns → **`ProgrammingError: column tenant.fiscal_mode does not exist`**.

Partial state: **`fiscal_invoice`** table already existed (failed mid-migration), tenant fiscal columns did not. First migrate attempt failed on **`CREATE TABLE fiscal_invoice`** duplicate.

## Fix

1. **`back/migrations/20260501120000_fiscal_invoice_verifactu.sql`** — idempotent (**`ADD COLUMN IF NOT EXISTS`**, **`CREATE TABLE IF NOT EXISTS`**, constraint via **`DO $$ … duplicate_object`**).
2. **`back/tests/test_public_tenants_list.py`** — **`GET /public/tenants`** returns **200** and **`TenantSummary`** keys.
3. **Production repair (amvara9):** applied missing tenant columns + **`schema_version`** row **`20260501120000`**. **`https://satisfecho.de/api/public/tenants`** → **200** after repair.
4. **`CHANGELOG.md`** [Unreleased] Fixed entry (#211).

Deploy **`development`** should run **`python -m app.migrate`** so other envs get the idempotent migration; use **`python -m app.migrate --sync-idempotent`** if table exists without tenant columns.

## Testing instructions

1. **pytest:**  
   `docker compose -f docker-compose.yml -f docker-compose.dev.yml exec back python3 -m pytest tests/test_public_tenants_list.py -q`  
   Expect **1 passed**.

2. **Local curl:**  
   `curl -sS -o /dev/null -w "%{http_code}\n" http://127.0.0.1:4202/api/public/tenants`  
   Expect **200**.

3. **Production curl (after migrate/repair):**  
   `curl -sS -o /dev/null -w "%{http_code}\n" https://satisfecho.de/api/public/tenants`  
   Expect **200**.

4. **Pending migration check (prod):**  
   `the production host 'cd the deploy directory && docker compose --env-file config.env -f docker-compose.yml -f docker-compose.prod.yml exec -T back python -m app.migrate --check'`  
   Expect **no pending** migrations (or only unrelated pending after deploy).

5. **Landing smoke (optional):**  
   `cd front && BASE_URL=http://127.0.0.1:4202 npm run test:landing-version`  
   (May fail on unrelated footer semver vs `package.json` if dev container hash is stale; not required for this API-only fix.)

6. **Logs:** No **`fiscal_mode does not exist`** on **`GET /public/tenants`** in **`docker compose … logs back`**.

---

## Test report

1. **Date/time (UTC):** 2026-05-19 16:10–16:12 UTC (log window ~30m back).
2. **Environment:** `docker-compose.yml` + `docker-compose.dev.yml`; branch **`development`** @ `7160354d`; local **`BASE_URL`** via HAProxy `http://127.0.0.1:4202`; production `https://satisfecho.de`.
3. **What was tested:** pytest for `GET /public/tenants`, local/production HTTP status, amvara9 `migrate --check`, back logs for `fiscal_mode` / `ProgrammingError` on public tenants route. Landing smoke skipped (API-only fix; optional per task).
4. **Results:**
   - **pytest `test_public_tenants_list.py`:** **PASS** — `1 passed in 0.82s`.
   - **Local curl `/api/public/tenants`:** **PASS** — HTTP `200`.
   - **Production curl `/api/public/tenants`:** **PASS** — HTTP `200`.
   - **amvara9 `migrate --check`:** **PASS** — `Database is up to date (version 20260501120000)`; all 89 migrations applied; no pending.
   - **Landing smoke (optional):** **N/A** — not run (out of scope for API-only fix).
   - **Logs — no `fiscal_mode` errors:** **PASS** — recent `pos-back` lines show `GET /public/tenants` **200 OK** only; grep found no `fiscal_mode` / `ProgrammingError`.
5. **Overall:** **PASS**
6. **Product owner feedback:** Public tenant discovery is healthy again locally and on production. The idempotent fiscal migration is fully applied on amvara9; unauthenticated clients can list tenants without a 500. No further action needed for this issue unless new envs skip migrate.
7. **URLs tested:** **N/A — no browser** (curl/API only): (1) `http://127.0.0.1:4202/api/public/tenants`, (2) `https://satisfecho.de/api/public/tenants`.
8. **Relevant log excerpts:**

```
$ docker compose … exec back python3 -m pytest tests/test_public_tenants_list.py -q
.                                                                        [100%]
1 passed in 0.82s

$ curl -sS -o /dev/null -w "%{http_code}\n" http://127.0.0.1:4202/api/public/tenants
200

$ curl -sS -o /dev/null -w "%{http_code}\n" https://satisfecho.de/api/public/tenants
200

$ the production host '… python -m app.migrate --check'
INFO: Database is up to date (version 20260501120000)

pos-back  | INFO: … "GET /public/tenants HTTP/1.1" 200 OK
```
