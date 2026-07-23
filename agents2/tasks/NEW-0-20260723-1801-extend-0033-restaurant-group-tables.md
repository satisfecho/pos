# Extend postgres ad-hoc SQL doc with restaurant_group tables

## GitHub Issues
- **Issue:** (none — enhancement reviewer)
- **0**

## Problem / goal

`docs/0033-postgres-adhoc-sql-table-names.md` still lists only `"order"` / `orderitem` / `"table"`. Sibling **`NEW-0-20260722-1226-postgres-adhoc-sql-waiting-list-table`** owns **`waiting_list_entry`** (and an optional delivery note on `"order"`). Restaurant groups (#283) use **`restaurant_group`** + **`restaurant_group_member`**; operators guessing `restaurantgroup` / `group_member` will hit relation errors. Keep this task to **groups only** — do not merge with the waiting-list NEW.

## Evidence (008 preflight / review)

- Weekly sweep 2026-07-23T18:01Z: `SIGNAL docs_stale` includes `docs/0033-postgres-adhoc-sql-table-names.md`; basename already has a waiting-list NEW, but **groups tables are unqueued**
- Models: `RestaurantGroup.__tablename__ = "restaurant_group"`, `RestaurantGroupMember.__tablename__ = "restaurant_group_member"` in `back/app/models.py`
- Feature guide: `docs/0054-restaurant-groups.md` (no SQL table cheat-sheet)
- `demo_tables_check=ok`; NEW backlog deep — one-file doc addition only

## High-level instructions for coder

- Update **`docs/0033-postgres-adhoc-sql-table-names.md` only**: add rows for **`restaurant_group`** and **`restaurant_group_member`** (join via `group_id` / `tenant_id` as in models)
- One short example `SELECT` listing members for a group / tenant (verify column names against `models.py`)
- If the waiting-list NEW has not landed yet, do **not** steal `waiting_list_entry` — leave that to the sibling; optional one-liner cross-link is fine
- Pass criteria: `rg restaurant_group docs/0033-postgres-adhoc-sql-table-names.md` hits both tables; example SQL matches schema
- Append **Testing instructions** (doc + optional `psql` dry-run in Docker)
