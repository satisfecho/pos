# Platform operator insights

Date: 2026-11-25

## Shipped

- Usage chart: **7 / 30 / 90** days (daily) and **1 year / 3 years** (monthly buckets)
- Tenants **AG Grid** (same stack as Orders): sort, filter, quick filter, pagination default **500**
- **Top 10 most active clients** for the selected window (login events with `tenant_id`)

## Table stack

Use **AG Grid** (already in the repo) for platform data tables. Do not add Angular Material only for sorting.

## Further insight ideas (not built)

| Idea | Why |
|------|-----|
| Inactive clients (no login 14/30 days) | Churn risk list with owner mailto |
| Orders / reservations sparklines per tenant | Activity beyond logins |
| Cohort retention (sign-up week vs still logging in) | Product-market signal |
| Platform monthly feature digest email | Shipped - see [0093-platform-feature-digest.md](0093-platform-feature-digest.md) |

## Monthly feature digest (product)

Shipped under [#453](https://github.com/satisfecho/pos/issues/453): platform operators send a monthly digest to verified owners via configurable platform SMTP. Consent notice is in the signup verification email; each digest includes unsubscribe. Details: [0093-platform-feature-digest.md](0093-platform-feature-digest.md).
