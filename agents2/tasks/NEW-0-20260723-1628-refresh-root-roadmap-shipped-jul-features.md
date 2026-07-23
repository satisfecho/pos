# Refresh root ROADMAP.md for shipped Jul features

## GitHub Issues
- **Issue:** (none — enhancement reviewer)
- **0**

## Problem / goal

Root **`ROADMAP.md`** (last substantive touch ~2026-06-01) still omits major shipped product areas: **Satisfecho Delivery** + courier, **waiting list**, **restaurant groups**, **SaaS signup paywall**, **platform operator**, and **order/item comments**. Contributors reading ROADMAP “Completed Features” get a false picture vs **`CHANGELOG.md`** / **`docs/0052`–`0054`**. Sibling **`NEW-0-20260722-1159-readme-delivery-courier-saas-features`** covers root **README only**; **`NEW-0-20260722-1250-roadmap-0032-…`** covers **`docs/0032`** only — not this file.

## Evidence (008 preflight / review)

- Weekly sweep 2026-07-23: `SIGNAL docs_stale×14` all owned; demo_tables_check=ok; NEW backlog≈58 — keep this **one-file**, bullet-add only (no bulk `docs/` rewrite)
- `rg` on **`ROADMAP.md`**: no hits for Delivery, waiting list, restaurant group, paywall, platform operator, courier, order comment, signup wizard
- Feature docs exist and are indexed in **`docs/README.md`**: `0053`, `0052`, `0054`, `0015-platform-operator-portal.md`, `0011` (waiting list)
- Do not duplicate **WIP-304** (TenantProduct checkout fix)

## High-level instructions for coder

- In **`ROADMAP.md`** § Completed Features, add short bullets (with doc links) for:
  - Satisfecho Delivery (staff + public `/delivery/{tenantId}` + courier) → `docs/0053-satisfecho-delivery-order-channel.md`
  - Waiting list (guest + staff) → `docs/0011-table-reservation-user-guide.md`
  - Restaurant groups → `docs/0054-restaurant-groups.md`
  - SaaS signup paywall (flag default off) → `docs/0052-saas-signup-paywall.md`
  - Platform operator portal → `docs/0015-platform-operator-portal.md`
  - Optional order / item comments → point at kitchen/order docs or closed #284 behaviour (no new long spec)
- Optionally add one line under Documentation reference for `0052` / `0053` / `0054` / platform portal
- Do **not** rewrite Missing Features / rate-limit roadmap sections; do not edit `docs/0032` here
- Pass/fail: `rg -i 'delivery|waiting list|restaurant group|paywall|platform operator' ROADMAP.md` hits the new bullets; no product code changes
