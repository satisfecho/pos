# Platform operator insights

Date: 2026-11-25

## Shipped

- Usage chart with selectable **7 / 30 / 90** day windows
- Sortable / filterable tenants table (default sort: client logins desc)
- **Top 10 most active clients** for the selected window (login events with `tenant_id`)

## Not using Angular Material

The front app has no `@angular/material` dependency. Adding Material only for table sort would pull CDK, theming, and a second UI language into the platform portal. Keep the existing CSS token design and native sort headers instead.

## Further insight ideas (not built)

| Idea | Why |
|------|-----|
| Inactive clients (no login 14/30 days) | Churn risk list with owner mailto |
| Orders / reservations sparklines per tenant | Activity beyond logins |
| Cohort retention (sign-up week vs still logging in) | Product-market signal |
| Platform weekly feature digest email | See GitHub issue for product decision |

## Weekly feature digest (product)

Proposal: once per week, email recent restaurant sign-ups (or opted-in owners) a short “what is new” digest from CHANGELOG / shipped FEATs.

Needs before build:

1. Explicit consent / unsubscribe (legal)
2. Audience rules (all owners vs last-N-days sign-ups vs paid only)
3. Content source (manual draft vs auto from CHANGELOG)
4. Sender and rate limits (platform SMTP, not tenant newsletter)

Tracked as GitHub issue [#453](https://github.com/satisfecho/pos/issues/453); do not ship until those are decided.
