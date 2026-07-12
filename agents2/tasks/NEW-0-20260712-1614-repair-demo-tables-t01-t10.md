# Repair demo tables T01–T10 for tenant 1

## GitHub Issues
- **Issue:** (none — enhancement reviewer)
- **0**

## Problem / goal

Tenant 1 demo tables are out of spec: landing **Take Away** demos, Puppeteer scripts (`test-demo-data.mjs`, reservation flows), and `check_demo_tables` all assume **T01–T10** with fixed seat counts. A failing check blocks confidence in demo hygiene and agent preflight.

## Evidence (008 preflight / review)

- `SIGNAL demo_tables_check=fail (run seed_demo_tables)`
- `docker compose … exec back python -m app.seeds.check_demo_tables` output:
  - Missing: **T05**, **T07**, **T10**
  - Wrong `seat_count`: **T08** (expected 2, got 6)
- Checker: `back/app/seeds/check_demo_tables.py`; idempotent seeder: `back/app/seeds/seed_demo_tables`

## High-level instructions for coder

- Run `docker compose -f docker-compose.yml -f docker-compose.dev.yml exec back python -m app.seeds.seed_demo_tables` and re-run `check_demo_tables` — if that alone fixes dev, document that deploy/amvara9 should run the same after DB refresh.
- If seed is wrong or incomplete (e.g. T08 seat count not corrected), fix **`seed_demo_tables`** so it idempotently creates missing T01–T10 and updates wrong `seat_count` without breaking existing table tokens/orders.
- Ensure **Take Away** table (tenant 1) still exists per `AGENTS.md` demo tables section.
- Pass criteria: `check_demo_tables` exits **0** on dev; `BASE_URL=http://127.0.0.1:4202 node front/scripts/test-demo-data.mjs` still passes with demo credentials if available.
- Append **Testing instructions** when implementation is complete.
