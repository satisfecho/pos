---
## Closing summary (TOP)

- **What happened:** Guest menu order create allowed unbounded line quantities, so negative values could shrink the payable total and underpay take-away.
- **What was done:** `OrderItemCreate.quantity` was constrained with `ge=1` (guest create/merge, delivery, offline sync), payment-security tests were extended, and `docs/SECURITY-REVIEW.md` was updated.
- **What was tested:** `tests/test_payment_security.py` in Docker - 12 passed, including reject negative/zero quantity and PaymentIntent amount matching server-side quantity.
- **Why closed:** All testing criteria passed; advisory gap for this path is closed without breaking happy-path qty >= 1 orders.
- **Closed at (UTC):** 2026-11-10 20:40
---

# Security: block negative-quantity price tampering on guest menu orders

## GitHub Issues
- **Issue:** https://github.com/satisfecho/pos/issues/440
- **440**
- **Advisory:** https://github.com/satisfecho/pos/security/advisories/GHSA-hm8g-49xv-2j5m
- **GHSA:** GHSA-hm8g-49xv-2j5m

## Problem / goal
Public guest order create accepts unbounded line `quantity`. Negative quantities can reduce the guest payable total so a take-away guest can underpay. Enforce `quantity >= 1` on create/merge paths and keep payment totals consistent with server-side quantities.

## High-level instructions for coder
- Prefer `production-urgent` / security fix on `development`, then promote when ready.
- Validate guest order item quantity lower bound in the API model and create-order path.
- Confirm guest payment amount uses the same server-side totals after the guard.
- Add or extend backend tests for rejected negative (and zero) quantities.
- Do not copy exploit steps from the advisory into code comments or commits.
- Point to related payment/order docs if useful.

## Status
- Implemented by agent 010 (feature coder) on `development` (production-urgent / GHSA-hm8g-49xv-2j5m).
- `OrderItemCreate.quantity` now requires `ge=1` (covers guest menu create/merge, delivery create, offline sync lines).
- Guest Stripe PaymentIntent amount continues to use server-side order item quantities.
- Docs: `docs/SECURITY-REVIEW.md` guest-payments row updated.
- Ready for tester (UNTESTED).

## What changed
- `back/app/models.py` - `OrderItemCreate.quantity = Field(ge=1)`.
- `back/tests/test_payment_security.py` - reject negative/zero quantity; PaymentIntent amount matches qty 2.
- `docs/SECURITY-REVIEW.md` - note quantity lower bound + test pointer.

## Testing instructions
1. In Docker backend:
   `docker compose -f docker-compose.yml -f docker-compose.dev.yml exec -T back python3 -m pytest tests/test_payment_security.py -q`
   Expect all tests green, including:
   - `test_guest_order_rejects_negative_quantity`
   - `test_guest_order_rejects_zero_quantity`
   - `test_guest_payment_intent_amount_matches_server_quantity`
2. Optional manual: `POST /menu/{table_token}/order` with a line `quantity` of `0` or a negative value must return **422**; a normal `quantity: 1` order must still succeed and create-payment-intent amount must match `price_cents * quantity` from the DB.
3. Do not paste advisory exploit steps into comments or commits.

## Test report

1. **Date/time (UTC):** 2026-11-10T20:38:45Z start - 2026-11-10T20:39:29Z end. Log window: pos-back since ~20:38Z.
2. **Environment:** `docker-compose.yml` + `docker-compose.dev.yml`; branch `development`; pytest inside `pos-back`. No browser (`BASE_URL` N/A).
3. **What was tested:** Guest order quantity lower bound (`ge=1`) and PaymentIntent amount aligned with server-side quantity via `tests/test_payment_security.py` (full module + the three named cases). Optional live HTTP manual check not required (covered by TestClient tests).
4. **Results:**
   - Full module `tests/test_payment_security.py -q`: **PASS** - `12 passed, 3 warnings in 2.62s`.
   - `TestPaymentSecurity::test_guest_order_rejects_negative_quantity`: **PASS**.
   - `TestPaymentSecurity::test_guest_order_rejects_zero_quantity`: **PASS**.
   - `TestPaymentSecurity::test_guest_payment_intent_amount_matches_server_quantity`: **PASS**.
5. **Overall:** **PASS**
6. **Product owner feedback:** Negative and zero guest line quantities are rejected before an underpaid total can be created. PaymentIntent amount follows DB quantities, which closes the advisory gap for this path without changing happy-path qty >= 1 orders.
7. **URLs tested:** N/A - no browser
8. **Relevant log excerpts (last section):**
```
............                                                             [100%]
12 passed, 3 warnings in 2.62s

tests/test_payment_security.py::TestPaymentSecurity::test_guest_order_rejects_negative_quantity PASSED
tests/test_payment_security.py::TestPaymentSecurity::test_guest_order_rejects_zero_quantity PASSED
tests/test_payment_security.py::TestPaymentSecurity::test_guest_payment_intent_amount_matches_server_quantity PASSED
```
No application traceback/500 in `pos-back` logs for the pytest window (suite uses TestClient; no live guest HTTP traffic).
