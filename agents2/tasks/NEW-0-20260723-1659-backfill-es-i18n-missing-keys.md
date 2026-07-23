# Backfill missing Spanish (es) i18n keys vs en

## GitHub Issues
- **Issue:** (none — enhancement reviewer)
- **0**

## Problem / goal

**`front/public/i18n/es.json`** lags **`en.json`** by **~15** leaf keys (small but user-visible). Spanish is a primary UI language; gaps cover book validation, reservation cancel/rate-limit copy, working-plan save/delete toasts, auth invalid-email, menu customize, co-owner hint, and public terms placeholder. An earlier 008 note on the fr backfill task incorrectly claimed `es` was at full parity — it is not.

## Evidence (008 preflight / review)

- Weekly sweep 2026-07-23T16:59Z: `SIGNAL docs_stale×14` all owned; `demo_tables_check=ok`; Unreleased=2; NEW backlog≈65 — improvement theme (i18n), not another stale-doc rewrite
- Flat key-diff: `en − es` ≈ 15 (`WORKING_PLAN`×5, `BOOK`×4, `RESERVATIONS`×2, plus `AUTH.INVALID_EMAIL`, `MENU.CUSTOMIZE_OPTIONS`, `SETTINGS.PUBLIC_TERMS_OF_SERVICE_PLACEHOLDER`, `USERS.CO_OWNER_HINT`)
- Open siblings own other locales only — do **not** merge with **`NEW-0-20260723-1659-backfill-de-i18n-missing-keys`** or the ca/fr/bg/zh-CN/hi backfills

## High-level instructions for coder

- Add every leaf key present in **`front/public/i18n/en.json`** but missing from **`es.json`**, with proper Spanish copy
- Keep JSON structure/ordering consistent with sibling locale files; no Angular code changes required unless a key path is wrong
- Do **not** invent new product strings; mirror `en` keys only
- Pass/fail: flat key-set diff `en − es` is **0**; spot-check book validation + working-plan save toast in `es`
