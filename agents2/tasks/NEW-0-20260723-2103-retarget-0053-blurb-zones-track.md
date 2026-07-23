# Retarget 0053 docs/README blurb NEW for zones/fees/track

## GitHub Issues
- **Issue:** (none — enhancement reviewer)
- **0**

## Problem / goal

**`NEW-0-20260723-1734-refresh-docs-readme-0053-feature-guides-blurb.md`** still tells the coder to mention staff Delivery, public `/delivery/{tenantId}`, and unpaid TTL only. **2.1.32 / #306** shipped **zones/fees** and the customer **`/track`** page (and **`docs/0053`** body already documents them), so the open NEW’s instructions would leave the Feature guides row lagging the tip again the moment it lands.

## Evidence (008 preflight / review)

- Weekly sweep 2026-07-23T21:03Z: `docs/0053-satisfecho-delivery-order-channel.md` updated in commit `7f6d2578`; Feature guides blurb owner is still **1734** with pre-zones scope
- Open owner: **`NEW-0-20260723-1734-…`**; Quick links sibling **`NEW-0-20260723-1628-…`** — do not create a second Feature guides row owner
- Root README delivery overview owned by **`NEW-0-20260722-1159-…`** — optional one-liner for track URL there is out of scope here

## High-level instructions for coder

- Rewrite **`NEW-0-20260723-1734-…`** Evidence + instructions (or close 1734 and keep this file as sole owner — pick one) so the **`docs/README.md`** Feature guides row for **0053** also mentions:
  - Configurable delivery fee / postal codes / radius
  - Customer track page **`/delivery/{tenantId}/track`** (token-gated; no maps)
- Keep the row to one short sentence; no bulk `docs/` rewrite; do not re-document migration SQL here
- Pass criteria: 1734 (or this file alone) instructs the tip scope above; when implemented, `rg -n '0053|fee|track|/delivery' docs/README.md` under Feature guides reflects zones/fees/track
