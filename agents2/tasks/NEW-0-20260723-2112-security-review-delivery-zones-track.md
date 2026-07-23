# Security-review delta for delivery zones, fees, and track

## GitHub Issues
- **Issue:** (none — enhancement reviewer)
- **0**

## Problem / goal

**2.1.32 / #306** shipped delivery fee/radius/postal validation, `GET …/satisfecho-delivery-config`, token-gated `GET …/delivery-status` (track page), and extended `public_order_token` lifetime to **24h**, but **`docs/SECURITY-REVIEW.md`** still describes public Satisfecho Delivery as create-only with token **~1h**. Re-audits miss the track poll surface and the wrong TTL.

## Evidence (008 preflight / review)

- Weekly sweep 2026-07-23T21:12Z: SIGNAL `docs_stale` / `changelog_sparse` basenames owned; Unreleased empty post-**2.1.32** cut (false positive); `demo_tables_check=ok`; NEW≈118
- `docs/0053` documents 24h token + track + config; `docs/SECURITY-REVIEW.md` §4 still says `public_order_token` (~1h) and only lists `POST …/satisfecho-delivery`
- Code: `@public_menu_ip_limit` on config + delivery-status (`back/app/main.py`); tests in `back/tests/test_public_satisfecho_delivery.py`
- Sibling **`NEW-0-20260723-1734-security-review-tenantproduct-delivery-ids`** owns TenantProduct IDOR only — do **not** merge
- Sibling **`NEW-0-20260723-1744-security-review-waiting-list-and-groups`** owns waitlist/groups — do not merge
- Sibling **2103** NEWs own smoke alias, demo fee seed, docs/README 0053 blurb — not SECURITY-REVIEW

## High-level instructions for coder

- Update **`docs/SECURITY-REVIEW.md`** Public Satisfecho Delivery row (and residual notes / changelog table if present) to cover:
  - Zone/fee validation on public create (postal and/or radius; fee snapshotted on order)
  - `GET /public/tenants/{tenant_id}/satisfecho-delivery-config` (no secrets; rate-limited)
  - `GET /public/orders/{order_id}/delivery-status?public_order_token=` (coarse status only; token-gated; rate-limited)
  - Correct **`public_order_token` lifetime = 24h** (pay + track); keep unpaid create TTL **2h** as residual
- Add a short **2026-07-23** delta line in the review history table; do not claim a full pentest
- Pass/fail: `rg -n 'delivery-status|24h|satisfecho-delivery-config|postal|fee' docs/SECURITY-REVIEW.md` hits; no product code required unless a real control gap is found (then file a separate NEW)
