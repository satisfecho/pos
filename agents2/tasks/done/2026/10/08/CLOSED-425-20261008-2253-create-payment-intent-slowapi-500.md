---
## Closing summary (TOP)

- **What happened:** Guest checkout could get HTTP 500 on create-payment-intent after Stripe already succeeded because SlowAPI could not inject rate-limit headers onto a bare dict return.
- **What was done:** `create_payment_intent` and `confirm_payment` now return `JSONResponse` (matching other limited endpoints); docs and automated coverage were updated; Revolut left out of scope.
- **What was tested:** Required pytest suite (7 tests) passed including SlowAPI-enabled subprocess regression; pos-back logs showed no SlowAPI Response TypeError.
- **Why closed:** All acceptance criteria passed.
- **Closed at (UTC):** 2026-10-08 22:59
---

# Fix HTTP 500 on create-payment-intent after Stripe succeeds (SlowAPI)

## GitHub Issues
- **Issue:** https://github.com/satisfecho/pos/issues/425
- **425**

## Status
- **In progress → implemented** (010 feature coder)
- Cold review confirmed: both endpoints used `@limiter.limit` + bare `dict` return while `headers_enabled=True` in `rate_limits.py`.

## Problem / goal
Guest checkout can get **HTTP 500** on `POST /orders/{order_id}/create-payment-intent` even when **Stripe already created** the PaymentIntent successfully. Production logs (2026-10-08 UTC) show Stripe `200` followed by SlowAPI raising that `response` must be a Starlette `Response` (header injection after a bare `dict` return). Failed attempts still consume the per-order payment rate limit (then **429**).

Treat the SlowAPI/`dict` story as a **strong hypothesis to re-confirm** against current code and limiter settings before changing anything. Same footgun may exist on `confirm_payment` (same limiter pattern); verify separately. Revolut `create-revolut-order` **401/502** in the same window is **out of scope** unless proven related (credentials/config).

Relevant docs: `docs/0020-rate-limiting-production.md`; payment patterns elsewhere that already return `JSONResponse` under `@limiter.limit`.

## High-level instructions for coder
- Cold-review `create_payment_intent` (and likely `confirm_payment`) in `back/app/main.py` against other working SlowAPI-limited endpoints that return a Starlette/`JSONResponse` or accept `response: Response`.
- If confirmed: apply the **smallest** fix consistent with existing in-repo patterns so SlowAPI can attach headers without raising. No drive-by refactors of Stripe, payments, or tenant config.
- Do **not** mix in Revolut credential fixes unless a cold review proves a shared cause.
- Hard constraints: no deleting/wiping tenant or guest data; no junk paid orders or payment-status flips on live orders while testing; prefer mocks / isolated fixtures; do not cancel production Stripe PaymentIntents as part of the fix unless explicitly approved.
- Add/extend automated coverage for the rate-limited success path (mock Stripe): expect **HTTP 200** and the existing body contract (`client_secret`, `payment_intent_id`, `amount`); assert SlowAPI no longer raises on that path.
- Smoke (staging or carefully scoped env): one guest PaymentIntent create → **200**, frontend gets `client_secret`, no 500 in HAProxy/back logs; rate limiting still works.
- See issue #425 for acceptance checklist and verification plan.

## What changed
- `create_payment_intent` and `confirm_payment` now return `JSONResponse` (same pattern as register / product image upload).
- Docs note in `docs/0020-rate-limiting-production.md`.
- Tests: body-contract case in `test_payment_security.py`; SlowAPI-enabled subprocess regression `test_create_payment_intent_slowapi_subprocess.py`.
- Revolut endpoints left unchanged (401/502 was credentials/config, not this footgun).

## Testing instructions

1. **Pytest (required):**
   ```bash
   docker compose -f docker-compose.yml -f docker-compose.dev.yml exec -T back \
     python3 -m pytest \
     tests/test_payment_security.py \
     tests/test_create_payment_intent_slowapi_subprocess.py \
     tests/test_public_satisfecho_delivery.py::TestPublicSatisfechoDelivery::test_create_payment_intent_with_public_token \
     tests/test_public_satisfecho_delivery.py::TestPublicSatisfechoDelivery::test_public_stripe_pay_happy_path \
     -q --tb=short
   ```
   Expect all passed. The subprocess test loads a fresh interpreter with `RATE_LIMIT_ENABLED=true` and mocks Stripe.

2. **Smoke (optional):** Guest checkout create PaymentIntent on local/staging → HTTP 200 with `client_secret`; no SlowAPI `response must be an instance` in `pos-back` logs.

3. **Regression check:** Grep back logs after a successful create — must not show `parameter \`response\` must be an instance of starlette.responses.Response`.

## Test report

1. **Date/time (UTC):** start 2026-10-08T22:57:37Z; end 2026-10-08T22:58:40Z. Log window: pos-back `--since 15m` / `--since 30m` around that interval.
2. **Environment:** `docker-compose.yml` + `docker-compose.dev.yml`; branch `development` @ `f08f00b81`; containers `pos-back` / `pos-front` / `pos-haproxy` / `pos-postgres` / `pos-redis` up. No browser BASE_URL used (API/pytest only).
3. **What was tested:** Required pytest suite for create-payment-intent / confirm-payment SlowAPI JSONResponse fix (#425); regression grep of pos-back logs for SlowAPI Response TypeError; code path confirmation that both endpoints return `JSONResponse`. Optional live guest checkout smoke skipped (subprocess + security tests cover rate-limited success with mocked Stripe).
4. **Results:**
   - Required pytest (7 tests) — **PASS** — `7 passed, 1 warning in 3.06s` (`test_payment_security.py`, `test_create_payment_intent_slowapi_subprocess.py`, two public delivery payment cases).
   - SlowAPI-enabled subprocess regression — **PASS** — `test_create_and_confirm_payment_with_slowapi_enabled_subprocess PASSED` with `RATE_LIMIT_ENABLED=true` and mocked Stripe.
   - Regression log check (no `parameter \`response\` must be an instance of starlette.responses.Response`) — **PASS** — `docker logs pos-back --since 15m`: 0 matches (`NO_SLOWAPI_RESPONSE_ERROR`).
   - Endpoints return `JSONResponse` under `@limiter.limit` — **PASS** — `create_payment_intent` / `confirm_payment` annotated `-> JSONResponse` and return `JSONResponse(content=...)`.
5. **Overall:** **PASS**
6. **Product owner feedback:** Guest checkout should no longer hit HTTP 500 after Stripe already created a PaymentIntent when rate-limit headers are enabled. Automated coverage now exercises the SlowAPI-on success path in a subprocess so this footgun does not regress quietly. Revolut credential failures remain a separate ops issue, as intended.
7. **URLs tested:** N/A — no browser
8. **Relevant log excerpts (last section):**
   ```
   # pytest (compose exec back)
   .......                                                                  [100%]
   7 passed, 1 warning in 3.06s

   # subprocess re-run
   tests/test_create_payment_intent_slowapi_subprocess.py::test_create_and_confirm_payment_with_slowapi_enabled_subprocess PASSED

   # pos-back logs --since 15m
   NO_SLOWAPI_RESPONSE_ERROR
   ```
