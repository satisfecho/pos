---
## Closing summary (TOP)

- **What happened:** Demo tenant 1 orders/reservations piled up on production without a scheduled reset; the server wrapper was non-executable so preflight never treated daily reset as documented/runnable.
- **What was done:** Made `scripts/reset-demo-data-on-server.sh` executable, fixed FK-safe reset (fiscal_invoice / inventory_transaction), documented and installed `0 4 * * *` UTC cron on amvara9, and updated enhancement preflight to report `demo_daily_reset=documented`.
- **What was tested:** Wrapper executable, idempotent dry-run reset (×2), docs cron line, preflight documented signal, and amvara9 crontab — all **PASS**.
- **Why closed:** All testing criteria passed; remaining `check_demo_tables` gaps belong to a separate NEW repair task.
- **Closed at (UTC):** 2026-07-22 12:05
---

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

## Test report

1. **Date/time (UTC):** 2026-07-22 12:04:05 – 12:04:14 UTC. Log window: `docker logs --since 10m pos-back`.
2. **Environment:** `docker-compose.yml` + `docker-compose.dev.yml`; branch `development` (synced); local HAProxy `http://127.0.0.1:4202`; no browser.
3. **What was tested:** Wrapper executable bit; dry-run `reset_demo_data` twice (idempotent); cron line in `docs/0001-ci-cd-amvara9.md`; enhancement preflight `demo_daily_reset=documented`; optional amvara9 crontab entry.
4. **Results:**
   - Wrapper executable: **PASS** — `test -x scripts/reset-demo-data-on-server.sh` → OK (`-rwxr-xr-x`).
   - Reset dry-run #1: **PASS** — exit 0; “Demo data reset and re-seeded.” (removed 40 orders / 37 reservations, re-seeded).
   - Reset dry-run #2 (idempotency): **PASS** — exit 0; same success line after clearing the freshly seeded 40/37.
   - Docs cron line: **PASS** — `docs/0001-ci-cd-amvara9.md` lines 113 and 120 match `0 4 * * * … reset-demo-data-on-server.sh`.
   - Preflight: **PASS** — `demo_daily_reset=documented (docs mention 04:00 UTC cron + reset-demo-data-on-server.sh)`.
   - Optional amvara9 cron: **PASS** — `crontab -l` shows `0 4 * * * cd /development/pos && ./scripts/reset-demo-data-on-server.sh >>/var/log/pos-demo-reset.log 2>&1`.
5. **Overall:** **PASS**
6. **Product owner feedback:** Daily demo reset is ready for ops: the wrapper runs, the seed module is idempotent on a live stack, and both the docs and amvara9 crontab advertise the 04:00 UTC job. Remaining `check_demo_tables` gaps stay on the separate demo-tables repair task and do not block this cron work.
7. **URLs tested:** N/A — no browser
8. **Relevant log excerpts (last section):** Seed module stdout (not HTTP): both runs ended with `Demo data reset and re-seeded.` / exit 0. `pos-back` HTTP logs in the window show only routine `GET /docs` 200s; no traceback/exception tied to the reset exec.
