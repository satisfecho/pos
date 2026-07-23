# Add Puppeteer smoke for order / item comments

## GitHub Issues
- **Issue:** (none — enhancement reviewer)
- **0**

## Problem / goal

Optional order-line and order-level comments (#284) are shipped (public menu “Add comment”, staff notes, kitchen/bar highlight) with pytest coverage, but **`front/scripts/`** has **no** Puppeteer smoke and **`docs/testing.md`** does not index one. UI regressions on the guest comment path or kitchen highlight would only be caught manually. Sibling **`NEW-0-20260723-0734-document-order-item-comments`** is **docs only** — do not merge.

## Evidence (008 preflight / review)

- Weekly sweep 2026-07-23T17:14Z: `SIGNAL docs_stale×14` owned; improvement theme (smoke coverage), not a stale-doc rewrite
- Shipped: `back/app/order_notes.py`, public menu cart comments, kitchen/bar highlight; `back/tests/test_order_notes.py`
- `rg` on `front/scripts/*.mjs`: no `notes` / `comment` / `Add comment` smoke
- Out of scope: kitchen-display delivery refresh (**`NEW-0-20260723-0716-refresh-kitchen-display-doc-delivery`**); order-comments documentation NEW above

## High-level instructions for coder

- Add **`front/scripts/test-order-comments.mjs`** (or similar) using existing Puppeteer helpers (`puppeteer-headless.mjs`, `BASE_URL`, demo/`LOGIN_*` or public menu token as appropriate)
- Prefer a minimal path: public menu (or staff order) → set an item/order comment → open kitchen (or order detail) and assert the comment text is visible / highlighted
- Keep assertions resilient (optional fields must not block checkout); respect ~500 char product cap if asserted
- Add `test:order-comments` to **`front/package.json`** and a short row in **`docs/testing.md`**
- Do **not** expand product behaviour; link the smoke from the order-comments doc NEW only if that file already exists
- Pass/fail: `npm run test:order-comments --prefix front` exits 0 against local HAProxy; script listed in `docs/testing.md`
