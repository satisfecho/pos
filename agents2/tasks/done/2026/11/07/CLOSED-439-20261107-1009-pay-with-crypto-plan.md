---
## Closing summary (TOP)

- **What happened:** Issue #439 shipped an MVP for guest Stripe Crypto stablecoin pay (fiat-settled) on public menu and delivery after human decisions cleared the blocked gate.
- **What was done:** Added `tenant.stripe_crypto_enabled`, Settings toggle, `create-payment-intent?method=crypto`, confirm `payment_method=crypto`, menu/delivery Pay with crypto UI, i18n, docs 0080, and payment-security tests; rebuilt stale prod nginx front so the served SPA includes the crypto controls.
- **What was tested:** Retest PASS after front rebuild - bundle sanity, migration, pytest (9 passed), Settings/menu/delivery UI, negative API 400 when off, docs 0080, smoke 200; live Stripe Crypto Dashboard pay left as optional follow-up.
- **Why closed:** All tester pass/fail criteria passed for the agreed MVP slice.
- **Closed at (UTC):** 2026-11-10 13:20
---

# Plan + MVP: pay with crypto (#439)

## GitHub Issues
- **Issue:** https://github.com/satisfecho/pos/issues/439
- **439**

## Status
- **Implemented (MVP slice)** after human decisions on #439 (2026-11-10T12:45:42Z).
- Cleared blocked / waiting-human gate. Work moved FEAT → WIP → UNTESTED.
- **Coder rework (2026-11-10T13:16:51Z):** Tester FAIL was stale prod nginx front image (source already had crypto UI). Rebuilt `pos-front` via `Dockerfile.prod` + recreated container. Bundle now includes settings/menu/delivery crypto strings. Returning **WIP → UNTESTED** for UI retest.
- **Tester retest PASS (2026-11-10T13:17:22Z → 2026-11-10T13:19:53Z):** UI present after front rebuild; renamed **TESTING → CLOSED**.

## Human decisions recorded (#439)
1. Approach: fiat-settled custodial (A)
2. Surface: MVP (public menu + delivery)
3. Provider: Stripe-if-EU (ES listed for Stripe stablecoin / Crypto)
4. Assets: stablecoins only
5. Refunds: processor crypto refund
6. Docs: OK → `docs/0080-stripe-crypto-stablecoin-payments.md`

## Problem / goal
Product ask: explore **payment via cryptocurrency**, then ship agreed MVP. Guest can pay with stablecoins via Stripe Crypto; restaurant gets fiat settlement in Stripe balance. Align with existing Stripe/Revolut guest pay flows.

## What shipped
- Migration `tenant.stripe_crypto_enabled` + Settings toggle.
- `POST /orders/{id}/create-payment-intent?method=crypto` with `payment_method_types=["crypto"]` and metadata `pay_kind=crypto`.
- `confirm-payment` sets `payment_method=crypto` when `pay_kind=crypto`.
- Menu + delivery UI: Pay with crypto; redirect return → confirm.
- i18n (all locales), docs 0080, CHANGELOG Unreleased, payment security tests.

## High-level instructions for coder
- Do not add payment provider API keys or sandbox credentials to the repo.
- Offline: crypto remains online-only.
- Out of scope for this slice: staff POS crypto, split-bill crypto legs, BitPay/Coinbase, DIY wallets.

## Adaptation plan (010) - 2026-11-07T10:15:36Z
(See git history / earlier FEAT body for full options table; recommendation A implemented.)

## Coder notes (2026-11-10T13:16:51Z)

- Environment uses **prod overlay** (`docker-compose.yml` + `docker-compose.prod.yml`); `pos-front` is nginx static, not `ng serve`.
- Fix for tester FAIL: `COMMIT_HASH=$(git rev-parse --short HEAD) docker compose -f docker-compose.yml -f docker-compose.prod.yml --env-file config.env build front && ... up -d front`.
- Post-rebuild checks: `docker exec pos-front grep stripe_crypto_enabled /usr/share/nginx/html/*.js` hits settings chunk; menu has `PAY_WITH_CRYPTO`; delivery has `payWithCrypto`; `https://127.0.0.1/` and `/api/health` → 200.
- No further product code changes in this pass (MVP already in `back/` + `front/src`).

