# Repair demo tables T01–T10 for tenant 1

## GitHub Issues
- **Issue:** (none — enhancement reviewer)
- **0**

## Problem / goal

Tenant 1 demo tables are out of spec: landing **Take Away** demos, Puppeteer scripts (`test-demo-data.mjs`, reservation flows), and `check_demo_tables` all assume **T01–T10** with fixed seat counts. A failing check blocks confidence in demo hygiene and agent preflight.

## Evidence (008 preflight / review)

- `SIGNAL demo_tables_check=fail (run seed_demo_tables)`
- `docker compose … exec back python -m app.seeds.check_demo_tables` output (still failing as of **2026-07-22T12:59Z** 008 re-check):
  - Missing: **T05**, **T07**, **T10**
  - Wrong `seat_count`: **T08** (expected 2, got 6)
- Checker: `back/app/seeds/check_demo_tables.py`; seeder: `back/app/seeds/seed_demo_tables`
- **Root cause (008):** `seed_demo_tables.run()` only calls `_seed_tenant_tables` for tenants with **zero** tables. Tenant 1 already has a partial set, so a plain `python -m app.seeds.seed_demo_tables` **skips** tenant 1 (while still seeding empty tenants). `_seed_tenant_tables` already knows how to create missing names and fix wrong `seat_count`, but `run()` never invokes it for partial tenants.

## High-level instructions for coder

- Fix **`seed_demo_tables.run()`** so tenant **1** (and preferably any tenant missing T01–T10 or with wrong seats) is repaired via `_seed_tenant_tables`, not only empty tenants. Keep idempotent; do not delete tables or break tokens/orders.
- Align the module docstring with behaviour (it currently says it does not change existing tables, but seat updates are intended).
- Re-run `check_demo_tables` until exit **0** on dev; document that deploy/amvara9 should run the same after DB refresh.
- Ensure **Take Away** table (tenant 1) still exists per `AGENTS.md` demo tables section.
- Pass criteria: `check_demo_tables` exits **0** on dev; `BASE_URL=http://127.0.0.1:4202 node front/scripts/test-demo-data.mjs` still passes with demo credentials if available.
- Append **Testing instructions** when implementation is complete.
