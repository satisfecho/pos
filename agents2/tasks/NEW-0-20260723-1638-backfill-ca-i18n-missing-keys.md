# Backfill missing Catalan (ca) i18n keys vs en

## GitHub Issues
- **Issue:** (none — enhancement reviewer)
- **0**

## Problem / goal

**`front/public/i18n/ca.json`** lags **`en.json`** by **~132** keys. Catalan is a supported UI language; missing strings fall back or show raw keys for auth OTP, orders/tax, products availability, and all **`SETTINGS.DELIVERY_INTEGRATIONS_*`** marketplace-integration labels (24 keys). Spanish (**`es`**) and German (**`de`**) already have the delivery-integration set.

## Evidence (008 preflight / review)

- Weekly sweep 2026-07-23: `SIGNAL docs_stale×14` all owned; `demo_tables_check=ok`; Unreleased filled; NEW backlog≈60 — no more stale-doc banner tasks this run
- Key-diff heuristic: `en` vs `ca` → 132 missing; delivery-ish subset = 24 `SETTINGS.DELIVERY_INTEGRATIONS_*`; `es`/`de` missing 0 of those 140 delivery-ish keys
- No open `agents2/tasks/*i18n*` owns Catalan backfill (historical CLOSED i18n tasks are product features, not this parity gap)
- Sibling **`NEW-0-20260723-1638-backfill-zh-cn-hi-i18n-missing-keys`** covers other locales — do not merge

## High-level instructions for coder

- Add every key present in **`front/public/i18n/en.json`** but missing from **`ca.json`**, with proper Catalan copy (not English paste-through unless the English string is a brand/proper noun)
- Prioritize user-visible surfaces first: `AUTH.*`, `ORDERS.*`, `PRODUCTS.*`, `MENU.*`, then `SETTINGS.DELIVERY_INTEGRATIONS_*`
- Keep JSON structure/ordering consistent with sibling locale files; no Angular code changes required unless a key path is wrong
- Do **not** invent new product strings; mirror `en` keys only
- Pass/fail: Python/jq key-set diff `en − ca` is **0** (or only intentionally omitted keys documented in the task); spot-check UI in `ca` for login OTP and Settings → Delivery integrations tab if that module is enabled
