# PostgreSQL: user insert fails — `user_role` vs `userrole` enum mismatch

## GitHub
- **Issue:** (none — from log review)

## Problem / goal
PostgreSQL logged **`column "role" is of type user_role but expression is of type userrole`** on **`INSERT INTO "user"`** (bulk VALUES shape). This indicates the ORM/driver is binding the wrong enum type name for the **`role`** column. **`agents/tasks/done/2026/03/23/CLOSED-20260323-1132-billing-customer-birth-date-missing.md`** noted this once at **2026-03-23 10:23:18 UTC** and deferred investigation.

## Evidence (UTC)
- **`pos-postgres` logs:** **2026-03-23 10:23:18.339 UTC** — `ERROR` on `INSERT INTO "user"` with `p4::userrole` vs column type **`user_role`**.

## High-level instructions for coder
- Reproduce: trace what issues that INSERT (app registration, seeds, pytest, or migration); grep models/migrations for **`user_role`** / **`UserRole`** / enum registration in SQLAlchemy and Alembic/SQL migrations.
- Align PostgreSQL enum type and SQLAlchemy **`Enum`** so inserts use the same type name the column expects (cast or rename type consistently; follow project migration patterns).
- Add or extend a test that inserts a **`user`** with each role value if missing; confirm no **`ProgrammingError`** in **`pos-back`** / **`pos-postgres`** after fix.

## Coder notes (implementation)
- **`back/app/models.py`:** `User.role` now uses SQLAlchemy **`Enum(..., name="user_role", native_enum=True, create_type=False, values_callable=...)`** so bound parameters use the existing PostgreSQL type from migrations (`user_role`), not the default `userrole` label derived from the Python class name.
- **`back/tests/test_user_role_pg_enum.py`:** Inserts one user per **`UserRole`** (tenant-scoped roles + **`provider`** with **`provider_id`**) inside a rolled-back Postgres session (**`PgClientTestCase`**).

---

## Testing instructions

### What to verify
- Inserts into **`"user"`** with every **`UserRole`** value succeed against PostgreSQL (no **`user_role` vs `userrole`** type error).
- Existing staff/session tests that create users still pass.

### How to test
From repo root, with stack up (`docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d`):

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml exec -T back \
  python3 -m pytest /app/tests/test_user_role_pg_enum.py /app/tests/test_work_session.py -q --tb=short
```

Optional: watch **`pos-postgres`** logs during registration or seeds — no related **`ProgrammingError`**.

### Pass/fail criteria
- **Pass:** `test_user_role_pg_enum` and `test_work_session` complete with exit code **0**.
- **Fail:** Any **`column "role" is of type user_role but expression is of type userrole`** (or pytest errors) from user inserts.

---

## Test report

1. **Date/time (UTC) / log window:** **2026-03-23 12:24:24 UTC** (verification run). Postgres log sample: `docker logs pos-postgres` tail ~80 lines (includes historical **2026-03-23 10:23:18 UTC** ERROR from pre-fix incident; no new `userrole` vs `user_role` lines observed after pytest run in that window beyond that historical entry).

2. **Environment:** `docker-compose.yml` + `docker-compose.dev.yml`; **`BASE_URL`:** N/A (no browser); branch **`development`**, commit **`7430fb1`**.

3. **What was tested:** Per **What to verify**: all **`UserRole`** inserts against PostgreSQL via **`test_user_role_pg_enum`**; staff/session user creation via **`test_work_session`**.

4. **Results:**
   - Inserts for every **`UserRole`** without enum type mismatch: **PASS** — `2 passed in 2.65s` from pytest (includes **`test_user_role_pg_enum`** coverage).
   - **`test_work_session`** still passes: **PASS** — same pytest invocation, exit code **0**.

5. **Overall:** **PASS**.

6. **Product owner feedback:** User registration and role assignment against PostgreSQL should no longer hit the **`userrole` vs `user_role`** binding error. The new enum test gives a clear regression guard if the ORM mapping drifts again.

7. **URLs tested:** **N/A — no browser**.

8. **Relevant log excerpts:**
   - **pytest (back container):** `.. [100%]` / `2 passed in 2.65s`
   - **pos-postgres (tail, context):** Historical line documents the original failure mode (`p4::userrole` vs column `user_role`); current pytest run produced no new matching ERROR in the sampled tail (inserts exercised successfully via tests above).
