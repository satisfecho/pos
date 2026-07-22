# Schedule daily demo data reset (tenant 1)

## GitHub Issues
- **Issue:** (none — enhancement reviewer)
- **0**

## Problem / goal

Demo restaurant (tenant 1) accumulates orders and reservations on production. Sales demos and Informes look stale without periodic refresh. An idempotent reset already exists but runs only manually; the wrapper script is also non-executable, so preflight cannot emit the usual cron SIGNAL.

## Evidence (008 preflight / review)

- `scripts/reset-demo-data-on-server.sh` wraps `python -m app.seeds.reset_demo_data` but is **not** executable (`-rw-r--r--`), so enhancement preflight skips `demo_daily_reset_not_scheduled`
- `back/app/seeds/reset_demo_data.py` clears tenant 1 orders/reservations and re-seeds demo orders + reservations (idempotent)
- Weekly 008 re-check (2026-07-22): demo table hygiene still unhealthy (`check_demo_tables` fail) — daily order/reservation reset remains a separate ops gap once tables are repaired

## High-level instructions for coder

- `chmod +x scripts/reset-demo-data-on-server.sh` so ops and preflight treat it as a runnable entrypoint
- Document production cron in `docs/` (e.g. amvara9 ops / deploy notes) using that script; prefer host cron (e.g. `0 4 * * *` UTC daily); avoid new dependencies
- Ensure script is safe to run while the stack is up (idempotent); do not wipe non-demo tenants
- Coordinate with **`NEW-0-20260712-1614-repair-demo-tables-t01-t10.md`** if tables are still incomplete — reset assumes a healthy T01–T10 layout
- Tester: dry-run on dev with `docker compose … exec back python -m app.seeds.reset_demo_data`; verify `check_demo_tables` still passes after table repair; confirm docs mention the cron line
- Append **Testing instructions** when done

## Implementation notes (2026-07-22)

- Made `scripts/reset-demo-data-on-server.sh` executable; documented `0 4 * * *` UTC cron in `docs/0001-ci-cd-amvara9.md` (also linked from `docs/0004-deployment.md`, `docs/README.md`, `AGENTS.md`).
- Fixed `reset_demo_data.py` to delete `fiscal_invoice` and `inventory_transaction` rows before orders (FK violation blocked reset).
- Updated `scripts/enhancement-reviewer-preflight.sh` so `demo_daily_reset_not_scheduled` clears when docs mention the cron line.
- Installed host cron on amvara9 and `chmod +x` on the server script copy.
- Local `check_demo_tables` still fails (missing T05/T07/T10, wrong T08 seats) — owned by **`NEW-0-20260712-1614-repair-demo-tables-t01-t10.md`**; reset itself succeeds and is idempotent.

## Testing instructions

1. Confirm wrapper is executable:
   ```bash
   test -x scripts/reset-demo-data-on-server.sh && echo OK
   ```
2. Dry-run reset (dev compose; stack must be up):
   ```bash
   docker compose -f docker-compose.yml -f docker-compose.dev.yml exec -T back python -m app.seeds.reset_demo_data
   ```
   Expect exit 0 and a “Demo data reset and re-seeded.” line. Run twice to confirm idempotency.
3. Confirm docs include the cron line:
   ```bash
   grep -n '0 4 \* \* \*.*reset-demo-data-on-server' docs/0001-ci-cd-amvara9.md
   ```
4. Preflight should report documented (not SIGNAL) for daily reset:
   ```bash
   bash scripts/enhancement-reviewer-preflight.sh 2>&1 | grep demo_daily_reset
   ```
   Expect: `demo_daily_reset=documented …`
5. Optional — amvara9 cron present:
   ```bash
   ssh amvara9 'crontab -l | grep reset-demo-data-on-server'
   ```
6. Note: `python -m app.seeds.check_demo_tables` may still fail until the separate demo-tables repair NEW task is done; that does not block this reset/cron work.
