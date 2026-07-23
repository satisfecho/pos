# Backfill missing French (fr) i18n keys vs en

## GitHub Issues
- **Issue:** (none — enhancement reviewer)
- **0**

## Problem / goal

**`front/public/i18n/fr.json`** lags **`en.json`** by **~149** leaf keys. French is a supported UI language; missing strings fall back or show raw keys after recent auth OTP, kitchen stations, products/tax availability, orders/tax, and related work. Spanish (**`es`**) and German (**`de`**) are already at full leaf parity with `en`.

## Evidence (008 preflight / review)

- Weekly sweep 2026-07-23: `SIGNAL docs_stale×14` all owned; `demo_tables_check=ok`; Unreleased filled (2 bullets); NEW backlog≈62 — improvement theme (i18n), not another stale-doc rewrite
- Flat key-diff heuristic: `en − fr` ≈ 149 missing (sample prefixes: `AUTH.*`, `KITCHEN_DISPLAY.*`, `ORDERS.*`, `PRODUCTS.*`, `MENU.*`)
- Open siblings own other locales only — do **not** merge:
  - **`NEW-0-20260723-1638-backfill-ca-i18n-missing-keys`** (Catalan)
  - **`NEW-0-20260723-1638-backfill-zh-cn-hi-i18n-missing-keys`** (zh-CN + hi)
  - **`NEW-0-20260723-1648-backfill-bg-i18n-missing-keys`** (Bulgarian)

## High-level instructions for coder

- Add every leaf key present in **`front/public/i18n/en.json`** but missing from **`fr.json`**, with proper French copy (not English paste-through unless the English string is a brand/proper noun)
- Prioritize user-visible surfaces: `AUTH.*`, `ORDERS.*`, `PRODUCTS.*`, `MENU.*`, `KITCHEN_DISPLAY.*`
- Keep JSON structure/ordering consistent with sibling locale files; no Angular code changes required unless a key path is wrong
- Do **not** invent new product strings; mirror `en` keys only
- Pass/fail: flat key-set diff `en − fr` is **0** (or only intentionally omitted keys documented in the task); spot-check UI in `fr` for login OTP and an orders/products settings surface
