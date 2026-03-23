# Pay before checkout

## GitHub
- **Issue:** https://github.com/satisfecho/pos/issues/23

## Problem / goal
Some customers want to pay before food is fully prepared. Orders must support **taking payment at any appropriate point** in the flow, not only at a single “checkout” moment.

## High-level instructions for coder
- Map the current order lifecycle (states, kitchen, payment, mark-paid/finish) in backend and staff UI; read payment-related docs if present.
- Define allowed transitions: e.g. pay while order is still open/in progress, and how that affects kitchen and customer-facing views.
- Implement API and UI changes so staff can record payment early without breaking existing flows; keep invariants for totals, tips, and invoices.
- Add tests covering pay-early vs pay-at-end scenarios and regression for normal checkout.

## Coder notes
- **Backend:** `PUT /orders/{id}/mark-paid` already allows pre-payment while items are not delivered (see comment in `main.py`). `PUT /orders/{id}/finish` still marks all active lines delivered and then pays (fast checkout).
- **Frontend:** **Pay now** is shown on **Active** and **Not paid yet** order cards for users with `order:mark_paid` (secondary when **Finish** is also shown; primary when the user only has mark-paid). The payment modal shows **`ORDERS.PAY_NOW_HELP`** when not in finish mode.
- **Test:** `back/tests/test_order_prepay.py` — mark-paid on a **preparing** order leaves line items **preparing**.

## Testing instructions

### What to verify
- Staff can open **Pay now** from an unpaid order card, complete the payment modal, and the order becomes **paid** while kitchen line statuses are unchanged.
- **Finish** still delivers all lines and pays in one step.
- API regression: mark-paid accepted before all items are served.

### How to test
1. **Backend:** With stack up,  
   `docker compose -f docker-compose.yml -f docker-compose.dev.yml exec back python3 -m pytest tests/test_order_prepay.py -v`
2. **Frontend build:**  
   `docker compose -f docker-compose.yml -f docker-compose.dev.yml logs --tail=80 front` — no TS/Angular errors after changes.
3. **Smoke:** From `front/`,  
   `BASE_URL=http://127.0.0.1:4202 npm run test:landing-version`  
   (requires app on 4202 and optional `.env` demo login for full nav).
4. **Manual:** Log in as a user with **mark paid**; open **Orders** → **Active** or **Not paid yet**; confirm **Pay now** appears next to **Finish** (if applicable); pay a non-completed order and confirm status **Paid** and items still on prior kitchen status.

### Pass/fail criteria
- **Pass:** Pytest prepay test green; front build clean; smoke test exit 0; manual pay-early flow works.
- **Fail:** Any of the above fails or mark-paid incorrectly changes line items before finish.
