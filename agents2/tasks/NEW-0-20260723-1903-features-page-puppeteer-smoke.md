# Add Puppeteer smoke for public /features

## GitHub Issues
- **Issue:** (none — enhancement reviewer)
- **0**

## Problem / goal

**`/features`** is a public marketing surface linked from the landing nav, but there is no Puppeteer script or `test:*` alias. Regressions (blank page, missing hero, broken i18n keys, footer/nav) only show up manually. Sibling landing smokes (`test:landing-version`, `test:landing-provider-links`) do not open `/features`.

## Evidence (008 preflight / review)

- Weekly sweep 2026-07-23T19:03Z: smoke-gap follow-on; demo_tables_check=ok
- `rg 'features' front/package.json docs/testing.md front/scripts/*.mjs` → no dedicated features smoke (only landing “features” section / i18n keys elsewhere)
- Related open: **`FEAT-0-20260723-1903-refresh-public-features-page-jul-capabilities`** (content), **`NEW-0-20260723-1903-document-public-features-page`** (docs) — do **not** merge; this task owns the smoke harness only

## High-level instructions for coder

- Add `front/scripts/test-features.mjs` (headless Puppeteer, same BASE_URL autodetection pattern as other public smokes): open `/features`, assert hero title (or a stable `FEATURES_PAGE` / visible heading), at least one category section, and nav link back to `/` or register CTA present; fail on pageerror / bad HTTP
- Add `test:features` in **`front/package.json`** and a short row in **`docs/testing.md`**
- No login required; optional language switch assert is nice-to-have only
- Pass/fail: `BASE_URL=http://127.0.0.1:4202 npm run test:features --prefix front` exits 0; docs list the alias
