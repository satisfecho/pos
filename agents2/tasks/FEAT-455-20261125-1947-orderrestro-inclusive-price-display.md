# OrderRestro: inclusive price display matches billing

## GitHub Issues
- **Issue:** https://github.com/satisfecho/pos/issues/455
- **455**

## Status
- **Blocked - waiting for human:** Which surfaces (menu/cart/checkout/receipts/payments), inclusive-only vs tenant toggle, and whether #455 still applies (upstream `b7a7d1c` / v1.45.0 is backup scheduling; Satisfecho already uses server-authoritative tax-inclusive payable totals) are not decided on #455. Do not invent those unilaterally.
- **Waiting notice posted:** 2026-11-25T19:56:10Z
- **Restored:** Previous FEAT for #455 was missing from `agents2/tasks/` (orphaned `agent:planned` label / Agent 001 comment). Recreated so feature coders can pick it up.

## Problem / goal
Upstream inspiration (OrderRestro / nodedr-restaurant-pos): keep tax-inclusive menu and checkout prices aligned with server-side billing so POS, receipts, and payment totals never disagree on what the guest pays.

Adaptation goal only - do not copy upstream code. Align with Satisfecho tax / promotions / payment totals.

## High-level instructions for coder
- Read issue #455 and existing tax / price display paths (menu, cart, checkout, receipts, payments). See also `docs/0068-price-promotions.md` for tax-inclusive discount behaviour.
- Find places where UI shows a guest-facing price that can diverge from billed totals (inclusive vs exclusive, promotions, tips, delivery fees).
- Prefer one server-authoritative total path; UI should display the same figures the backend bills.
- Keep multi-tenant and currency handling intact; no hard-coded secrets.
- Work on **`development`**. Add or extend smoke / unit coverage for the chosen slice.
- If product decisions (which surfaces, inclusive-only vs toggle) are unclear, post **one** waiting-for-human comment on #455 and park the FEAT per `agents2/TASKS-README.md`.
- Do not paste upstream diffs, secrets, or PII into the task file or commits.