## Testing instructions

### What to verify
1. Served SPA includes crypto Settings toggle and guest Pay with crypto (not a stale nginx image).
2. Backend crypto gate still works (toggle on/off, payment-intent method=crypto).
3. Menu + delivery show crypto when configured; Settings can enable the toggle.

### How to test
Environment: `docker-compose.yml` + `docker-compose.prod.yml`; `BASE_URL=https://127.0.0.1` (HAProxy HTTPS).

1. **Bundle sanity (quick):** `docker exec pos-front sh -c 'grep -c stripe_crypto_enabled /usr/share/nginx/html/*.js'` → count > 0. Also expect `PAY_WITH_CRYPTO` / `payWithCrypto` in menu/delivery chunks.
2. **Migration:** `docker compose -f docker-compose.yml -f docker-compose.prod.yml exec back python -m app.migrate` → schema includes `tenant.stripe_crypto_enabled` (version ≥ `20261110140000`).
3. **Unit:** `docker compose -f docker-compose.yml -f docker-compose.prod.yml exec back python3 -m pytest tests/test_payment_security.py -q` → all pass.
4. **Settings:** Log in as owner → Settings → Payments → checkbox `name="stripe_crypto_enabled"` (**Accept crypto (stablecoins) via Stripe**). Enable + save. GET `/api/tenant/settings` → `stripe_crypto_enabled: true`.
5. **Menu:** With Stripe keys + crypto toggle on, open table menu pay sheet → **Pay with crypto**. (Full Stripe Crypto sandbox pay optional if Dashboard Crypto enabled.)
6. **Delivery:** `/delivery/1` checkout shows **Pay with crypto** when configured.
7. **Negative:** Toggle off → no crypto button; `POST .../create-payment-intent?method=crypto` → 400.
8. **Docs:** `docs/0080-stripe-crypto-stablecoin-payments.md`.
9. **Smoke:** `curl -sk -o /dev/null -w "%{http_code}" https://127.0.0.1/` → 200; `/api/health` → 200.

### Pass/fail criteria
- **PASS** if Settings shows the crypto checkbox, menu and delivery show Pay with crypto when enabled, API negative still 400 when off, pytest green, smoke 200.
- **FAIL** if served JS still lacks `stripe_crypto_enabled` / crypto pay controls, or Settings/menu/delivery UI missing after hard refresh.

## Prior test report (FAIL - stale front; coder rebuilt)

- **Date/time (UTC):** 2026-11-10T13:08:37Z start → 2026-11-10T13:12:33Z end
- **Log window:** ~2026-11-10T13:08Z–13:12Z (plus prior migrate apply ~12:56Z)
- **Environment:** branch `development`; compose `docker-compose.yml` + `docker-compose.dev.yml` (running `pos-front` is nginx prod image serving `/usr/share/nginx/html`); `BASE_URL=https://127.0.0.1`
- **What was tested:** Testing instructions 1–8 (migration, pytest, settings API + UI, menu pay sheet, delivery create/UI, negative API, docs 0080, landing smoke)

### Results

