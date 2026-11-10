---
## Closing summary (TOP)

- **What happened:** Production 500s on amvara9 traced to deleting floors while tables still referenced them under a strict FK without ON DELETE SET NULL.
- **What was done:** `delete_floor` now nulls `table.floor_id` before delete; migration repaired `table_floor_id_fkey` to ON DELETE SET NULL; regression pytest added and applied on prod.
- **What was tested:** Tester PASS - pytest `test_delete_floor_api.py` 2 passed; prod FK confirmed SET NULL; health/menu/landing 200; no new floor FK or 5xx noise after the fix.
- **Why closed:** All pass/fail criteria met; root cause fixed and verified on amvara9.
- **Closed at (UTC):** 2026-11-10 13:01
---

# Investigate production 500 errors (#438)

## GitHub Issues
- **Issue:** https://github.com/satisfecho/pos/issues/438
- **438**

## Status
- **In progress → implemented** (010): human reply on #438 ("Access should be restored"); agent host is amvara9. Root cause found and fixed (see Agent notes). Waiting notice cleared.

## Problem / goal
Production is reporting HTTP 500s. Goal: identify which endpoints/services fail on the live amvara9 stack, find root cause(s), and fix or document mitigations so guests/staff stop hitting server errors. Issue body is thin ("investigate on 500 errors on prod logfiles") - treat as an ops/reliability incident, not a feature.

Relevant docs: `docs/0001-ci-cd-amvara9.md`, `docs/0004-deployment.md`, `docs/0026-haproxy-ssl-amvara9.md`, `.cursor/rules/error-investigation-workflow.mdc`. Local digest invoice-email 500s were already fixed under CLOSED-434 - do not reopen that path unless prod logs still show the same SlowAPI `response` signature error.

## High-level instructions for coder
- Prefer production-impact triage: reproduce or confirm via current prod/back/haproxy logs (pattern: 500 / Exception / Traceback), then map failing paths to `back/` handlers.
- Check HAProxy vs backend: 502/503 vs application 500; note whether failures cluster on public menu, payments, auth, or admin APIs.
- Compare with local stack only as a secondary check (`http://127.0.0.1:14202`, `docker logs pos-back` / `pos-haproxy`); do not invent a NEW task for historical local digest noise.
- Fix concrete bugs with tenant scoping preserved; add or extend a focused pytest/Puppeteer smoke for the failing path.
- Do not paste secrets, full prod env dumps, or raw log blobs with PII into the task file or commits.
- When done: append **Testing instructions**; verify the previously failing endpoint returns non-500 under HAProxy and that recent `pos-back` logs stay clean for that route.

## Agent notes (010) - 2026-11-07T10:13:28Z
- Synced `development`; left task as **FEAT** (no WIP / no code).
- Public `https://satisfecho.de` probes (health, public tenant/menu, book/waitlist/delivery, login/token, payment-intent guards, customer register validation): **no HTTP 500**.
- Local HAProxy `127.0.0.1:14202`: landing/health 200; `pos-back` / `pos-haproxy` last 24h: **0** Internal Server Error / 5xx lines.
- Agent-loop 001 digest still surfaces historical local `POST .../invoice-email` 500s (SlowAPI `response`) already fixed under CLOSED-434 - not reopened.
- SSH to amvara9 (port 60022): all available keys **Permission denied**; jump via amvara8 also denied.
- GitHub: at that time hosts.yml / env tokens returned 401; **2026-11-10** gh keyring auth restored and waiting notice re-posted on #438 (see Status). SSH to amvara9 remains the blocker.

## Agent notes (010) - 2026-11-10T12:55:00Z
- Human reply on #438: access restored. Agent is running **on amvara9**. Renamed FEAT → WIP; labeled `agent:wip`.
- Current `pos-back` / `pos-haproxy` containers recreated ~12:30 UTC (logs wiped). Live probes: health/menu/landing **200**; no HTTP 500 in current back/haproxy logs.
- HAProxy briefly marked `api_backend` / `ws_backend` DOWN (connection refused) during that recreate (503 window, not application 500).
- **Postgres ERROR** (only two since Oct 20), both matching issue date window:
  - `update or delete on table "floor" violates foreign key constraint "table_floor_id_fkey" on table "table"` (2026-10-27, 2026-10-30).
- Confirmed prod constraint was `FOREIGN KEY (floor_id) REFERENCES floor(id)` **without** `ON DELETE SET NULL` (migration `ADD COLUMN IF NOT EXISTS` no-op when column already existed). Docstring of `DELETE /floors/{id}` claimed tables would be unlinked; code did not.
- **Fix:**
  1. `delete_floor` now nulls `table.floor_id` for tenant tables on that floor before delete.
  2. Migration `20261110130000_repair_table_floor_id_on_delete_set_null.sql` recreates FK with `ON DELETE SET NULL` (applied on amvara9).
  3. Pytest `tests/test_delete_floor_api.py` (2 passed).
