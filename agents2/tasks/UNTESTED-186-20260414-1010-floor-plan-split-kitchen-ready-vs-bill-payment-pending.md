# Floor plan: split kitchen ready vs bill / payment pending; bill_requested signal; copy

## GitHub Issues
- **Issue:** https://github.com/satisfecho/pos/issues/186
- **186**

## Problem / goal
`GET /tables/with-status` currently maps `operational_status` to a value that implies “bill issued” when the active order’s `Order.status` is `ready`, which actually means kitchen/order ready—not SumUp-style “ready to pay.” The floor-plan legend misleads staff.

The product has request-payment flows (e.g. public menu), but floor-plan colors do not distinguish “payment / bill requested” from “kitchen ready.”

**Short term:** Fix i18n so the purple state driven by `Order.status == ready` reads as “Ready to serve” (and equivalents), not “Bill / ready to pay.”

**Medium term:** Add a dedicated signal (e.g. nullable `bill_requested_at` on `Order`, or boolean + timestamp) set idempotently from customer request-payment and optionally from a staff “request bill” action if required. Extend `GET /tables/with-status` so semantics are: open order; **ready_to_serve** when `ready` and no bill request; **bill issued / payment pending** when `bill_requested_at` is set (precedence over kitchen-ready). Align `TableOperationalStatus` / canvas types, legend (`tables-canvas`), and properties panel badges. Update API docs/comments that equate `bill_issued` with “order ready.” Optional: elapsed timer since bill request or session start.

See issue for suggested test matrix (ready only; ready + bill requested; paid/cleared).

## High-level instructions for coder
- Land honest i18n for the current purple-if-ready behavior first, or deliver i18n + schema + with-status + UI in one coherent PR per team preference.
- Add `bill_requested_at` (or chosen field) on `Order`; set it from existing request-payment path(s) with idempotency; add staff hook if product needs it.
- Update `/tables/with-status` rules and enum naming so legend colors match intent; document behavior in OpenAPI/comments.
- Update Angular types, legend entries/colors, and translations; add backend tests for `operational_status` combinations; optional frontend tests if the repo pattern supports them.

## Implementation summary (coder)
- **`order.bill_requested_at`** column + SQLModel field; set on **`POST /menu/{table_token}/order/{order_id}/request-payment`** if null; cleared when order marked paid (mark-paid, finish, Stripe confirm, Revolut verify).
- **`GET /tables/with-status`:** `bill_issued` only when `bill_requested_at` set; **`ready_to_serve`** when `Order.status == ready` and no bill request; else **`open_order`**.
- Frontend: **`TableOperationalStatus`** includes **`ready_to_serve`**; legend + canvas colors; i18n **`TABLES.OP_READY_TO_SERVE`** / **`TABLES.OP_BILL_ISSUED`** (payment pending).
- Backend tests: **`back/tests/test_tables_with_status_operational.py`**.

## Testing instructions
1. **Migrate:** `docker compose -f docker-compose.yml -f docker-compose.dev.yml exec back python -m app.migrate` (expect version **20260414103000** or newer).
2. **Backend:** `docker compose -f docker-compose.yml -f docker-compose.dev.yml exec back python3 -m pytest tests/test_tables_with_status_operational.py -q`
3. **Regression:** `docker compose ... exec back python3 -m pytest tests/test_close_table_finishes_seated_reservation.py -q`
4. **Frontend build:** confirm `docker logs --since 5m pos-front` has no TS errors after pull.
5. **Manual floor plan:** With an active order — kitchen **ready** → table shows **Ready to serve** (purple). From public menu, **request payment** → **Payment pending** (orange). After staff marks paid → table returns to available/occupied as before.
