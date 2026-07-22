# Clarify provider vs courier portal in docs/0014

## GitHub Issues
- **Issue:** (none — enhancement reviewer)
- **0**

## Problem / goal

**`docs/0014-provider-portal.md`** is still the supplier-catalog guide (`/provider`) but has not been touched in ~128 days while a separate **courier** portal (`/courier`) and Satisfecho Delivery staff flows shipped. Support and agents can confuse “provider” (wholesale catalog) with “courier” (delivery fulfillment). A short disambiguation at the top of 0014 prevents wrong login URLs and wrong role setup.

## Evidence (008 preflight / review)

- `stale_doc path=docs/0014-provider-portal.md age_days=128`
- `SIGNAL docs_stale count=15` — edit **0014 only** (plus optional one cross-link); no bulk docs rewrite
- Courier routes live under `front/src/app/courier/` (`/courier/login`, `/courier`); API in **`docs/0053-satisfecho-delivery-order-channel.md`**
- Root README still lists Provider portal without contrasting courier (separate task **NEW-0-20260722-1159-readme-delivery-courier-saas-features.md**)

## High-level instructions for coder

- At the top of **`docs/0014-provider-portal.md`**, add a short “Not the courier portal” note: provider = catalog suppliers at `/provider`; couriers = `/courier` for delivery orders; link **0053**
- Optionally add the same one-liner to the provider row in **`docs/README.md`** Feature guides table — only if a single-line edit keeps it clear
- Do not rewrite provider API tables or screenshots in this task
- Pass criteria: opening 0014 immediately distinguishes `/provider` from `/courier`; no changes to PRINTING / SECURITY-REVIEW / other stale plans here