- No other postgres ERRORs or back Tracebacks found for the investigation window. Historical payment SlowAPI 500s already CLOSED-425/427.

## What changed
- `back/app/main.py` - `delete_floor` unlinks tables before delete
- `back/migrations/20261110130000_repair_table_floor_id_on_delete_set_null.sql` - repair FK
- `back/tests/test_delete_floor_api.py` - regression coverage

## Testing instructions

### What to verify
1. `DELETE /floors/{id}` with tables on that floor returns **200** (not 500) and leaves tables with `floor_id=null`.
2. Prod DB constraint `table_floor_id_fkey` includes `ON DELETE SET NULL`.
3. Public/health probes still non-500; no new floor FK errors in postgres after the fix.

### How to test
```bash
# From repo root (Docker back)
docker compose -f docker-compose.yml -f docker-compose.prod.yml exec -T back \
  python3 -m pytest tests/test_delete_floor_api.py -q

# FK definition (use DB user from config.env; do not paste password into reports)
docker exec -e PGPASSWORD="$POSTGRES_PASSWORD" pos-postgres \
  psql -U pos -d pos -c "SELECT pg_get_constraintdef(oid) FROM pg_constraint WHERE conname='table_floor_id_fkey';"
# Expect: FOREIGN KEY (floor_id) REFERENCES floor(id) ON DELETE SET NULL

# Public smoke
curl -s -o /dev/null -w '%{http_code}\n' https://satisfecho.de/api/health   # 200
curl -s -o /dev/null -w '%{http_code}\n' https://satisfecho.de/api/public/tenants/1/menu  # 200

# Optional staff UI: Settings/floor canvas → delete a floor that still has tables → expect success, tables remain unassigned
```

### Pass/fail criteria
- **PASS:** pytest green; FK has ON DELETE SET NULL; health/menu 200; deleting a floor with tables does not 500.
- **FAIL:** pytest fails, FK still without ON DELETE SET NULL, or DELETE /floors still returns 500 when tables exist.

## Test report

1. **Date/time (UTC):** 2026-11-10T12:59:46Z start → 2026-11-10T13:00:04Z end. Log window: `pos-back` / `pos-haproxy` last ~40m; `pos-postgres` historical floor FK errors scanned (last occurrence 2026-10-30).
2. **Environment:** `docker-compose.yml` + `docker-compose.prod.yml` on amvara9; branch `development`; public `BASE_URL=https://satisfecho.de`.
3. **What was tested:** DELETE floor with tables (pytest), prod FK `table_floor_id_fkey` definition, public health/menu/landing non-500, no new floor FK / 5xx noise after fix.
4. **Results:**
   - DELETE `/floors/{id}` with tables → **PASS** - `tests/test_delete_floor_api.py` **2 passed** in 2.59s (unlink + 200, not 500).
   - Prod FK `ON DELETE SET NULL` → **PASS** - `pg_get_constraintdef` = `FOREIGN KEY (floor_id) REFERENCES floor(id) ON DELETE SET NULL`.
   - Public probes non-500 → **PASS** - `https://satisfecho.de/api/health` 200; `/api/public/tenants/1/menu` 200; `/` 200.
   - No new floor FK errors after fix → **PASS** - postgres historical FK violations only through 2026-10-30; `pos-back` last 40m no ERROR/Traceback/Internal Server Error; `pos-haproxy` last 40m no 50x lines.
5. **Overall:** **PASS**
6. **Product owner feedback:** Root cause was deleting a floor while tables still referenced it under a strict FK, which produced Postgres errors and 500s. The API now unlinks tables first and the DB FK matches the documented SET NULL behaviour. Public guest paths stayed healthy during verification.
7. **URLs tested:**
   1. https://satisfecho.de/api/health
   2. https://satisfecho.de/api/public/tenants/1/menu
   3. https://satisfecho.de/
8. **Relevant log excerpts:**
   - pytest: `2 passed, 3 warnings in 2.59s`
   - FK: `FOREIGN KEY (floor_id) REFERENCES floor(id) ON DELETE SET NULL`
   - postgres (pre-fix only): last `table_floor_id_fkey` ERROR at `2026-10-30 12:34:42 UTC` - none after migration/fix window
   - `pos-back` / `pos-haproxy` since ~12:20 UTC: no Internal Server Error / 50x for this check window
