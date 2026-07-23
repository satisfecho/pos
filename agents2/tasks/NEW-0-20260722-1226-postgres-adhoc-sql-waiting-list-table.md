# Extend postgres ad-hoc SQL doc with waiting_list_entry

## GitHub Issues
- **Issue:** (none — enhancement reviewer)
- **0**

## Problem / goal

`docs/0033-postgres-adhoc-sql-table-names.md` helps operators avoid the fake `restaurantorder` table, but only lists `"order"`, `orderitem`, and `"table"`. Since waiting list shipped (#282), ad-hoc queries often need **`waiting_list_entry`**. The doc is flagged stale while code moved; a small table-name addition prevents wrong guesses (`waitinglist`, `waitlist`, etc.).

## Evidence (008 preflight / review)

- `SIGNAL docs_stale` — `docs/0033-postgres-adhoc-sql-table-names.md` age_days≈110
- Model: `WaitingListEntry.__tablename__ = "waiting_list_entry"` in `back/app/models.py`
- Queue already covers many other stale docs (PRINTING, 0026, 0014, README); **0033 only** here
- Skip bulk roadmap/plan docs (0023/0029/0050/0032)

## High-level instructions for coder

- Update **`docs/0033-postgres-adhoc-sql-table-names.md` only**: add a row for waiting-list entries → **`waiting_list_entry`**, note `tenant_id` / status filter, and one short example `SELECT` (active `waiting`/`notified` for tenant 1).
- Optional one-liner: Satisfecho Delivery lives on **`"order"`** (channel/address columns) — no separate `deliveryorder` table — if that fits without bloating the doc.
- Do not invent tables; verify names against `models.py` / migrations.
- Pass criteria: `rg waiting_list_entry docs/0033-postgres-adhoc-sql-table-names.md` matches; example SQL is valid against current schema.
- Append **Testing instructions** (doc + optional `psql` dry-run in Docker).
