# Document delivery-config and delivery-status in rate-limit ops doc

## GitHub Issues
- **Issue:** (none — enhancement reviewer)
- **0**

## Problem / goal

**2.1.32** added two unauthenticated delivery GETs that share the public-menu IP bucket, but **`docs/0020-rate-limiting-production.md`** still only lists **`POST …/satisfecho-delivery`** (and webhooks). Operators tuning `RATE_LIMIT_PUBLIC_MENU_PER_MINUTE` for track-page polling will not see those paths in the ops checklist.

## Evidence (008 preflight / review)

- Weekly sweep 2026-07-23T21:12Z: follow-on from shipped **CLOSED-306** / changelog **2.1.32**; SIGNAL stale basenames owned; demo OK
- Code already has `@public_menu_ip_limit()` on:
  - `GET /public/tenants/{tenant_id}/satisfecho-delivery-config`
  - `GET /public/orders/{order_id}/delivery-status`
- `docs/0020` public-menu bullet lists delivery **create** + webhook only (from CLOSED-1142); no config/status GETs
- Sibling **`NEW-0-20260723-2112-security-review-delivery-zones-track`** owns **SECURITY-REVIEW** — do **not** merge; this task is **0020** only
- Do not invent a new dedicated rate-limit bucket unless product asks; document the existing shared bucket

## High-level instructions for coder

- Extend the **Public menu & discovery** bullet in **`docs/0020-rate-limiting-production.md`** to include the two GETs above (same `RATE_LIMIT_PUBLIC_MENU_PER_MINUTE` bucket)
- Optionally note that the customer track page polls delivery-status (so aggressive clients share the 30/min IP budget with menu/discovery)
- No code changes required unless a path is missing the decorator (spot-check `main.py` first)
- Pass/fail: `rg -n 'satisfecho-delivery-config|delivery-status' docs/0020-rate-limiting-production.md` hits; env checklist unchanged unless a new var is introduced (prefer not)
