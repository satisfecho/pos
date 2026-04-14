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