1. **Migration** - **PASS** - `python -m app.migrate` up to date; column `tenant.stripe_crypto_enabled` present; schema version `20261110140000`.
2. **Unit (test_payment_security.py)** - **PASS** - `9 passed` in 2.60s (crypto toggle required, `payment_method_types=crypto`, confirm → `payment_method=crypto`).
3. **Settings** - **FAIL** (UI) / API **PASS** - `PUT/GET /api/tenant/settings` with owner JWT sets/returns `stripe_crypto_enabled: true`. Settings → Payment Settings in the **served** SPA has Stripe key fields but **no** `input[name="stripe_crypto_enabled"]`. Source under `front/src` contains the checkbox; nginx bundle has **0** matches for `stripe_crypto_enabled` / `Pay with crypto` / `STRIPE_CRYPTO_ENABLED` (stale front image, created ~2026-11-10T12:30Z).
4. **Menu Pay with crypto** - **FAIL** - With toggle + temp test keys, `GET /api/menu/{token}` returns `tenant_stripe_crypto_configured: true`. Served menu pay sheet does **not** show **Pay with crypto** (bundle lacks crypto UI). Full Stripe sandbox pay + return confirm not reached (blocked by missing UI; API with placeholder keys returned Stripe `Invalid API Key` 400 as expected for non-real keys).
5. **Delivery** - **FAIL** (UI button) / API **PASS** - `POST /api/public/tenants/1/satisfecho-delivery` returns `stripe_crypto_configured: true` when enabled. `/delivery/1` loads, but served checkout has no **Pay with crypto** control (same stale bundle).
6. **Negative** - **PASS** (API) - Toggle off → menu `tenant_stripe_crypto_configured: false`; `POST .../create-payment-intent?method=crypto` → **400** `Crypto payments are not enabled for this restaurant`. UI absence of crypto when off not re-checked in browser (crypto never present in bundle).
7. **Docs** - **PASS** - `docs/0080-stripe-crypto-stablecoin-payments.md` has decision table, behaviour, API, and out-of-scope.
8. **Smoke** - **PASS** - `https://127.0.0.1/` → 200; `https://127.0.0.1/api/health` → 200 `{"status":"ok"}`.

- **Overall:** **FAIL** - Failed criteria: **3 (Settings UI)**, **4 (Menu Pay with crypto UI)**, **5 (Delivery Pay with crypto UI)**. Root cause: running `pos-front` nginx static build does not include #439 front changes; backend/API MVP behaves correctly. Coder should rebuild/redeploy front image (or run `ng serve` dev front) then return task to **UNTESTED**.
- **Product owner feedback:** Backend slice for Stripe crypto is in place (migration, settings API, menu/delivery flags, payment-intent gate). Guests and owners still cannot see or use **Pay with crypto** on this environment until the frontend image is rebuilt with the settings toggle and menu/delivery buttons. After rebuild, retest UI plus a real Stripe test-mode Crypto Dashboard path if available.
- **URLs tested:**
  1. `https://127.0.0.1/`
  2. `https://127.0.0.1/api/health`
  3. `https://127.0.0.1/settings` (Payment Settings)
  4. `https://127.0.0.1/menu/4177c86c-314b-420c-a349-e61c6c6407f1` (Take Away)
  5. `https://127.0.0.1/delivery/1`
- **Cleanup:** Temporary tenant test Stripe keys cleared (`stripe_crypto_enabled=false`, keys null). Temp JWT files removed from `tmp/`.

### Relevant log excerpts

```
INFO: Database schema version (max applied): 20261110140000
... 20261110140000_tenant_stripe_crypto_enabled.sql ... status: applied
✅ Database schema version: 20261110140000

.........                                                                [100%]
9 passed, 3 warnings in 2.60s

stripe - INFO - error_message='Invalid API Key provided: sk_test_**********_439'
POST /orders/5655/create-payment-intent?...&method=crypto HTTP/1.1" 400
POST /orders/5655/create-payment-intent?...&method=crypto HTTP/1.1" 400
  (second call after toggle off: detail Crypto payments are not enabled...)

pos-front nginx: GET / HTTP/1.1" 200
docker exec grep stripe_crypto_enabled /usr/share/nginx/html/*.js → 0 matches
```

## Test report (PASS - UI retest after front rebuild)

- **Date/time (UTC):** 2026-11-10T13:17:22Z start → 2026-11-10T13:19:53Z end
- **Log window:** ~2026-11-10T13:17Z–13:20Z
- **Environment:** branch `development`; compose `docker-compose.yml` + `docker-compose.prod.yml`; `pos-front` nginx image created 2026-11-10T13:16:31Z; `BASE_URL=https://127.0.0.1`
- **What was tested:** Testing instructions 1–9 (bundle sanity, migration, pytest, Settings UI+API, menu Pay with crypto, delivery Pay with crypto, negative API, docs 0080, smoke). Contrast check on Settings / menu pay sheet / delivery pay buttons.

