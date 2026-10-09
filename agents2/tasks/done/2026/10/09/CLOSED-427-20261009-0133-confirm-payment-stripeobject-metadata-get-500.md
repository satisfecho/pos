---
## Closing summary (TOP)

- **What happened:** Guest confirm-payment returned HTTP 500 after Stripe succeeded because `intent.metadata.get("order_id")` fails on stripe-python 16.0.0 `StripeObject` metadata.
- **What was done:** Added `_stripe_metadata_get` and wired `confirm_payment` through it; tests mock real StripeObject metadata; docs note the helper.
- **What was tested:** 7 pytest passed (payment security + SlowAPI confirm); StripeObject `.get` cold-check and helper check in `pos-back` — overall PASS.
- **Why closed:** All criteria passed; controlled 400s retained for bad metadata/amount.
- **Closed at (UTC):** 2026-10-09 01:39
---

# Fix confirm-payment HTTP 500 (Stripe metadata StripeObject)

## GitHub Issues
- **Issue:** https://github.com/satisfecho/pos/issues/427
- **427**

## Status
- **Implemented** (agent 010) — ready for tester
- **Root cause confirmed** in `pos-back` with stripe-python **16.0.0**: `PaymentIntent.metadata` is `StripeObject`; `.get("order_id")` raises `AttributeError` (use `.to_dict()` / helper).

