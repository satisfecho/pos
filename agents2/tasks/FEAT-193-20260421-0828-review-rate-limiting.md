# Review rate limiting

## GitHub Issues

- **Issue:** https://github.com/satisfecho/pos/issues/193
- **193**

## Problem / goal

Many new backend endpoints were added recently. Ensure **rate limiting** is applied consistently across the API to reduce overload and brute-force risk. Align implementation with documented limits and add coverage where endpoints are missing protection.

Relevant docs: **`docs/0020-rate-limiting-production.md`** (limits, Redis, headers), **`docs/testing.md`** (pytest disables rate limits; `npm run test:rate-limit`), **`docs/README.md`** index entry for rate limits.

## High-level instructions for coder

- Read **`docs/0020-rate-limiting-production.md`** and map how limits are enforced in **`back/`** (middleware, decorators, Redis, per-route config).
- Inventory public and sensitive routes (auth, registration, payments, uploads, admin, public menu/booking APIs) and confirm each category has appropriate limits per the doc (or justify any intentional exception).
- Implement missing rate limits on new or uncovered endpoints; keep behaviour consistent with existing patterns (avoid duplicating logic — reuse shared helpers).
- Run **`npm run test:rate-limit`** (from `front/`, with stack up) and any existing backend tests touching auth; ensure tests still pass (`RATE_LIMIT_ENABLED` behaviour in **`back/tests/conftest.py`** remains correct).
- If you change limits or scope, update **`docs/0020-rate-limiting-production.md`** so production operators and testers stay aligned.
