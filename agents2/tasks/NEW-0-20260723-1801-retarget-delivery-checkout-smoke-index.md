# Retarget delivery-checkout smoke index NEW (script committed)

## GitHub Issues
- **Issue:** (none — enhancement reviewer)
- **0**

## Problem / goal

**`NEW-0-20260722-1142-index-courier-delivery-smokes-in-testing-doc.md`** still describes `front/scripts/test-delivery-checkout.mjs` as **untracked/WIP** tied to **WIP-302**. Reality: the script is **committed** on `development`, public checkout shipped (**CLOSED-302**, changelog through **2.1.28** / #304), and **`test:delivery-checkout` is still missing** from `front/package.json` while courier already has `test:courier-actions`. Leaving the July-22 NEW wording stale risks coders skipping the npm alias or waiting on a closed WIP.

## Evidence (008 preflight / review)

- Weekly sweep 2026-07-23T18:01Z: docs/changelog SIGNAL basenames owned; smoke-index scan
- `ls front/scripts/test-delivery-checkout.mjs` present; `rg test:delivery-checkout front/package.json` → no matches
- Open owner: **`NEW-0-20260722-1142-…`**; alias-index sibling **`NEW-0-20260723-1617-alias-index-remaining-puppeteer-smokes`** points delivery-checkout at 1142 — do not create a second index NEW
- Waiting-list smoke is owned by **`NEW-0-20260723-1648-waiting-list-puppeteer-smoke`** — drop optional waitlist invent-from-1142 scope

## High-level instructions for coder

- Rewrite **`NEW-0-20260722-1142-index-courier-delivery-smokes-in-testing-doc.md`** Evidence + instructions to **current tip**:
  - Index **`test:courier-actions`** in **`docs/testing.md`** if still missing
  - Add **`test:delivery-checkout`** → `node scripts/test-delivery-checkout.mjs` in **`front/package.json`** and document it in **`docs/testing.md`**
  - Remove “untracked/WIP-302” language; point at CLOSED-302 / #304 as shipped
  - Do **not** invent waiting-list smoke here (owned by 1648)
- Prefer editing that one NEW in place (or close it and keep this file as the sole owner — pick one; avoid two open owners for the same npm alias)
- Pass criteria: `npm run test:delivery-checkout --prefix front` is a documented alias; 1142 body matches repo tip; no duplicate delivery-checkout index NEW remains
