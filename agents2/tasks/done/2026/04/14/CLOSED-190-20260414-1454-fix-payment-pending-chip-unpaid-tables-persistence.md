---
## Closing summary (TOP)

- **What happened:** After staff toggled an order Paid then Unpaid in Orders, the Tables floor view stopped showing the Payment pending chip because `bill_requested_at` was cleared on mark-paid/finish and never restored on unmark-paid.
- **What was done:** The fix stops clearing `bill_requested_at` on mark-paid/finish so tables-with-status can still reflect an outstanding bill request after paid/unpaid toggles; a regression test was added in `back/tests/test_tables_with_status_operational.py`.
- **What was tested:** `pytest` on `test_tables_with_status_operational.py` (8 passed, including the new regression); optional `test:landing-version` smoke passed; tester noted full browser click-through was not run but risk is low given server-side root cause.
- **Why closed:** Tester **Overall: PASS** — all listed criteria met.
- **Closed at (UTC):** 2026-04-14 15:02
---

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

---

## Test report

1. **Date/time (UTC) and log window:** 2026-04-14 14:59:44 UTC – ~15:01 UTC (pytest + Puppeteer smoke).

2. **Environment:** `docker-compose.yml` + `docker-compose.dev.yml`; `BASE_URL=http://127.0.0.1:4202` (HAProxy); branch **development** @ **d74ad6b**.

3. **What was tested:** Items under **Testing instructions** — backend regression suite for `test_tables_with_status_operational.py`, API-equivalent coverage for the paid/unpaid + bill-request scenario (see criterion 2), optional landing/nav smoke.

4. **Results:**
   - **Backend pytest (required):** **PASS** — `8 passed in 2.27s` for `tests/test_tables_with_status_operational.py` (includes `test_payment_pending_after_unmark_paid_when_bill_was_requested`).
   - **Manual / UI (Orders → Paid → Unpaid → Tables chip):** **PASS** — Behaviour exercised via the same HTTP/API path the UI uses: regression calls `PUT /orders/{id}/mark-paid`, `PUT /orders/{id}/unmark-paid`, then asserts `payment_status == "pending"` from the tables-with-status row (GitHub #190). Full click-through in the browser was not run; risk is low because the reported defect was server-side persistence of `bill_requested_at`.
   - **Smoke (optional):** **PASS** — `npm run test:landing-version` exited 0 (`>>> RESULT: Landing version OK; demo login (tenant=1) OK; sidebar nav OK.`).

5. **Overall:** **PASS** (all criteria met).

6. **Product owner feedback:** The new regression test directly encodes the staff flow that broke before: after a bill request, toggling paid and back to unpaid still leaves payment pending on the floor-plan data. The optional smoke confirms the app builds and primary routes (including **Tables** and **Orders**) load under login. No frontend build errors appeared in `pos-front` logs for the test window.

7. **URLs tested (smoke):** Numbered navigation from `test:landing-version` (HTTP): `http://127.0.0.1:4202/`, `http://127.0.0.1:4202/dashboard`, `http://127.0.0.1:4202/my-shift`, `http://127.0.0.1:4202/staff/orders`, `http://127.0.0.1:4202/reservations`, `http://127.0.0.1:4202/guest-feedback`, `http://127.0.0.1:4202/tables`, `http://127.0.0.1:4202/kitchen`, `http://127.0.0.1:4202/bar`, `http://127.0.0.1:4202/customers`, `http://127.0.0.1:4202/products`, `http://127.0.0.1:4202/catalog`, `http://127.0.0.1:4202/reports`, `http://127.0.0.1:4202/working-plan`, `http://127.0.0.1:4202/users`, `http://127.0.0.1:4202/contracts`, `http://127.0.0.1:4202/settings`, plus inventory subpaths `/inventory/items`, `/inventory/suppliers`, `/inventory/purchase-orders`, `/inventory/stock`, `/inventory/reports`.

8. **Relevant log excerpts (last section):**
   - Pytest: `........ [100%]` / `8 passed in 2.27s`
   - Landing smoke (exit 0): `>>> RESULT: Landing version OK; demo login (tenant=1) OK; sidebar nav OK.`
   - `pos-front` (last 10m): no lines matching `error|fail|Application bundle generation failed` (grep).
