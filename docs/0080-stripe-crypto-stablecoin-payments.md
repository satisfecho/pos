# Stripe crypto (stablecoin) guest payments (#439)

## Decisions (issue #439)

| Decision | Choice |
|----------|--------|
| Approach | Custodial processor, fiat-settled (EUR/local Stripe balance) |
| MVP surface | Public menu + Satisfecho Delivery (not staff POS / split yet) |
| Provider | Stripe when Crypto/stablecoins is enabled for the merchant (ES/EU private preview / GA per Stripe) |
| Assets | Stablecoins only (Stripe Crypto payment method; no DIY wallets) |
| Refunds | Processor crypto refund to the guest wallet (Stripe Dashboard / Refunds API) |
| Docs | This note |

## Behaviour

1. Owner enables **Accept crypto (stablecoins) via Stripe** in Settings → Payments. Requires existing Stripe publishable + secret keys. Owner must also enable **Stablecoins and Crypto** in the Stripe Dashboard for that account.
2. Public menu “How do you want to pay?” and delivery checkout show **Pay with crypto** when the toggle is on and Stripe keys are present.
3. Backend creates a PaymentIntent with `payment_method_types=["crypto"]` and metadata `pay_kind=crypto` (same guest auth as card: `table_token` or `public_order_token`).
4. Guest is redirected to `crypto.stripe.com`, connects a wallet, pays in stablecoins; Stripe settles to the merchant’s Stripe balance in the account’s local currency.
5. Return URL brings the guest back; front calls existing `confirm-payment`, which marks the order paid with `payment_method=crypto` and stores the PaymentIntent id on the settlement leg.
6. Fiscal / VeriFactu: unchanged - one alta after full EUR (or tenant currency) settlement; do not put crypto amounts on the Factura as primary.
7. Offline queue: crypto is **online-only**; never store crypto payment material offline (`docs/0063`).

## API

- `POST /orders/{id}/create-payment-intent?method=crypto&table_token=…` (or `public_order_token`)
- `POST /orders/{id}/confirm-payment?payment_intent_id=…&…` (sets `payment_method=crypto` when intent metadata `pay_kind=crypto`)

Menu payload includes `tenant_stripe_crypto_configured`. Delivery create response includes `stripe_crypto_configured`.

## Out of scope (later)

- Staff POS crypto option / split-bill crypto legs
- Non-Stripe processors (BitPay, Coinbase Commerce)
- On-chain restaurant wallets, BTC/ETH beyond Stripe’s stablecoin Crypto method
- In-app refund UI (use Stripe Dashboard / API)

## Ops notes

- Presentment currency follows the tenant Stripe currency (typically EUR for ES). If Stripe rejects the currency for Crypto, enable Crypto in Dashboard or confirm private-preview currency support.
- No new secrets in git; reuse tenant Stripe keys.
- Refunds return stablecoins to the guest wallet (Stripe behaviour).
