# Plan + MVP: pay with crypto (#439)

## GitHub Issues
- **Issue:** https://github.com/satisfecho/pos/issues/439
- **439**

## Status
- **Implemented (MVP slice)** after human decisions on #439 (2026-11-10T12:45:42Z).
- Cleared blocked / waiting-human gate. Work moved FEAT → WIP → UNTESTED.

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

## Testing instructions

1. **Migration:** `docker compose -f docker-compose.yml -f docker-compose.dev.yml exec back python -m app.migrate` → schema includes `tenant.stripe_crypto_enabled` (version ≥ `20261110140000`).
2. **Unit:** `docker compose -f docker-compose.yml -f docker-compose.dev.yml exec back python3 -m pytest tests/test_payment_security.py -q` → all pass (crypto toggle required, create uses `payment_method_types=crypto`, confirm sets `payment_method=crypto`).
3. **Settings:** Log in as owner → Settings → Payments → enable **Accept crypto (stablecoins) via Stripe** (requires Stripe keys). Save. Confirm GET `/tenant/settings` returns `stripe_crypto_enabled: true`.
4. **Menu (requires Stripe test keys + Crypto enabled in Stripe Dashboard):** Open table menu → pay sheet shows **Pay with crypto**. Click starts redirect to Stripe crypto page (or clear Stripe error if Dashboard Crypto not enabled). After sandbox pay, return URL confirms order paid with `payment_method=crypto`.
5. **Delivery:** Same toggle → delivery checkout shows **Pay with crypto** beside card/Revolut.
6. **Negative:** With toggle off, menu must not show crypto; `create-payment-intent?method=crypto` returns 400.
7. **Docs:** Skim `docs/0080-stripe-crypto-stablecoin-payments.md` for decision table and out-of-scope.
8. **Smoke:** App responds (e.g. HTTPS landing 200). Optional: `BASE_URL=https://127.0.0.1 npm run test:landing-version --prefix front` if certs allow, or internal `wget` via haproxy to `pos-front`.
