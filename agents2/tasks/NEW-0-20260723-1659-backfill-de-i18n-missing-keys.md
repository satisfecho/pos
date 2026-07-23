# Backfill missing German (de) i18n keys vs en

## GitHub Issues
- **Issue:** (none — enhancement reviewer)
- **0**

## Problem / goal

**`front/public/i18n/de.json`** lags **`en.json`** by **~91** leaf keys. German is a primary supported UI language; missing strings fall back or show raw keys on auth OTP, settings (taxes/providers/OTP/security), reservations overbooking/notes, products tax/availability, and book validation. An earlier 008 note on the fr backfill task incorrectly claimed `de` was at full parity — it is not.

## Evidence (008 preflight / review)

- Weekly sweep 2026-07-23T16:59Z: `SIGNAL docs_stale×14` all owned; `demo_tables_check=ok`; Unreleased=2; NEW backlog≈65 — improvement theme (i18n), not another stale-doc rewrite
- Flat key-diff: `en − de` ≈ 91 (prefixes: `SETTINGS` ~53, `RESERVATIONS` ~16, `AUTH` ~7, `PRODUCTS` ~7, `BOOK` ~4, plus `ORDERS`/`MENU`/`REPORTS`)
- Open siblings own other locales only — do **not** merge:
  - **`NEW-0-20260723-1638-backfill-ca-i18n-missing-keys`**
  - **`NEW-0-20260723-1638-backfill-zh-cn-hi-i18n-missing-keys`**
  - **`NEW-0-20260723-1648-backfill-fr-i18n-missing-keys`**
  - **`NEW-0-20260723-1648-backfill-bg-i18n-missing-keys`**
  - **`NEW-0-20260723-1659-backfill-es-i18n-missing-keys`** (Spanish, same run)

## High-level instructions for coder

- Add every leaf key present in **`front/public/i18n/en.json`** but missing from **`de.json`**, with proper German copy (not English paste-through unless the English string is a brand/proper noun)
- Prioritize user-visible surfaces: `AUTH.*`, `SETTINGS.*` (taxes, providers, OTP, security), `RESERVATIONS.*`, `PRODUCTS.*`, `BOOK.*`
- Keep JSON structure/ordering consistent with sibling locale files; no Angular code changes required unless a key path is wrong
- Do **not** invent new product strings; mirror `en` keys only
- Pass/fail: flat key-set diff `en − de` is **0**; spot-check UI in `de` for login OTP and Settings → Taxes / Security
