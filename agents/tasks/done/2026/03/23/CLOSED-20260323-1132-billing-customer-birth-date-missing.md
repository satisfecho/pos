---
## Closing summary (TOP)

- **What happened:** Long-lived local databases never applied the original `billing_customer.birth_date` migration because it had a lower version than already-applied migrations, so ORM queries hit `UndefinedColumn` and returned HTTP 500 on orders and billing-customer endpoints.
- **What was done:** A repair migration (`20260323160000_billing_customer_birth_date_repair.sql`) was added so pending stacks pick up the column idempotently; the `user_role`/`userrole` insert was not reproduced and was deferred.
- **What was tested:** Migrate to `20260323160000`, `\d billing_customer` for `birth_date`, authenticated `GET /api/orders` and `GET /api/billing-customers`, and back logs for `ProgrammingError`/`birth_date` — all passed.
- **Why closed:** Tester reported **PASS** on all pass/fail criteria.
- **Closed at (UTC):** 2026-03-23 11:37
---

# CLOSED-20260323-1132-billing-customer-birth-date-missing

## Summary

Local Docker stack shows **database schema behind the ORM**: table `billing_customer` lacks column `birth_date` while the application selects it. This surfaces as **HTTP 500** on tenant flows that load billing customers (e.g. **`GET /orders`**, **`GET /billing-customers`**). PostgreSQL logs show the same error repeating on a short interval (polling), from **2026-03-23 10:03 UTC** through at least **10:29 UTC**.

A **single** additional PostgreSQL error appeared at **2026-03-23 10:23:18 UTC**: `column "role" is of type user_role but expression is of type userrole` on **`INSERT INTO "user"`** (bulk insert shape). It did not show a matching line in the sampled `pos-back` access log tail; treat as **secondary** (possible tests/migrate/another client) and confirm whether it reproduces after the primary fix.

## Evidence (UTC)

- **Postgres (`pos-postgres`):** `ERROR: column billing_customer.birth_date does not exist` with `STATEMENT` selecting `billing_customer.birth_date` (by id and by `tenant_id` list).
- **Backend (`pos-back`):** `sqlalchemy.exc.ProgrammingError` / `psycopg.errors.UndefinedColumn` for the same column; **`GET /orders`** and **`GET /billing-customers`** returned **500 Internal Server Error**.
- **Front / HAProxy:** No Angular build failures in recent tail; HAProxy lines observed were **200** responses (no 5xx cluster in the sampled slice).

## GitHub

No open issue was found that explicitly tracks this incident. Optional: open a bug for **migration/schema parity on long-lived local DBs** and link it here.

## Instructions for coder

1. **Reconcile schema** with the current model/migrations for `billing_customer` (including `birth_date`). Prefer the documented path: run **`python -m app.migrate`** (and **`--sync-idempotent`** if the project uses it for repair) against the same database the Docker stack uses, from **`back/`** or **`docker compose exec back`** as in deploy docs.
2. **Verify in Postgres** that `billing_customer` has `birth_date` (and types match the model).
3. **Re-test API:** authenticated **`GET /orders`** and **`GET /billing-customers`** return **200** and no `ProgrammingError` in `pos-back` logs.
4. **If the `user_role` / `userrole` insert error reappears:** trace which client issued it (app vs tests vs seeds); align SQLAlchemy/PostgreSQL enum type naming with the actual column type (`user_role`).

## System behaviour (reviewer)

**Poor** for endpoints depending on `billing_customer` until migrations are applied: hard **500**s and noisy DB logs. **Good** elsewhere in the sampled window (front build, HAProxy).

## Coder notes

- **Root cause:** `20260323120500_billing_customer_birth_date.sql` has a **lower** timestamp than `20260323121000` … `20260323150000`. The runner only applies migrations with `version > MAX(schema_version)`, so DBs that had already applied `20260323121000` or later **never** ran `20260323120500` (confirmed: `schema_version` had no row for `20260323120500` on the dev DB).
- **Fix:** Added `back/migrations/20260323160000_billing_customer_birth_date_repair.sql` — same `ALTER TABLE billing_customer ADD COLUMN IF NOT EXISTS birth_date DATE NULL` with a version **after** `20260323150000`, so pending installs pick it up. Idempotent for DBs that already had the column.
- **`user_role` / `userrole`:** Not reproduced in this pass; leave for a separate task if it appears in app logs.

