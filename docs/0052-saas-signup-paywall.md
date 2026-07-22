# SaaS signup paywall (platform monetization)

Hard paywall for **restaurant / tenant** signups (GitHub issue #296). After guided signup priming (`/register` / `/signup`), new tenants must start a **free trial** or **paid subscription** before using the staff app. This is **platform billing of Satisfecho**, not tenant Stripe keys for guest order payments.

## Defaults

| Setting | Default | Notes |
|---------|---------|--------|
| `SAAS_PAYWALL_ENABLED` | `false` | Off for local/demo so existing workflows keep working. Enable in production when ready. |
| `SAAS_TRIAL_DAYS` | `14` | Length of free trial. |
| `SAAS_PLAN_PRICE_CENTS` | `4900` | Display price (€49 / month). |
| `SAAS_PLAN_CURRENCY` | `eur` | Display + Stripe currency. |
| `SAAS_STRIPE_PRICE_ID` | empty | Optional Stripe Price ID. When set **and** `STRIPE_SECRET_KEY` is set, Checkout is offered. Without it, **Start free trial** still works (no card). |
| `STRIPE_SECRET_KEY` / `STRIPE_PUBLISHABLE_KEY` | empty | Platform keys for SaaS Checkout (same env vars as order fallback). |

## Tenant state

Columns on `tenant`:

- `saas_subscription_status`: `none` \| `trialing` \| `active` \| `canceled` \| `past_due` \| `grandfathered`
- `saas_trial_ends_at`, `saas_subscription_ends_at`
- `saas_stripe_customer_id`, `saas_stripe_subscription_id`

**Existing tenants** are set to `grandfathered` by migration (full access forever under this MVP).

**New tenants** when paywall is enabled get `none` at `POST /register`. When paywall is disabled, new tenants are `grandfathered`.

## Enforcement

- **Frontend:** `authGuard` redirects staff users without access to `/paywall`. Login and signup finish CTA do the same. HTTP **402** from APIs also navigates to `/paywall`.
- **Backend:** When `SAAS_PAYWALL_ENABLED=true`, middleware returns **402** `saas_subscription_required` for authenticated tenant staff on non-exempt paths. Exempt: auth, `/saas/*`, `/onboarding/*`, `/products/*` (signup priming), `/users/me*`, public guest routes, provider/platform/courier.

## API

- `GET /saas/config` — public plan flags
- `GET /saas/subscription` — current tenant status (auth)
- `POST /saas/start-trial` — owner/admin; starts trial
- `POST /saas/checkout-session` — Stripe Checkout URL when configured
- `POST /saas/confirm-checkout` — after redirect with `session_id`

## Flow

1. Register + guided onboarding (products / photos).
2. Finish → `/paywall` (when enabled).
3. Start trial (or Stripe Checkout) → staff dashboard unlocks.