## Problem / goal
Guest Stripe **create-payment-intent** succeeds (follow-up after #425 SlowAPI/`JSONResponse`), but **confirm-payment** returns **HTTP 500** after Stripe reports a succeeded PaymentIntent. Suspected crash: `confirm_payment` in `back/app/main.py` calls `intent.metadata.get("order_id")` while live Stripe SDK exposes `metadata` as a `StripeObject` (not a plain `dict`), raising `AttributeError`. Payment can already be captured while the order never reaches the mark-paid path — guest error + unpaid order with money taken.

Treat the StripeObject diagnosis as a **hypothesis to cold-verify** against the installed `stripe` version in `pos-back` before merging a fix. Related docs: `docs/0020-rate-limiting-production.md` (confirm returns `JSONResponse`), `docs/SECURITY-REVIEW.md` (guest pay / metadata checks).

## High-level instructions for coder
- Cold-read `confirm_payment` and how `intent.metadata` behaves with the Stripe SDK version in the running backend image; confirm or revise the root cause before coding.
- Fix metadata access so real StripeObject metadata works and missing/wrong `order_id` still yields a controlled **400** (mismatch), not **500**. Keep the existing `JSONResponse` / SlowAPI contract from #425.
- Harden tests: mock metadata as StripeObject-like (not only a bare `dict`) so a `.get` regression fails in CI; cover success and mismatch under rate limiting where practical.
- Prefer a minimal crash fix; do not redesign payments, bulk-cancel live PaymentIntents, or delete/wipe orders/payments/guests. Prefer mocks / test DB; no junk paid rows left behind.
- If a live order was charged but left unpaid (e.g. production reconcile of a specific order), document a **non-destructive** verify-against-Stripe then mark-paid plan — do not delete the order to “fix” the symptom. No secrets or table tokens in task/PR/fixtures.
- Verify: confirm success path HTTP 200 + order marked paid; mismatch still 400; #425 SlowAPI path does not regress; optional staging smoke create → succeed → confirm.

## What was changed
- Added `_stripe_metadata_get` in `back/app/main.py`; `confirm_payment` uses it instead of `intent.metadata.get`.
- Tests use real `StripeObject.construct_from` metadata (success, mismatch, missing `order_id`, helper unit test).
- SlowAPI subprocess regression (#425) also uses StripeObject metadata for confirm.
- Docs: `docs/SECURITY-REVIEW.md`, `docs/0020-rate-limiting-production.md` note the helper.

## Non-destructive reconcile (charged but unpaid)
If a guest PaymentIntent **succeeded** in Stripe but the order stayed unpaid because confirm 500’d:

1. In Stripe Dashboard (or API), open the PaymentIntent → confirm `status=succeeded`, amount, and metadata `order_id` / `tenant_id`.
2. In POS, open that order (staff) — do **not** delete the order or cancel the PaymentIntent.
3. If Stripe shows paid and amounts match: use staff **Mark as paid** / existing pay path with method reflecting Stripe (or re-call confirm-payment after deploy with the same `payment_intent_id` + guest token). Prefer verify-then-mark-paid; never wipe payment rows to “fix” the UI.
4. Do not paste secrets, table tokens, or PI secrets into issues/tasks.

## Testing instructions
1. In `pos-back` container:
   ```bash
   docker compose -f docker-compose.yml -f docker-compose.dev.yml exec -T back \
     python3 -m pytest tests/test_payment_security.py \
     tests/test_create_payment_intent_slowapi_subprocess.py -q --tb=short
   ```
   Expect **7 passed** (includes StripeObject helper, success 200, order mismatch 400, missing metadata 400, amount mismatch 400, SlowAPI create+confirm).
2. Optional: cold-check stripe metadata still has no `.get`:
   ```bash
   docker compose -f docker-compose.yml -f docker-compose.dev.yml exec -T back \
     python3 -c "from stripe import StripeObject; m=StripeObject.construct_from({'order_id':'1'},None); m.get('order_id')"
   ```
   Expect `AttributeError` mentioning `to_dict()`.
3. Optional staging smoke: guest create-payment-intent → Stripe succeed → confirm-payment → HTTP 200 and order paid.
4. Regression: confirm still returns JSON (SlowAPI) — covered by subprocess test with `RATE_LIMIT_ENABLED=true`.

## Test report

1. **Date/time (UTC):** 2026-10-09T01:38:31Z start → 2026-10-09T01:38:52Z end. Log window: `pos-back` ~01:37–01:39 UTC (pytest + cold-check).
2. **Environment:** `docker-compose.yml` + `docker-compose.dev.yml`; containers `pos-back` (Up), `pos-postgres`/`pos-redis` healthy; branch `development`; stripe-python **16.0.0** in `pos-back`. No browser / `BASE_URL` N/A.
3. **What was tested:** Payment security + SlowAPI confirm path with StripeObject metadata; cold-check that raw `StripeObject.get` still raises; helper `_stripe_metadata_get` returns values from StripeObject.
4. **Results:**
   - **PASS** — Required pytest: `7 passed` in 3.28s (`tests/test_payment_security.py` + `tests/test_create_payment_intent_slowapi_subprocess.py`).
   - **PASS** — StripeObject cold-check: `m.get('order_id')` raises `AttributeError: 'get' is a dict method, but a StripeObject is not a dict. Use .to_dict()…` (confirms root cause still valid on 16.0.0).
   - **PASS** — `_stripe_metadata_get(StripeObject.construct_from({…}), 'order_id')` returned `42` inside `pos-back`.
   - **PASS** — SlowAPI JSONResponse create+confirm regression included in the 7 passed (subprocess with rate limit).
   - **N/A** — Optional live staging create→succeed→confirm smoke not run (mocked suite covers success 200 / mismatch 400 / missing metadata 400).
5. **Overall:** **PASS**
6. **Product owner feedback:** Guest confirm-payment no longer crashes on Stripe’s non-dict metadata; controlled 400s remain for bad order_id/amount. Safe to close #427 after closer archives; optional live Stripe smoke can wait for next guest pay on staging if desired.
7. **URLs tested:** N/A — no browser
8. **Relevant log excerpts (last section):**

```text
# pytest (pos-back)
.......                                                                  [100%]
7 passed, 1 warning in 3.28s

# StripeObject .get cold-check (expected failure)
AttributeError: 'get' is a dict method, but a StripeObject is not a dict. Use .to_dict() to convert it.

# helper check
helper 42
stripe 16.0.0

# pos-back --since 10m: no AttributeError / confirm-payment HTTP 500 tied to metadata.get
```
