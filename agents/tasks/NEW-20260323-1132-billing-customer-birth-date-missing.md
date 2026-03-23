# NEW-20260323-1132-billing-customer-birth-date-missing

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
