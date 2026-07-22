---
## Closing summary (TOP)

- **What happened:** SaaS paywall entitlement after Checkout had no Stripe webhook, so cancel/`past_due`/renewals were not synced without browser `confirm-checkout`.
- **What was done:** Added verified `POST /saas/webhook` with shared apply helpers, tenant metadata on Checkout, docs/env updates; paywall remains off by default.
- **What was tested:** `tests/test_saas_billing.py` — 14 passed (webhook signature, past_due/cancel without confirm, missing secret); `SAAS_PAYWALL_ENABLED=false` in config.env.example. Overall PASS.
- **Why closed:** All pass criteria met; tester overall PASS; safe follow-up to #296.
- **Closed at (UTC):** 2026-07-22 13:50
---

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

## Test report

1. **Date/time (UTC):** start 2026-07-22 13:50:05 UTC; end 2026-07-22 13:50:13 UTC. Log window: `docker logs --since 5m pos-back`.
2. **Environment:** `docker-compose.yml` + `docker-compose.dev.yml`; branch `development` @ `c94facf0`; HAProxy `http://127.0.0.1:4202` (`/api/health` → 200). Pytest via `docker compose … exec -w /app back`. No live Stripe CLI (optional step skipped).
3. **What was tested:** `tests/test_saas_billing.py` (14 cases: webhook signature, past_due/cancel without confirm-checkout, missing secret, happy path); `SAAS_PAYWALL_ENABLED` default in `config.env.example`.
4. **Results:**
   - pytest suite **PASS** — `14 passed, 1 warning in 1.06s` (Starlette/httpx deprecation only).
   - Paywall default off **PASS** — `config.env.example` and local `config.env` both `SAAS_PAYWALL_ENABLED=false`.
   - Optional Stripe CLI ops smoke **N/A** — not required for pass; no `SAAS_STRIPE_WEBHOOK_SECRET` / Stripe CLI in this run.
5. **Overall:** **PASS**
6. **Product owner feedback:** Webhook coverage is in place and the suite greenlights cancel/`past_due` sync without browser confirm. Paywall stays off by default, so production enablement remains an explicit ops choice. Safe to close this follow-up to #296.
7. **URLs tested:** N/A — no browser (API pytest only). Health check: `http://127.0.0.1:4202/api/health` → 200.
8. **Relevant log excerpts:**
   ```
   ..............                                                           [100%]
   14 passed, 1 warning in 1.06s
   INFO:     172.30.0.5:43754 - "GET /health HTTP/1.1" 200 OK
   grep: SAAS_PAYWALL_ENABLED=false
   ```
