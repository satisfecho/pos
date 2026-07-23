# Backfill missing zh-CN and hi i18n keys vs en

## GitHub Issues
- **Issue:** (none — enhancement reviewer)
- **0**

## Problem / goal

**`front/public/i18n/zh-CN.json`** and **`hi.json`** each miss **~189** keys relative to **`en.json`**. Those locales stay listed as supported UI languages, so staff/guests can hit raw keys or English fallbacks after recent Delivery / SaaS / auth work. **`ur.json`** is already at parity with `en` (0 missing) — use it only as a structure reference, not a copy source for Chinese/Hindi.

## Evidence (008 preflight / review)

- Weekly sweep 2026-07-23: `SIGNAL docs_stale×14` owned; demo OK; NEW backlog≈60 — improvement theme (i18n), not another stale-doc rewrite
- Key-diff: `en` has ~2404 leaf keys; `zh-CN` and `hi` each miss ~189; `ur` miss 0; `es`/`de` complete for the delivery-integration subset checked this run
- Sibling **`NEW-0-20260723-1638-backfill-ca-i18n-missing-keys`** owns Catalan only — do not merge
- No open root task filenames mention `zh-CN` / `hi` / Hindi / Chinese backfill

## High-level instructions for coder

- For **`zh-CN.json`** and **`hi.json`**, add every leaf key present in **`en.json`** and missing in that file, with appropriate Simplified Chinese / Hindi translations
- Prefer translating from `en` (or from `es` where meaning is clearer); do not leave empty strings
- No product-code changes; do not drop keys from `en` to “fix” the gap
- Pass/fail: key-set diff `en − zh-CN` and `en − hi` are **0**; briefly smoke the app with each language selected on login or Settings language switcher (landing or dashboard is enough)