### Results

1. **Bundle sanity** - **PASS** - `stripe_crypto_enabled` in `chunk-L2RG7CSM.js` (2 hits); `PAY_WITH_CRYPTO` in `chunk-DZ3H4L3G.js`; `payWithCrypto` in `chunk-Y4DK7BYG.js`.
2. **Migration** - **PASS** - schema up to date `20261110140000`; column `tenant.stripe_crypto_enabled` present.
3. **Unit (test_payment_security.py)** - **PASS** - `9 passed` in 2.83s.
4. **Settings** - **PASS** - Owner Settings → Payment Settings shows `input[name="stripe_crypto_enabled"]` labeled **Accept crypto (stablecoins) via Stripe** (checked when enabled). GET `/api/tenant/settings` returns `stripe_crypto_enabled: true` after enable. Screenshot `tmp/settings-payments-439.png`. Contrast OK (label dark on white; checked control readable).
5. **Menu Pay with crypto** - **PASS** - With toggle + temp test Stripe keys, menu pay sheet shows **Pay with crypto** / stablecoins via Stripe. Screenshot `tmp/menu-pay-439.png`. Full Stripe Crypto Dashboard sandbox pay not run (placeholder keys → Stripe Invalid API Key 400 as expected). Contrast OK (option title readable on white sheet).
6. **Delivery** - **PASS** - Create API returns `stripe_crypto_configured: true`. Puppeteer checkout reaches pay step with buttons **Pay by card**, **Pay with Revolut**, **Pay with crypto**. Screenshot `tmp/delivery-pay-439.png`. Contrast OK (crypto secondary button dark text on light grey).
7. **Negative** - **PASS** - Toggle off → menu `tenant_stripe_crypto_configured: false`; `POST /orders/5655/create-payment-intent?method=crypto&table_token=…` → **400** `Crypto payments are not enabled for this restaurant` (after clearing Redis rate-limit key from earlier 429).
8. **Docs** - **PASS** - `docs/0080-stripe-crypto-stablecoin-payments.md` present with decisions, behaviour, API, out-of-scope.
9. **Smoke** - **PASS** - `https://127.0.0.1/` → 200; `https://127.0.0.1/api/health` → 200 `{"status":"ok"}`.

- **Overall:** **PASS**
- **Product owner feedback:** After the prod front rebuild, owners can enable **Accept crypto (stablecoins) via Stripe** and guests see **Pay with crypto** on menu and delivery. Backend gate and payment-security tests remain solid. A live Stripe test-mode Crypto Dashboard payment was not exercised here (needs real Dashboard Crypto + sandbox keys); that is optional follow-up, not a blocker for this MVP slice.
- **URLs tested:**
  1. `https://127.0.0.1/`
  2. `https://127.0.0.1/api/health`
  3. `https://127.0.0.1/settings` (Payment Settings)
  4. `https://127.0.0.1/menu/4177c86c-314b-420c-a349-e61c6c6407f1` (Take Away)
  5. `https://127.0.0.1/delivery/1`
- **Cleanup:** Tenant 1 `stripe_crypto_enabled=false`; temp Stripe keys cleared to null. Temp JWT removed from `tmp/`.

### Relevant log excerpts

```
INFO: Database is up to date (version 20261110140000)
✅ Database schema version: 20261110140000

.........                                                                [100%]
9 passed, 3 warnings in 2.83s

docker exec grep: stripe_crypto_enabled → chunk-L2RG7CSM.js:2
PAY_WITH_CRYPTO → chunk-DZ3H4L3G.js; payWithCrypto → chunk-Y4DK7BYG.js

POST /orders/5655/create-payment-intent?...&method=crypto → 400
  detail: Crypto payments are not enabled for this restaurant

pos-front nginx: GET /settings 200; GET /menu/... 200; GET /delivery/1 200; GET / 200
pos-back: GET /health 200
```
