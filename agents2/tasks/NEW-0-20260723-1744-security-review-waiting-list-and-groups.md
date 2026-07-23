# SECURITY-REVIEW delta: public waiting list + restaurant groups

## GitHub Issues
- **Issue:** (none — enhancement reviewer)
- **0**

## Problem / goal

Two shipped multi-tenant surfaces are missing from **`docs/SECURITY-REVIEW.md`** public / boundary notes: anonymous **waiting list** signup (PII + rate limit) and **restaurant groups** (join codes + optional shared products/customers). Re-audits after Delivery/paywall deltas can miss these controls.

## Evidence (008 preflight / review)

- Weekly sweep 2026-07-23T17:44Z: `SIGNAL changelog_sparse` post-2.1.28 (false positive owned); docs-vs-code scan
- `rg` on **`docs/SECURITY-REVIEW.md`**: no hits for waiting list / restaurant group / join code
- Public waitlist: `POST /public/tenants/{tenant_id}/waiting-list` — name, E.164 phone, party size; **`RATE_LIMIT_WAITING_LIST_PER_HOUR`** (default 10/hour/IP); stores client IP/UA (`main.py` ~L1409+)
- Groups: owner/admin `/restaurant-group` create/join/leave; join by `join_code`; optional `share_products` / `share_customers` — see **`docs/0054`**, tests `back/tests/test_restaurant_groups.py`
- Sibling **`NEW-0-20260723-1734-security-review-tenantproduct-delivery-ids`** owns #304 TenantProduct wording only — do **not** merge

## High-level instructions for coder

- In **`docs/SECURITY-REVIEW.md`** § Public surfaces (or Multi-tenant IDOR), add two short rows:
  - **Public waiting list** — unauthenticated create; tenant-scoped; PII (name/phone); rate limit + pointer to **`docs/0020-rate-limiting-production.md`** / **`docs/0011`**; no public token page
  - **Restaurant groups** — join codes are capability secrets for the group; share flags expand product/customer visibility across member tenants; owner/admin only; pointer to **`docs/0054`** and `test_restaurant_groups.py`
- Append a History / delta line dated 2026-07-23 for this pass
- Documentation only; no product code; do not reopen #304 delivery row beyond a cross-link if useful
- Pass/fail: `rg -n 'waiting.list|restaurant.group|join_code' docs/SECURITY-REVIEW.md` hits the new notes
