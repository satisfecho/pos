# Add Stripe billing webhook for SaaS subscription sync

## GitHub Issues
- **Issue:** (none — enhancement reviewer; follow-up to #296 paywall)
- **0**

## Problem / goal

SaaS entitlement after Checkout depends on the client calling **`POST /saas/confirm-checkout`**. There is **no Stripe billing webhook**, so `past_due` / cancel / renewals are not synced if the browser never confirms or the customer changes the subscription in Stripe. **`docs/SECURITY-REVIEW.md`** lists this as a residual risk and says keep **`SAAS_PAYWALL_ENABLED=false`** until ops are ready — blocking safe production enablement of the paywall (**WIP-296**).

## Evidence (008 preflight / review)

- Weekly sweep + post-March delivery/SaaS surface; SECURITY-REVIEW residual: “SaaS Checkout without webhook… `past_due` / cancel sync is incomplete”
- `back/app/saas_billing.py`: Checkout create + `confirm_checkout_session` retrieve; statuses include `past_due` / `canceled` but no inbound Stripe event handler
- Feature doc: `docs/0052-saas-signup-paywall.md`; tests: `back/tests/test_saas_billing.py`
- Do **not** duplicate **WIP-296** MVP (paywall UI + confirm-checkout); this is the webhook sync follow-up

## High-level instructions for coder

- Add a verified Stripe webhook endpoint for **platform** SaaS billing (customer.subscription.* / checkout.session.completed as needed), using secrets from **`config.env`** / `config.env.example` — never hard-code keys
- Map events to tenant `saas_subscription_*` fields; keep confirm-checkout as a fast path, not the only source of truth
- Document endpoint + env vars in **`docs/0052-saas-signup-paywall.md`** and a one-line residual-risk update in **`docs/SECURITY-REVIEW.md`**
- Extend **`back/tests/test_saas_billing.py`** with signed-webhook happy/failure cases (no live Stripe)
- Pass criteria: cancel/`past_due` can be applied without the browser confirm call; paywall still off by default; existing confirm-checkout tests still pass
- Append **Testing instructions** when implementation is complete

## Implementation notes (feature coder)

- **`POST /saas/webhook`**: verifies `Stripe-Signature` with `SAAS_STRIPE_WEBHOOK_SECRET`; processes `checkout.session.completed` and `customer.subscription.*`
- Checkout `subscription_data.metadata` now includes `tenant_id` for webhook resolution
- `confirm-checkout` refactored to share `apply_checkout_session_to_tenant` / `apply_stripe_subscription_object`
- Docs: `docs/0052-saas-signup-paywall.md`, `docs/SECURITY-REVIEW.md`, `config.env.example`
- Paywall remains **off** by default (`SAAS_PAYWALL_ENABLED=false`)

## Testing instructions

1. From repo root, with the stack up:
   ```bash
   docker compose -f docker-compose.yml -f docker-compose.dev.yml exec -w /app back \
     python3 -m pytest tests/test_saas_billing.py -q --tb=short
   ```
   Expect **14 passed** (includes past_due / cancel without confirm-checkout, bad signature → 400, missing secret → 503, valid signature roundtrip, route happy path).

2. Confirm paywall still defaults off:
   ```bash
   grep -E '^SAAS_PAYWALL_ENABLED' config.env.example
   ```
   Expect `false`.

3. Optional ops smoke (needs Stripe CLI + secret in `config.env`):
   - Set `SAAS_STRIPE_WEBHOOK_SECRET` from Dashboard/CLI
   - Forward: `stripe listen --forward-to http://127.0.0.1:8020/saas/webhook` (or HAProxy `/api/saas/webhook`)
   - Trigger `customer.subscription.updated` with `past_due` for a tenant that has `saas_stripe_subscription_id` set; verify tenant status updates in DB without calling `POST /saas/confirm-checkout`.
