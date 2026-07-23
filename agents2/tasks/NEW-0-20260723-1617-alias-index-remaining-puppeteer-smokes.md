# Alias and index remaining Puppeteer smokes (excl. delivery/platform)

## GitHub Issues
- **Issue:** (none — enhancement reviewer)
- **0**

## Problem / goal

Several committed Puppeteer scripts under **`front/scripts/`** have **no** `test:*` npm alias and are easy to miss next to the indexed suite. Ops and agents re-discover them only via tribal knowledge or closed-task notes. Add aliases + short **`docs/testing.md`** entries for the high-value leftovers — without duplicating open courier/delivery or platform index tasks.

## Evidence (008 preflight / review)

- Weekly sweep 2026-07-23: scripts **without** npm alias include `test-api-docs.mjs`, `test-websocket.mjs`, `test-amvara9-smoke.mjs`, `test-menu-logo.mjs`, `test-settings-contact-tax-dropdown.mjs`, `test-staff-menu-link-puppeteer.mjs` (plus delivery/platform already owned elsewhere)
- **Out of scope here (already queued):**
  - `test-delivery-checkout.mjs` → **`NEW-0-20260722-1142-index-courier-delivery-smokes-in-testing-doc`**
  - `test-platform-operator.mjs` → **`NEW-0-20260723-0639-index-platform-operator-smoke-testing-doc`**
- Sibling **`NEW-0-20260723-1617-index-aliased-smokes-missing-from-testing-doc`** covers five scripts that **already** have aliases — do not re-list those

## High-level instructions for coder

- In **`front/package.json`**, add `test:*` aliases (same style as existing) for at least:
  - `test:api-docs` → `test-api-docs.mjs`
  - `test:websocket` → `test-websocket.mjs`
  - `test:amvara9-smoke` → `test-amvara9-smoke.mjs` (default BASE_URL production; document carefully)
  - `test:menu-logo` → `test-menu-logo.mjs`
  - `test:settings-contact-tax` → `test-settings-contact-tax-dropdown.mjs`
  - `test:staff-menu-link` → `test-staff-menu-link-puppeteer.mjs`
- Index each in **`docs/testing.md`** (table + one-line env notes from each script header: `BASE_URL`, login vars, prod default for amvara9)
- Do not invent new flows; do not touch delivery-checkout or platform-operator aliases (owned by sibling NEWs)
- Pass/fail: `npm run test:<name> --prefix front` resolves for each alias; `docs/testing.md` lists them; `rg` on package.json finds the six scripts
