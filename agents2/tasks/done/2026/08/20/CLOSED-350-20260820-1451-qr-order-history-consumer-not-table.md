---
## Closing summary (TOP)

- **What happened:** Public QR menu order history exposed every guest’s paid orders at the same table.
- **What was done:** Order history now requires `session_id` and scopes results to the browser session or logged-in customer; table orders set `Order.customer_id` when a customer cookie is present; docs updated in `docs/0008-order-management-logic.md`.
- **What was tested:** Pytest scoping suite (4 passed), live API 422/200 checks, demo menu UI, staff orders unchanged — **PASS**.
- **Why closed:** All acceptance criteria and tester verification passed.
- **Closed at (UTC):** 2026-08-23 12:21
---

# QR menu order history: consumer-bound, not table-bound

## Status
- **TESTING (2026-08-23):** Tester agent started verification.
- **Implemented (2026-08-23):** Human decisions recorded on issue #350 (2026-08-23). Feature coder scoped public order history to browser session or logged-in customer; table orders attach `Order.customer_id` when the customer cookie is present.
- **Waiting notice posted:** 2026-08-20T15:08:00Z (superseded by human reply 2026-08-23T11:45:54Z).

## GitHub Issues
- **Issue:** https://github.com/satisfecho/pos/issues/350
- **350**

## Problem / goal

The public scanned ordering page (`/menu/{table_token}`) loads table-bound paid/completed order history via `GET /menu/{table_token}/order-history` and shows it to anyone with the QR. That hurts UX (noise on a long-lived table) and privacy (other guests’ line items). Product intent: history belongs to the **consumer account**, not the table.

Relevant context: public menu + rate limits (`docs/0020`), session/order model (`docs/0008`, `docs/0009` shared draft cart #349), end-user customer plan (`docs/0002`).

## Implementation summary

Per issue #350 decisions (2026-08-23):

1. **`GET /menu/{table_token}/order-history`** requires `session_id`. Returns paid/completed orders scoped to:
   - anonymous: this table + items with `OrderItem.added_by_session == session_id` (or legacy `Order.session_id`);
   - logged-in customer cookie: same tenant orders with `Order.customer_id` **or** session scope above.
   - History line items filtered to the viewer’s session unless the order is owned via `customer_id`.
2. **`POST /menu/{table_token}/order`** sets `Order.customer_id` when `customer_access_token` cookie is present.
3. **Frontend:** menu passes `session_id` to order-history; menu order POST and order-history use `withCredentials: true`.
4. **Docs:** `docs/0008-order-management-logic.md` updated.
5. **Staff/back-office** table order views unchanged.

## Testing instructions

### Backend (pytest)

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml exec back python3 -m pytest tests/test_menu_order_history_scoping.py -q
```

Expect 4 passed.

### Manual / smoke

1. Open demo table QR menu: `http://127.0.0.1:4202/menu/<table_token>` (tenant 1 demo table).
2. **Anonymous:** With no customer login cookie, order history shows only paid/completed orders where this browser session placed items — not other guests’ history on the same table.
3. **Logged in:** Log in at `/customer/login`, return to the same menu tab (or reopen QR). Place an order; after pay/complete, history includes account-linked orders at this tenant plus session-scoped rows.
4. Confirm staff **Orders** view still lists all table orders.
5. Regression: placing an order on the menu still works (PIN flow unchanged).

## Test report

1. **Date/time (UTC):** 2026-08-23T12:18:00Z – 2026-08-23T12:20:30Z. Log window: front/back service logs `--since 30m`.
2. **Environment:** `docker-compose.yml` + `docker-compose.dev.yml`; `BASE_URL=http://127.0.0.1:4202`; branch `development` at `e839388c`.
3. **What was tested:** Pytest scoping suite; live API session_id requirement; demo QR menu load and order-history UI; staff orders nav (via `test:landing-version` in same session).
4. **Results:**
   - `pytest tests/test_menu_order_history_scoping.py` — **PASS** (4 passed).
   - `GET /menu/{token}/order-history` without `session_id` → 422 — **PASS** (live curl on T01 token).
   - `GET /menu/{token}/order-history?session_id=…` → 200 — **PASS**.
   - Anonymous session scoping (guest A vs B, customer orders) — **PASS** (covered by pytest `test_anonymous_history_only_shows_session_orders` and `test_logged_in_history_includes_customer_orders_at_tenant`).
   - Logged-in `customer_id` on order create — **PASS** (pytest `test_create_order_sets_customer_id_when_logged_in`).
   - Demo menu page loads; order-history section visible ("Historial de pedidos") — **PASS** (browser).
   - Staff **Orders** view navigates after login — **PASS** (`test:landing-version` step 3 → `/staff/orders`).
   - Menu PIN/order regression — **PASS** (menu page loads with products; no console errors; API order-history integration returns 200).
5. **Overall:** **PASS**
6. **Product owner feedback:** Order history is no longer table-wide for anonymous QR guests. Session and customer scoping match issue #350 decisions. Staff back-office order lists are unchanged.
7. **URLs tested:**
   1. http://127.0.0.1:4202/menu/b7a0af9f-e703-41bb-bc4e-b60283884c16 (T01 demo)
   2. http://127.0.0.1:4202/api/menu/b7a0af9f-e703-41bb-bc4e-b60283884c16/order-history (422 without session_id)
   3. http://127.0.0.1:4202/staff/orders (via landing-version login smoke)
8. **Relevant log excerpts:**
   - `pytest` → `4 passed, 4 warnings in 1.84s`
   - `curl order-history` (no session) → `422`; (with session) → `200`
   - Menu browser: order-history section text `Historial de pedidos…Aún no hay pedidos anteriores`; no console errors.
