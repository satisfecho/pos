# Join / unjoin tables

## GitHub
- **Issue:** https://github.com/satisfecho/pos/issues/140

## Problem / goal
Staff need to treat multiple physical tables as one party: shared capacity, coherent booking, and clear rules for orders and QR/menu. Deliver a **table group** concept (e.g. `table_group_id` on `Table` or a small `TableGroup` table scoped by tenant), with APIs to create a group from N tables, dissolve it, and validate same-tenant membership and non-conflicting table state. Align session vs multiple orders on grouped tables with `docs/0008-order-management-logic.md` and `docs/0050-github-issue-52-split-plan.md` (Issue 3 — Join tables). When seating reservations, support or document MVP (e.g. join first, then seat; or target a group when party size spans tables).

**Frontend:** Floor/canvas: multi-select or explicit “Join” / “Unjoin” with a clear visual that tables are grouped. Staff orders: show the group and member tables; avoid double-booking merged capacity. **Acceptance (MVP):** staff can create and clear a join from the tables UI; orders/reservations do not double-count capacity on merged tables; document minimal safe behaviour for customer menu / table token (which token, redirects). Keep APIs extensible for possible future split-bill work.

## High-level instructions for coder
- Read `docs/0008-order-management-logic.md`, `docs/0050-github-issue-52-split-plan.md`, and related reservation/table docs before changing data model or APIs.
- Design and implement backend persistence and validation for table groups (tenant-scoped); add endpoints or extend existing table APIs as appropriate.
- Implement floor plan / tables UI for join/unjoin and group indication; wire staff order flows so capacity and booking rules stay consistent.
- Add or extend tests (API and/or e2e) for group create/dissolve, validation failures, and reservation/order behaviour on grouped tables.
- Document table-token / menu behaviour for grouped tables in a short note or existing doc if product behaviour is non-obvious.

## Testing instructions

1. **Migrate:** `docker compose -f docker-compose.yml -f docker-compose.dev.yml exec back python -m app.migrate` — expect **`20260401140000_table_group`** applied.
2. **Backend:** From `back/` with DB up: `PYTHONPATH=. python3 -m pytest tests/test_reservable_capacity_turn_walkin.py -q` (note: SQLite in-memory tests may fail on `Tenant` JSONB; use Postgres-backed runs if needed). Manually verify **`POST /table-groups`** with two same-floor tables (no orders/reservations) returns **`id`** + **`table_ids`**; **`DELETE /table-groups/{id}`** clears **`table_group_id`** on members.
3. **Frontend:** Restart **`front`** if needed so **`package.json`** version matches the landing bar. Open **`/tables/canvas`**, **Ctrl+click** two tables on the same floor → **Join tables** → confirm violet outline and **Group** line in the panel; **Unjoin** → outlines clear. **`GET /tables/with-status`** in network tab should show **`group_member_ids`** / **`group_seat_total`**.
4. **Staff orders:** With an order on a grouped table, confirm **`table_group_label`** (e.g. `T1 + T2`) appears next to the table name on active / not-paid cards.
5. **Smoke:** `BASE_URL=http://127.0.0.1:4202 npm run test:landing-version --prefix front` (after dev server picks up **`front/package.json`** version / commit hash).
6. **Docs:** Skim **`docs/0051-table-groups-mvp.md`** for QR/session MVP behaviour.
