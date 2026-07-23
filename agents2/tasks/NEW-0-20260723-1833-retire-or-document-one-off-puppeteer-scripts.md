# Retire or document one-off Puppeteer scripts

## GitHub Issues
- **Issue:** (none — enhancement reviewer)
- **0**

## Problem / goal

Two committed one-off scripts under **`front/scripts/`** are invisible to the testing/screenshots indexes and have no npm aliases: `review-orders-buttons.mjs` (print/Factura button screenshots) and `capture-reports-screenshot.mjs` (writes `docs/screenshots/reports-review.png`). Operators either rediscover them by accident or leave dead tooling in the tree. Prefer **remove** if superseded; otherwise document briefly.

## Evidence (008 preflight / review)

- Weekly sweep 2026-07-23T18:33Z: smoke/orphan script scan after SIGNAL docs/changelog owned; NEW backlog≈91
- `rg` on `docs/testing.md` / `docs/screenshots/README.md` / `front/package.json`: no hits for either basename
- Durable replacements already exist: **`capture-screenshots.mjs`** (+ `npm run capture-screenshots`) documented in **`docs/screenshots/README.md`**; **`test:reports`** covers Reports UI
- Do not confuse with **`review-order-edit-puppeteer.mjs`** (owned by sibling **`NEW-0-20260723-1833-alias-index-review-order-edit-smoke`**)

## High-level instructions for coder

- For each of `review-orders-buttons.mjs` and `capture-reports-screenshot.mjs`, choose **one**:
  - **Delete** the script (and any obsolete output path notes) if `capture-screenshots` / `test:reports` / manual screenshot steps fully supersede it, **or**
  - Add a short “one-off / historical” bullet under **`docs/screenshots/README.md`** or **`docs/testing.md`** with usage + when to prefer the durable script instead
- Do not add new product flows; do not invent a third capture framework
- Pass/fail: either scripts gone and no broken docs links, or both names appear once in docs with clear “prefer X instead” guidance; `rg` on package.json still has no accidental aliases unless intentionally added
