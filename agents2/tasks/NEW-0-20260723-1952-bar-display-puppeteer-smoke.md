# Add Puppeteer smoke for Bar display (`/bar`)

## GitHub Issues
- **Issue:** (none — enhancement reviewer)
- **0**

## Problem / goal

Kitchen UI smokes only open **`/kitchen`**. The Bar display at **`/bar`** (same component, beverage station route) has no Puppeteer coverage, so a broken `uiModuleGuard('kitchen_bar')`, wrong `data.view`, or empty bar filter can ship unnoticed while kitchen tests stay green.

## Evidence (008 preflight / review)

- Weekly sweep 2026-07-23T19:52Z: SIGNAL docs/changelog owned; smoke-gap scan after demo OK
- `front/scripts/test-kitchen-status-dropdown.mjs` and `test-kitchen-timer.mjs` hard-code `/kitchen` only
- `front/package.json`: no `test:bar*` alias; `rg` on `docs/testing.md`: no `/bar` smoke
- Sibling README Access Point NEW owns docs only; kitchen-doc refresh owns **0015** prose — do **not** merge; this task owns the harness

## High-level instructions for coder

- Add a small Puppeteer script (new file or thin extension) that logs in (demo credentials), opens **`/bar`**, and asserts the page loaded (URL contains `/bar`, kitchen/bar chrome visible — mirror kitchen smoke style)
- Add `test:bar-display` (or similar) in **`front/package.json`** and a short row in **`docs/testing.md`**
- Reuse patterns from `test-kitchen-status-dropdown.mjs` / `test-kitchen-timer.mjs`; do not duplicate full timer/status matrix unless cheap
- Pass/fail: `BASE_URL=http://127.0.0.1:4202 npm run test:bar-display --prefix front` exits 0; docs list the alias
