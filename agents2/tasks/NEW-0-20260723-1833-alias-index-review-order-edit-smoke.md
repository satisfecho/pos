# Alias and index review-order-edit Puppeteer smoke

## GitHub Issues
- **Issue:** (none — enhancement reviewer)
- **0**

## Problem / goal

`front/scripts/review-order-edit-puppeteer.mjs` is a durable Orders smoke (Edit button, edit modal, status popover z-index) already described in **`docs/testing.md`**, but it has **no** `test:*` npm alias. The testing doc even calls out that it must be run via raw `node`. Agents following the npm table miss it next to `test:order-8-status` and other staff-order smokes.

## Evidence (008 preflight / review)

- Weekly sweep 2026-07-23T18:33Z: `SIGNAL docs_stale×14` + `changelog_sparse` already owned; `demo_tables_check=ok`; NEW backlog≈91 — tiny index/alias only
- `rg` on `front/package.json`: no `review-order-edit`
- `docs/testing.md` § coverage + how-to already document the script; line noting “no npm script” lists it with `test-menu-logo` / `test-websocket`
- Out of scope (already queued): **`NEW-0-20260723-1617-alias-index-remaining-puppeteer-smokes`** owns menu-logo / websocket / api-docs / etc. — do **not** re-list those; this task is **review-order-edit only**
- Sibling **`NEW-0-20260723-1714-order-comments-puppeteer-smoke`** invents a comments flow — do not merge

## High-level instructions for coder

- Add `test:review-order-edit` → `node scripts/review-order-edit-puppeteer.mjs` in **`front/package.json`** (same style as other `test:*`)
- Update **`docs/testing.md`**: npm table / how-to to prefer the alias; remove `review-order-edit-puppeteer` from the “have no npm script” sentence (leave menu-logo/websocket there until **1617** lands, or refresh that sentence if 1617 already shipped)
- No product code; do not change the Puppeteer assertions unless the alias path breaks
- Pass/fail: `npm run test:review-order-edit --prefix front` resolves; `rg 'test:review-order-edit' docs/testing.md front/package.json` hits
