# Align floor plan status with table close: finish seated reservations on POST /tables/{id}/close

## GitHub Issues
- **Issue:** https://github.com/satisfecho/pos/issues/184
- **184**

## Problem / goal
Staff closing a table from the tile grid clears the table session (`is_active`, order fields), but **GET /tables/with-status** can still show the table as **occupied** because it treats a **seated** reservation on that `table_id` as a busy state. The tile list uses **GET /tables** while the floor plan canvas uses **GET /tables/with-status**, so “closed” and “green/occupied” disagree and confuse staff.

**Expected:** Closing a table should end the service cycle for any **seated** reservation on that table (unless product policy explicitly requires otherwise), so **operational_status** matches staff expectation—typically back to available (or reserved if a future booking still applies).

## High-level instructions for coder
- In **POST /tables/{table_id}/close** (`close_table`): after existing session cleanup (and empty-order deletion if present), find reservation(s) for this tenant/table with status **seated** and transition them to **finished** (or the project’s equivalent terminal state).
- Reuse the same logic and side effects as the existing “finish reservation” / status-update path (notifications, clearing `seated_at`, invariants)—prefer calling a shared helper or internal use of existing finish logic to avoid duplication.
- Add or extend **tests**: close table when a seated reservation exists on that table → reservation ends in finished (or equivalent) → **GET /tables/with-status** shows non-occupied for that table when no other blocking state (active kitchen order, etc.) applies.
- **Optional:** After successful close in the tile client, refetch **getTablesWithStatus** where shared state needs it, or document navigation behavior; larger alternative is aligning the tiles view to **/tables/with-status** for parity (only if product wants that scope).

## Implementation summary
- Added `_mark_reservation_finished()` in `back/app/main.py` and use it from `PUT /reservations/{id}/finish`, `PUT /reservations/{id}/status` (finished), and **`POST /tables/{table_id}/close`**.
- `close_table` now loads tenant-scoped **seated** reservations for that `table_id`, marks them finished (clears `table_id` / `seated_at`), commits with the table session cleanup, then emits **`reservation_finished`** WebSocket updates (same payload shape as finish endpoint) before **`table_closed`**.
- New test: `back/tests/test_close_table_finishes_seated_reservation.py`.

## Testing instructions
1. From repo root with dev stack up:  
   `docker compose -f docker-compose.yml -f docker-compose.dev.yml exec -T back python3 -m pytest tests/test_close_table_finishes_seated_reservation.py -q`
2. Manual: seat a reservation on a table, close the table from the staff tile flow, confirm floor plan (**GET /tables/with-status**) shows **available** for that table when there is no active order and no other seated reservation.

## Implementation summary
- Added `_mark_reservation_finished()` in `back/app/main.py` and use it from `PUT /reservations/{id}/finish`, `PUT /reservations/{id}/status` (finished), and **`POST /tables/{table_id}/close`**.
- `close_table` now loads tenant-scoped **seated** reservations for that `table_id`, marks them finished (clears `table_id` / `seated_at`), commits with the table session cleanup, then emits **`reservation_finished`** WebSocket updates (same payload shape as finish endpoint) before **`table_closed`**.
- New test: `back/tests/test_close_table_finishes_seated_reservation.py`.

## Testing instructions
1. From repo root with dev stack up:  
   `docker compose -f docker-compose.yml -f docker-compose.dev.yml exec -T back python3 -m pytest tests/test_close_table_finishes_seated_reservation.py -q`
2. Manual: seat a reservation on a table, close the table from the staff tile flow, confirm floor plan (**GET /tables/with-status**) shows **available** for that table when there is no active order and no other seated reservation.

## Test report

**Date/time (UTC):** 2026-04-14 08:48–08:49 (pytest run ~08:48; landing smoke finished 08:49:02 UTC). Log window for container review: last ~30 minutes UTC.

**Environment:** `docker-compose.yml` + `docker-compose.dev.yml`; `BASE_URL=http://127.0.0.1:4202`; branch `development` @ `ea7a2f7`.

**What was tested:** Task **Testing instructions** — (1) pytest `tests/test_close_table_finishes_seated_reservation.py`; (2) parity of **POST /tables/{id}/close** with **GET /tables/with-status** (same contract the floor plan uses; staff tiles call `closeTable()` to that endpoint). Supplementary: `npm run test:landing-version` (staff login + navigation including `/tables`).

**Results:**
- Pytest `tests/test_close_table_finishes_seated_reservation.py`: **PASS** — `1 passed in 0.98s` (`docker compose … exec -T back python3 -m pytest … -q`).
- Close + **GET /tables/with-status** shows `available` / non-occupied: **PASS** — covered by `test_close_table_finishes_seated_reservation_and_clears_occupied_status` (asserts `status` and `operational_status` are `available`).
- Staff app smoke (`test-landing-version.mjs`, tenant=1): **PASS** — script ended with `Landing version OK; demo login (tenant=1) OK; sidebar nav OK.`

**Overall:** **PASS** (no failed criteria).

**Product owner feedback:** Server-side close now finishes seated reservations tied to the table, so the floor plan’s busy state matches what staff expect after closing from tiles. The new pytest prevents this alignment from regressing silently.

**URLs tested (numbered):**
1. `http://127.0.0.1:4202/`
2. `http://127.0.0.1:4202/dashboard`
3. `http://127.0.0.1:4202/tables` (and other staff routes exercised by the landing nav script per `test-landing-version.mjs`)
4. API (in-container): `POST /tables/{table_id}/close`, `GET /tables/with-status` — exercised by pytest.

**Relevant log excerpts:** `docker logs pos-back` (last 30m): no lines matching `error|exception|traceback|500`. Pytest stdout: `1 passed in 0.98s`.
