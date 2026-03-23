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
