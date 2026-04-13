# Fix table delete blocked by soft-deleted orders

## GitHub Issues
- **Issue:** https://github.com/satisfecho/pos/issues/180
- **180**

## Problem / goal
Deleting a table uses `DELETE /tables/{id}`. The backend sets or checks `has_orders` using orders linked by `table_id`. Soft-deleted orders (`DELETE /orders/{id}` sets `deleted_at`) still reference the table, so the guard still counts them and users cannot delete the table after “removing” orders in the UI. Align behavior so soft-deleted orders do not block table deletion, consistently with product expectations for `table_has_orders` and any reassign flow.

## High-level instructions for coder
- In the table-delete path, ensure the “has orders” check only counts **active** orders (e.g. `Order.deleted_at.is_(None)`), **or** clear `order.table_id` when soft-deleting an order—choose one coherent approach across the API.
- Add or extend a test that covers: table with only soft-deleted orders referencing it → table delete should succeed (or document the chosen rule).
- Revisit `table_has_orders` / reassignment flows so they stay consistent with the same definition of “active” vs soft-deleted orders.
- See backend models/routes for `delete_table` and order soft-delete; add pointers to `docs/` if any existing doc describes table/order lifecycle.
