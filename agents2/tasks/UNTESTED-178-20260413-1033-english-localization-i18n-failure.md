# English Localization Resource Failure (i18n)

## GitHub Issues
- **Issue:** https://github.com/satisfecho/pos/issues/178
- **178**

## Problem / goal
When the user selects **English (EN)**, the UI shows **raw translation keys** (e.g. `NAV.DASHBOARD`, `AUTH.SIGN_IN`) instead of human-readable strings. **Other locales** (e.g. Spanish, French) render correctly, so the problem is isolated to **English resources**, not the general i18n pipeline.

Likely areas to verify: `en.json` (or equivalent) present in the app bundle, valid JSON (no syntax errors), and that deploy/CI copies i18n assets as expected for EN.

## High-level instructions for coder
- Compare **`front/public/i18n/en.json`** (and any EN-specific paths) with a working locale such as **`es.json`**: structure, required keys, and file validity (parse as JSON locally).
- Confirm Angular/ngx-translate (or project equivalent) loads **`en`** the same way as other languages; fix missing merge, wrong path, or loader failure for EN only.
- Reproduce in dev: switch language to English and confirm keys vs strings; after fix, spot-check main nav and auth strings.
- If production-only: verify build output and deployment include **`en.json`**; align with **`docs/`** and **`.cursor/rules/angular-ngx-translate.mdc`** if applicable.

## Implementation notes (coder)
- **Cause:** `front/public/i18n/en.json` had been reduced to a tiny fragment (only a few `SETTINGS.*` keys). Full English copy existed in git through **`0158c7c`**; it was overwritten by the **`b1f2e56`** “changelog and i18n for Google review settings” change, so ngx-translate loaded an almost-empty EN bundle and fell back to showing keys.
- **Fix:** Restored the full **`en.json`** from **`0158c7c`**, then merged keys added in later locale work: **`SETTINGS.PUBLIC_GOOGLE_REVIEW_DESCRIPTION`**, **`SETTINGS.PUBLIC_GOOGLE_REVIEW_INSTRUCTIONS`**, and **`PRODUCTS.PRODUCT_IMAGE`** (English strings). File is valid JSON (~1860 lines).

## Testing instructions
1. **`python3 -m json.tool front/public/i18n/en.json`** — must exit 0.
2. With the app running (e.g. HAProxy on **4202**): set language to **English** in the UI (or via the same control used for ES/FR). Confirm **nav** and **auth** show human-readable text (e.g. “Dashboard”, “Sign in”), not raw keys like `NAV.DASHBOARD`.
3. Optional: **`BASE_URL=http://127.0.0.1:4202 npm run test:landing-version --prefix front`** after a successful login path (if the stack returns 500 on login, fix env/API separately; this change is translation JSON only).
4. After deploy: confirm **`/i18n/en.json`** (or the bundled asset path) includes the full file in the network tab.

## Implementation notes (coder)
- **Cause:** `front/public/i18n/en.json` had been reduced to a tiny fragment (only a few `SETTINGS.*` keys). Full English copy existed in git through **`0158c7c`**; it was overwritten by the **`b1f2e56`** “changelog and i18n for Google review settings” change, so ngx-translate loaded an almost-empty EN bundle and fell back to showing keys.
- **Fix:** Restored the full **`en.json`** from **`0158c7c`**, then merged keys added in later locale work: **`SETTINGS.PUBLIC_GOOGLE_REVIEW_DESCRIPTION`**, **`SETTINGS.PUBLIC_GOOGLE_REVIEW_INSTRUCTIONS`**, and **`PRODUCTS.PRODUCT_IMAGE`** (English strings). File is valid JSON (~1860 lines).

## Testing instructions
1. **`python3 -m json.tool front/public/i18n/en.json`** — must exit 0.
2. With the app running (e.g. HAProxy on **4202**): set language to **English** in the UI (or via the same control used for ES/FR). Confirm **nav** and **auth** show human-readable text (e.g. “Dashboard”, “Sign in”), not raw keys like `NAV.DASHBOARD`.
3. Optional: **`BASE_URL=http://127.0.0.1:4202 npm run test:landing-version --prefix front`** after a successful login path (if the stack returns 500 on login, fix env/API separately; this change is translation JSON only).
4. After deploy: confirm **`/i18n/en.json`** (or the bundled asset path) includes the full file in the network tab.
