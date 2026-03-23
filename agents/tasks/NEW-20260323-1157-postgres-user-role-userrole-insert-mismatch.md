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
