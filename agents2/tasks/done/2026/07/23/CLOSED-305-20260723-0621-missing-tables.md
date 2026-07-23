---
## Closing summary (TOP)

- **What happened:** Tenant 1 demo tables failed `check_demo_tables` (missing T05/T07/T10; T08 wrong seat count) because seed skipped tenants that already had any tables.
- **What was done:** `seed_demo_tables.run()` now repairs every tenant (creates missing T01–T10 names and fixes seat counts); docstring updated; related NEW task superseded.
- **What was tested:** `check_demo_tables` exit 0; seed idempotent; Take Away present; `test-demo-data.mjs` RESULT OK — overall PASS.
- **Why closed:** All acceptance criteria passed.
- **Closed at (UTC):** 2026-07-23 06:29
---

# Missing tables (tenant 1 demo hygiene)

## GitHub Issues
- **Issue:** https://github.com/satisfecho/pos/issues/305
- **305**

## Problem / goal

Tenant 1 demo tables fail `check_demo_tables`: missing **T05**, **T07**, **T10**, and **T08** has wrong `seat_count` (expected 2, got 6). Agent-loop / enhancement preflight and landing Take Away / Puppeteer demo flows assume **T01–T10** with fixed seats (T01–T05 = 4, T06–T10 = 2). Issue asks for this to be fixed.

Related open task (same root cause; do **not** implement twice): **`NEW-0-20260712-1614-repair-demo-tables-t01-t10.md`**. Prefer implementing under this **FEAT-305** (GitHub-tracked) and leave a short note on that NEW that work moved here, or close/supersede the NEW once this FEAT ships.

Docs: `AGENTS.md` (Demo tables), `back/app/seeds/check_demo_tables.py`, `back/app/seeds/seed_demo_tables`.

## High-level instructions for coder

- Confirm current fail with `docker compose … exec back python -m app.seeds.check_demo_tables` (expect missing T05/T07/T10 and wrong T08 seats).
- Fix **`seed_demo_tables.run()`** so tenants with a **partial** T01–T10 set (especially tenant **1**) are repaired via `_seed_tenant_tables`, not only tenants with **zero** tables. Keep idempotent; do not delete tables or break tokens/orders.
- Align module docstring with behaviour if it still claims existing tables are never updated.
- Re-run `check_demo_tables` until exit **0** on dev; ensure **Take Away** for tenant 1 still exists.
- Pass criteria: `check_demo_tables` exits **0**; if credentials available, `BASE_URL=http://127.0.0.1:4202 node front/scripts/test-demo-data.mjs` still passes.
- Append **Testing instructions** when implementation is complete; coordinate with / supersede **`NEW-0-20260712-1614-repair-demo-tables-t01-t10.md`** so 002 does not double-fix.

## Implementation notes (coder)

- **Root cause:** `run()` only called `_seed_tenant_tables` for tenants with **zero** tables; tenant 1 had a partial set so seed printed “Nothing to seed” and skipped repair. `_seed_tenant_tables` already created missing names and fixed `seat_count`.
- **Fix:** `run()` now calls `_seed_tenant_tables` for **every** tenant (empty and partial). Idempotent; does not delete tables or change tokens. Module docstring updated. Redundant tenant-1-only Take Away tail removed (covered inside `_seed_tenant_tables`).
- **NEW supersede:** Note added at top of `NEW-0-20260712-1614-repair-demo-tables-t01-t10.md` — do not re-implement.
- **Dev verify:** After seed, `check_demo_tables` exit 0; Take Away present; `test-demo-data.mjs` RESULT OK.

## Testing instructions

1. Sync / use current `development` with the `seed_demo_tables.py` change.
2. From repo root (dev compose up):
   ```bash
   docker compose -f docker-compose.yml -f docker-compose.dev.yml exec -T back python -m app.seeds.check_demo_tables
   ```
   Expect exit **0** and `OK: tenant 1 has T01–T10 with correct seat counts.`
3. If check already passes, optionally break then repair to prove seed:
   - Confirm seed is idempotent: re-run `python -m app.seeds.seed_demo_tables` (should print `Done.` with little/no create/update for tenant 1), then check again (exit 0).
4. Confirm Take Away still exists for tenant 1 (any query / UI path is fine).
5. With demo credentials:
   ```bash
   BASE_URL=http://127.0.0.1:4202 node front/scripts/test-demo-data.mjs
   ```
   Expect `RESULT: Demo data in place` (tables ≥10, products ≥10, `/book/1` OK).
6. Pass if steps 2 and 5 succeed (5 only if credentials available).

## Test report

1. **Date/time (UTC):** 2026-07-23 06:28:04–06:28:36 UTC. Log window: `docker logs --since 15m` around that interval.
2. **Environment:** `docker-compose.yml` + `docker-compose.dev.yml`; containers up (`pos-back`, `pos-front`, `pos-haproxy` on **4202**); `BASE_URL=http://127.0.0.1:4202`; branch `development` (synced via `./scripts/git-sync-development.sh`).
3. **What was tested:** Tenant 1 demo tables T01–T10 seat counts via `check_demo_tables`; idempotent `seed_demo_tables`; Take Away presence; Puppeteer `test-demo-data.mjs` (tables ≥10, products ≥10, `/book/1`).
4. **Results:**
   - **check_demo_tables exit 0 / OK message** — **PASS** — stdout: `OK: tenant 1 has T01–T10 with correct seat counts.` (`check_exit=0`)
   - **seed idempotent + re-check** — **PASS** — `seed_demo_tables` printed `Done.` (`seed_exit=0`); second check exit 0 with same OK line
   - **Take Away for tenant 1** — **PASS** — SQLModel query found `('Take Away', 4, id=13)` among tenant 1 tables
   - **test-demo-data.mjs** — **PASS** — `>>> RESULT: Demo data in place.` (Book OK; Tables 21; Products 17; `demo_exit=0`)
5. **Overall:** **PASS**
6. **Product owner feedback:** Demo hygiene for tenant 1 is restored: T01–T10 match expected seats and Take Away remains. Landing/book and catalog counts look healthy for local smoke; safe to close #305 from a verification perspective once the closer archives the task.
7. **URLs tested:**
   1. http://127.0.0.1:4202/book/1
   2. http://127.0.0.1:4202/ (login flow)
   3. http://127.0.0.1:4202/dashboard
8. **Relevant log excerpts (last section):**
   ```
   WARNING:  WatchFiles detected changes in 'app/seeds/seed_demo_tables.py'. Reloading...
   INFO:     172.30.0.5:43518 - "GET /reservations/book-month-day-states?tenant_id=1&year=2026&month=7&party_size=2 HTTP/1.1" 200 OK
   INFO:     172.30.0.5:43518 - "GET /reservations/book-day-slots?tenant_id=1&date=2026-07-23&party_size=2 HTTP/1.1" 200 OK
   INFO:     172.30.0.5:43536 - "GET /products HTTP/1.1" 200 OK
   INFO:     172.30.0.5:43536 - "GET /tables/with-status HTTP/1.1" 200 OK
   ```
   Front logs in the same window: no error/warn/fatal lines matching the filter.
