# Add restaurant-groups Puppeteer smoke + testing.md row

## GitHub Issues
- **Issue:** (none — enhancement reviewer)
- **0**

## Problem / goal

Restaurant groups (#283) are shipped with Settings UI testids and **`docs/0054-restaurant-groups.md`**, but **`front/scripts/`** has **no** dedicated Puppeteer smoke and **`docs/testing.md`** does not index one. Regressions on create/join/leave or the Settings tab would only be caught by manual QA, unlike paywall / delivery / platform / courier smokes. Sibling **`NEW-0-20260723-1648-waiting-list-puppeteer-smoke`** covers waiting list only — do not merge.

## Evidence (008 preflight / review)

- Weekly sweep 2026-07-23T16:59Z: `SIGNAL docs_stale×14` all owned; `demo_tables_check=ok`; Unreleased=2; NEW backlog≈65 — improvement theme (smoke coverage), not a stale-doc rewrite
- `docs/0054` documents `data-testid="settings-restaurant-group-tab"` / `settings-restaurant-group-section` and create/join/leave flows
- `rg` on `front/package.json` / `front/scripts/`: no `test:restaurant-group*` / `test-restaurant-group*`
- `docs/testing.md`: no restaurant-groups smoke row (groups doc exists; smoke gap remains)

## High-level instructions for coder

- Add a headless Puppeteer script under **`front/scripts/`** that logs in as owner/admin, opens **Settings → Restaurant group**, and asserts the section/tab is visible (create/join UI when not in a group, or member/leave UI when already grouped — keep assertions resilient to either state; prefer demo tenant or documented test tenants)
- Prefer existing testids from **`docs/0054`**; do not invent brittle copy-only selectors
- Add `test:restaurant-groups` (or matching name) to **`front/package.json`** and a short row in **`docs/testing.md`**
- Do **not** rewrite **`docs/0054`** beyond a one-line smoke pointer if useful
- Pass/fail: `npm run test:restaurant-groups --prefix front` exits 0 against local HAProxy; script is discoverable from `docs/testing.md`