## Testing instructions

### What to verify

- `billing_customer.birth_date` exists (type `DATE`, nullable).
- Authenticated **`GET /api/orders`** and **`GET /api/billing-customers`** (or paths your proxy uses) return **200**, not 500 / `UndefinedColumn` on `birth_date`.

### How to test

1. From repo root with dev compose:  
   `docker compose -f docker-compose.yml -f docker-compose.dev.yml exec back python -m app.migrate`  
   Expect the new migration to apply once; re-run should report DB up to date.
2. Postgres:  
   `docker compose -f docker-compose.yml -f docker-compose.dev.yml exec db psql -U pos -d pos -c '\d billing_customer'`  
   Confirm `birth_date` column.
3. Optional ORM smoke (inside `back` container): load `BillingCustomer` rows via SQLModel (no error).
4. API: log in as a tenant user in the app or use your usual API test client; call orders list and billing customers list; watch `docker compose … logs --tail=50 back` for `ProgrammingError`.

### Pass/fail criteria

- **Pass:** Migrate applies `20260323160000` once on affected DBs; `\d billing_customer` shows `birth_date`; orders/billing-customer endpoints no longer raise `billing_customer.birth_date does not exist`.
- **Fail:** Column still missing after migrate, or 500s with `UndefinedColumn` for `birth_date` persist.

---

## Test report

### Date/time (UTC) and log window

- **Started:** 2026-03-23 11:36 UTC  
- **Log window reviewed:** `pos-back` last ~10 minutes + tail ~30 lines after API calls (same UTC window).

### Environment

- **Compose:** `docker-compose.yml` + `docker-compose.dev.yml`  
- **BASE_URL:** `http://127.0.0.1:4202` (HAProxy → back)  
- **Branch / commit:** `development` @ `0b20a45`

### What was tested

- Per **Testing instructions**: migrate path, `\d billing_customer`, authenticated **`GET /api/orders`** and **`GET /api/billing-customers`**, back logs for `ProgrammingError` / `birth_date`.

### Results

| Criterion | Result | Evidence |
|-----------|--------|----------|
| `python -m app.migrate` applies repair / DB at expected version | **PASS** | `Database is up to date (version 20260323160000)`; `20260323160000_billing_customer_birth_date_repair.sql` status **applied** |
| `billing_customer.birth_date` exists, type `DATE`, nullable | **PASS** | `psql \d billing_customer` shows `birth_date \| date \| \| \|` (nullable) |
| **`GET /api/orders`** returns 200, no `UndefinedColumn` on `birth_date` | **PASS** | HTTP 200; JSON includes nested `billing_customer` with `"birth_date":null` where applicable |
| **`GET /api/billing-customers`** returns 200, no `UndefinedColumn` | **PASS** | HTTP 200; list entries include `birth_date` field |
| Back logs free of `ProgrammingError` / `birth_date` missing in reviewed window | **PASS** | `docker compose logs --since=10m back` piped through `grep -iE` on `birth_date`, `ProgrammingError`, `UndefinedColumn` → no matches |

### Overall

**PASS** — All pass/fail criteria met.

### Product owner feedback

The repair migration brings long-lived dev databases in line with the ORM so staff can open orders and billing customers without 500 errors. The column is present and nullable; existing rows show `birth_date` as null until edited in the product.

### URLs tested

1. `http://127.0.0.1:4202/api/token?tenant_id=1` (POST, form login)  
2. `http://127.0.0.1:4202/api/orders` (GET)  
3. `http://127.0.0.1:4202/api/billing-customers` (GET)

### Relevant log excerpts

`pos-back` (uvicorn access, via `docker compose … logs --tail=30 back`):

```text
pos-back  | INFO:     172.30.0.3:36012 - "POST /token?tenant_id=1 HTTP/1.1" 200 OK
pos-back  | INFO:     172.30.0.3:36026 - "GET /orders HTTP/1.1" 200 OK
pos-back  | INFO:     172.30.0.3:36040 - "GET /billing-customers HTTP/1.1" 200 OK
```

`app.migrate` (excerpt):

```text
INFO: Database is up to date (version 20260323160000)
```
