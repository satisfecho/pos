# Table groups (join / unjoin) — MVP behaviour

## Staff

- Tables can be **joined** on the floor plan (`/tables/canvas`): **Ctrl+click** (⌘+click on Mac) to multi-select tables on the same floor, then **Join tables**. **Unjoin** clears the group; each table keeps its own name and QR token.
- Join requires: same floor, no open orders, no active table session, no booked or seated reservation on any selected table.
- **Reservations:** seating uses **combined seat counts** for the group. A party can be seated at any member table; the group is one logical unit for conflicts (another booking cannot use a sibling table for the same overlap rules as today).
- **Reservation pool capacity** (`_reservable_capacity_for_tenant`): a joined set counts as **one** table unit with **sum(seat_count)**; if any member is busy for the slot, the **whole** group is excluded from the pool.

## Customer menu / QR (`/menu/...`)

- Each physical table still has its **own** `table_token` and `table_id`. Joining does **not** merge customer sessions or orders across tokens.
- **MVP:** Prefer directing guests to a **single** table’s QR for ordering. If guests use two different table links, they get **separate** `(table_id, session_id)` orders per `docs/0008-order-management-logic.md` — staff see both under the same party only by context, not by automatic merging.
