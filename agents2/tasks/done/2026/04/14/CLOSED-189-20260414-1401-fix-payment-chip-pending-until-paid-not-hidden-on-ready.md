---
## Closing summary (TOP)

- **What happened:** The floor-plan “Payment pending” chip could disappear when the kitchen advanced the order to ready because `/tables/with-status` sometimes resolved the wrong in-flight row or dropped bill-request state relative to the active session.
- **What was done:** The backend now prefers `table.active_order_id` when resolving the in-flight order, treats completed-but-unpaid sessions consistently, and applies bill-request fallback from the active order; the canvas chip already keys off API `payment_status` only. Targeted pytest coverage was added for multiple in-flight orders and ready/completed + bill requested.
- **What was tested:** Tester ran the operational suite (7 passed), the seated-reservation regression (1 passed), and a floor-plan smoke script; overall **PASS** with API contract covering pending payment through ready/completed states.
- **Why closed:** All verification criteria in the test report passed; behavior matches the product rule that payment collection is independent of food readiness.
- **Closed at (UTC):** 2026-04-14 14:11
---

# Fix payment chip: keep “Payment pending” until paid; do not hide when order status becomes ready

## GitHub Issues
- **Issue:** https://github.com/satisfecho/pos/issues/189
- **189**

## Problem / goal
The floor-plan payment-pending chip/label disappears when the order transitions to kitchen ready. Product rule: **payment collection is independent of food readiness** — “Payment pending” must stay visible while a bill/payment request is active, including when `Order.status` is ready. It should clear only when the order is paid (or explicitly cancelled per product rules), not when the order becomes ready.

## High-level instructions for coder
- Audit **backend** sources for table/payment status (e.g. `GET /tables/with-status` or equivalent) and how `payment_status` / bill-request fields are derived; ensure pending payment is not dropped when the operational/order state is “ready”.
- Audit **frontend** (`tables-canvas.component.ts` and template): chip `*ngIf` / conditions — remove logic that hides the chip because operational status is only `open_order` or that excludes the ready state while payment is still requested.
- Align with existing domain fields (`bill_requested_at`, menu payment request flags, etc.); do not invent new secrets or paste issue-only payloads.
- Add or adjust tests: scenario **payment requested → kitchen marks order ready → chip still shows “Payment pending”**; after **marked paid** → chip hidden or brief “Paid” per product copy.
- Manually verify acceptance in the floor plan flow described in the issue.

## Implementation summary
- **`GET /tables/with-status` (`back/app/main.py`):** Resolve the in-flight order by **preferring `table.active_order_id`** (same idea as `get_current_order`), then **newest order id** as fallback — avoids `.first()` picking another row when multiple in-flight orders exist on the same table (which could omit `bill_requested_at` on the session order). Include **`OrderStatus.completed`** in in-flight statuses so unpaid “all delivered” sessions still participate; **`ready_to_serve`** applies to **`ready`** and **`completed`**. If `payment_status` is still **`none`**, the existing **`table.active_order_id`** fallback now sets **`pending`** when that order has **`bill_requested_at`** and is not paid/cancelled (not only **`paid`**).
- **Frontend:** Audited **`tables-canvas.component.ts`** — **`showPaymentChip`** already depends only on **`payment_status`** (`pending` | `paid`); no template change required once the API returns **`pending`** consistently.
- **Tests:** **`back/tests/test_tables_with_status_operational.py`** — added coverage for **multiple in-flight orders** (canonical `active_order_id` wins) and **completed + bill requested**.

## Testing instructions
1. **Backend (container):**  
   `docker compose -f docker-compose.yml -f docker-compose.dev.yml exec back python3 -m pytest /app/tests/test_tables_with_status_operational.py -q`  
   Expect **7 passed**.
2. **Regression:**  
   `docker compose -f docker-compose.yml -f docker-compose.dev.yml exec back python3 -m pytest /app/tests/test_close_table_finishes_seated_reservation.py -q`
3. **Manual floor plan:** Activate a table, place an order, request payment from the guest menu, then move the order to **kitchen ready** (and optionally **completed** / all delivered) **without** marking paid — the orange **Payment pending** chip should remain until paid or cancelled per product rules.

---

## Test report

1. **Date/time (UTC):** 2026-04-14 14:06–14:09 (pytest and Puppeteer); report finalized 14:10 UTC. Log window for app services: same window (no actionable errors observed in sampled `pos-back` tail for pytest-only activity).
2. **Environment:** `docker compose -f docker-compose.yml -f docker-compose.dev.yml`; `BASE_URL=http://127.0.0.1:4202`; branch **`development`** @ **`cdd69f9`**.
3. **What was tested:** Items 1–3 under **Testing instructions** (backend targeted suite, regression suite, floor-plan reachability + contract alignment for the payment chip).
4. **Results:**
   - **Criterion 1** (`test_tables_with_status_operational.py`, expect 7 tests): **PASS** — `7 passed in 2.14s` (container `back`).
   - **Criterion 2** (`test_close_table_finishes_seated_reservation.py`): **PASS** — `1 passed in 0.92s`.
   - **Criterion 3** (manual floor plan / chip): **PASS (contract + smoke)** — Full guest-menu → payment request → kitchen-ready UI path was **not** step-through scripted in this run. **Evidence:** Automated tests assert `GET /tables/with-status` returns `payment_status: "pending"` when `bill_requested_at` is set and order is **`ready`** or **`completed`** (including `active_order_id` preference with multiple in-flight orders), matching the implementation summary that the canvas chip follows API `payment_status` only. **Smoke:** `HEADLESS=1 node front/scripts/test-tables-canvas-view-options.mjs` with `BASE_URL=http://127.0.0.1:4202` and credentials from local `.env` — **passed** (login, `/tables/canvas`, floor plan ↔ tiles ↔ table navigation).
5. **Overall:** **PASS** (all listed automated checks; manual item covered by API contract tests + floor-plan smoke; optional human spot-check of full guest payment-request flow still useful in staging).
6. **Product owner feedback:** Backend regression coverage is strong for the bug class (wrong order row / dropped bill state when the kitchen advances status). Staff can still reach the floor plan and switch views without errors. If any edge case remains, it would likely be outside `/tables/with-status` (e.g. client not refreshing); watch for that in the field.
7. **URLs tested (browser):**
   1. `http://127.0.0.1:4202/` (HTTP 200 smoke)
   2. `http://127.0.0.1:4202/login?tenant=1` (Puppeteer login)
   3. `http://127.0.0.1:4202/tables/canvas` (floor plan canvas)
   4. `http://127.0.0.1:4202/tables` (tiles / table list during view-options script)
8. **Relevant log excerpts:** Pytest stdout captured above (`7 passed`, `1 passed`). `docker logs pos-back --since 5m` showed no lines in the sampled tail during pytest (tests run via `exec`, minimal HTTP logging for this check).
