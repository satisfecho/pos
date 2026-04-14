# Fix payment-pending chip lost after marking order unpaid in Orders; restore correct persistence on Tables view

## GitHub Issues
- **Issue:** https://github.com/satisfecho/pos/issues/190
- **190**

## Problem / goal
After staff marks an order **Unpaid** (or equivalent) in **Orders**, returning to **Tables** no longer shows the **Payment pending** chip when it should. Payment-request / bill-request state must stay consistent across views and after toggling paid/unpaid.

**Expected:** If a payment or bill request is still valid, data used by the floor canvas (e.g. `/tables/with-status` or equivalent) must still expose pending payment status. Marking unpaid must not permanently clear markers that drive `payment_pending` unless product rules say so (e.g. only fully **paid** clears the request).

## High-level instructions for coder
- Trace the **Orders → Unpaid** handler: confirm it does not wipe `bill_requested_at`, request-payment metadata (`payment_method`, etc.), or other fields that feed **payment pending**, unless a deliberate reset is required.
- Ensure **GET `/tables/with-status`** (or the API the canvas uses) recomputes payment chip state from authoritative order/table fields after an unpaid transition.
- Verify the **Tables** canvas does not keep stale table payloads after navigation; refetch or merge so the view matches server truth after leaving Orders.
- **Acceptance:** Request payment → exercise unpaid flows → return to **Tables** → chip visibility matches whether payment is still outstanding per product rules.
- Add a **regression test** if the backend test suite has a suitable place for it.

## Implementation summary
- **Root cause:** `PUT /orders/{id}/mark-paid` and `PUT /orders/{id}/finish` set `bill_requested_at = None`. Staff **Unpaid** (`unmark-paid`) does not restore it, so `GET /tables/with-status` no longer saw a bill request after the paid/unpaid toggle.
- **Fix:** Stop clearing `bill_requested_at` on mark-paid / finish. Paid vs pending on the floor is already driven by `order.status == paid` and `paid_at` (see `list_tables_with_status` linked-order branch).
- **Regression test:** `test_payment_pending_after_unmark_paid_when_bill_was_requested` in `back/tests/test_tables_with_status_operational.py`.

## Testing instructions
1. **Backend (required):** From repo root with dev compose up:  
   `docker compose -f docker-compose.yml -f docker-compose.dev.yml exec -T back python3 -m pytest tests/test_tables_with_status_operational.py -q`  
   Expect **8 passed** (includes new regression).
2. **Manual / UI:** On a table with an active order, request payment/bill so **Payment pending** shows on **Tables**. Open **Orders**, mark the order **Paid**, then **Unpaid**. Return to **Tables** → **Payment pending** should still appear for that session while payment is not actually collected per your flow.
3. **Smoke (optional):** `cd front && BASE_URL=http://127.0.0.1:4202 npm run test:landing-version` if the stack is running.
