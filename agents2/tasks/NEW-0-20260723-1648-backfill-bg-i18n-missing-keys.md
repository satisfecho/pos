# Backfill missing Bulgarian (bg) i18n keys vs en

## GitHub Issues
- **Issue:** (none — enhancement reviewer)
- **0**

## Problem / goal

**`front/public/i18n/bg.json`** lags **`en.json`** by **~25** leaf keys. Most are **`SETTINGS.DELIVERY_INTEGRATIONS_*`** marketplace-integration labels plus **`PRODUCTS.PRODUCT_IMAGE`**. Bulgarian stays listed as a supported UI language, so Settings → Delivery integrations can show raw keys while **`es`/`de`/`ur`** already have those strings.

## Evidence (008 preflight / review)

- Weekly sweep 2026-07-23: `SIGNAL docs_stale×14` owned; demo OK; Unreleased filled; NEW backlog≈62 — small i18n parity gap, not a bulk doc rewrite
- Flat key-diff: `en − bg` ≈ 25; majority `SETTINGS.DELIVERY_INTEGRATIONS_*` (add/mapping/credentials/status/copy URL/etc.)
- Sibling locale NEWs (**`…-1638-…-ca…`**, **`…-1638-…-zh-cn-hi…`**, **`…-1648-…-fr…`**) do **not** own Bulgarian — do not merge

## High-level instructions for coder

- Add every leaf key present in **`front/public/i18n/en.json`** but missing from **`bg.json`**, with proper Bulgarian copy
- Use **`es.json`** / **`de.json`** as structure references for the `SETTINGS.DELIVERY_INTEGRATIONS_*` block (translate into Bulgarian; do not copy Spanish/German text)
- Keep JSON structure/ordering consistent with sibling locale files; no product-code changes unless a key path is wrong
- Pass/fail: flat key-set diff `en − bg` is **0**; spot-check Settings → Delivery integrations tab in `bg` if that module is enabled (no raw `SETTINGS.DELIVERY_INTEGRATIONS_*` keys)
