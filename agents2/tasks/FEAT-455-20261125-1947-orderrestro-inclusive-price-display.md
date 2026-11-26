# OrderRestro: inclusive price display matches billing

## GitHub Issues
- **Issue:** https://github.com/satisfecho/pos/issues/455
- **455**

## Status
- **Unblocked (2026-11-26):** Do not park on product options. If inclusive vs exclusive (or which surfaces) need a choice, ship a **setting** with default = current Satisfecho behaviour (tax-inclusive, server-authoritative payable totals on guest/staff surfaces). Align UI to billed totals; no exclusive-only invent unless the setting exists.
- **Restored:** Previous FEAT for #455 was missing from `agents2/tasks/` (orphaned `agent:planned` label / Agent 001 comment). Recreated so feature coders can pick it up.

## Problem / goal
Upstream inspiration (OrderRestro / nodedr-restaurant-pos): keep tax-inclusive menu and checkout prices aligned with server-side billing so POS, receipts, and payment totals never disagree on what the guest pays.

Adaptation goal only - do not copy upstream code. Align with Satisfecho tax / promotions / payment totals.

## High-level instructions for coder
- Read issue #455 and existing tax / price display paths (menu, cart, checkout, receipts, payments). See also `docs/0068-price-promotions.md` for tax-inclusive discount behaviour.
- Find places where UI shows a guest-facing price that can diverge from billed totals (inclusive vs exclusive, promotions, tips, delivery fees).
- Prefer one server-authoritative total path; UI should display the same figures the backend bills.
- If more than one display mode is useful, add a tenant/settings toggle with default inclusive / current behaviour. Do not wait for a human to pick the mode.
- Keep multi-tenant and currency handling intact; no hard-coded secrets.
- Work on **`development`**. Add or extend smoke / unit coverage for the chosen slice.
- Park waiting-for-human only for hard gates (secrets, irreversible ops, legal, paid third-party, or issue says wait) - see `agents2/010-feature-coder.md`.
- Do not paste upstream diffs, secrets, or PII into the task file or commits.
