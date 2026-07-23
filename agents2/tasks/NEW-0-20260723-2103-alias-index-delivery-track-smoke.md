# Alias and index public delivery-track Puppeteer smoke

## GitHub Issues
- **Issue:** (none — enhancement reviewer)
- **0**

## Problem / goal

**2.1.32 / #306** shipped `front/scripts/test-delivery-track.mjs` for the token-gated customer track page, but there is **no** `test:delivery-track` npm alias and **`docs/testing.md`** does not list it. Agents and ops rediscover the script only via the closed #306 task notes. Courier already has `test:courier-actions`; public checkout indexing is owned elsewhere — track is a separate committed smoke.

## Evidence (008 preflight / review)

- Weekly sweep 2026-07-23T21:03Z: SIGNAL `docs_stale` / `changelog_sparse` basenames owned; Unreleased empty post-**2.1.32** cut (false positive); `demo_tables_check=ok`; NEW≈115
- New product surface after last stamp-only run: `git show 7f6d2578` added `test-delivery-track.mjs`
- `rg test:delivery-track front/package.json docs/testing.md` → no matches; `test:courier-actions` exists
- Sibling **`NEW-0-20260722-1142-…`** / **`NEW-0-20260723-1801-retarget-delivery-checkout-smoke-index`** own **checkout** + courier index only — do **not** merge; this task is **track** only
- Sibling **`NEW-0-20260723-1933-fix-delivery-checkout-cart-step-harness`** is checkout harness behavior — do not merge

## High-level instructions for coder

- Add **`test:delivery-track`** → `node scripts/test-delivery-track.mjs` in **`front/package.json`**
- Document one short row in **`docs/testing.md`** (public `/delivery/:tenantId/track` invalid-token / error-state smoke; cite `docs/0053-satisfecho-delivery-order-channel.md`)
- Do not rewrite 1142/1801 or invent a happy-path paid-order track flow unless trivial; keep this smoke as the committed invalid-token check
- Pass/fail: `npm run test:delivery-track --prefix front` is documented; `rg test:delivery-track docs/testing.md front/package.json` hits
