# Translation needed for Settings > Data and privacy

## GitHub
- **Issue:** https://github.com/satisfecho/pos/issues/108

## Problem / goal
Staff **Settings → Data & privacy** is English-only. The section must be translated for every locale the app already supports (same coverage as other settings areas). Align keys, JSON files under `front` i18n, and any backend strings if this section touches API messages.

## High-level instructions for coder
- Locate the Data & privacy settings UI and list all user-visible strings (titles, labels, hints, buttons, legal/helper text).
- Add or complete translation keys and entries in each supported language bundle (match existing i18n patterns for Settings).
- Manually spot-check switching languages: Data & privacy reads fully localized with no English fallbacks.
- If copy is shared with emails or exports, ensure those paths use the same keys or explicit locale handling where applicable.

## Implementation (coder)

- **UI:** `front/src/app/settings/settings.component.ts` — Data & privacy block already uses `SETTINGS.DATA_EXPORT_*`, `SETTINGS.DANGER_ZONE_*`, `SETTINGS.PURGE_*`, `SETTINGS.DATA_AND_PRIVACY_TAB` (no template changes).
- **Locales:** Added the full data-privacy key set to **`es.json`**, **`fr.json`**, **`ca.json`**, **`zh-CN.json`**, **`hi.json`** (previously absent → ngx-translate fell back to English). **`bg.json`:** translated `PURGE_CONFIRM_LABEL` from English. **`en.json`** / **`de.json`** already complete.

## Testing instructions

1. Run **`python3 -m json.tool front/public/i18n/<locale>.json`** on edited files (or the loop over `front/public/i18n/*.json`) — all must parse.
2. With the app up (e.g. Docker HAProxy **`http://127.0.0.1:4202`**), log in as **tenant owner** (purge/export are owner-only), open **Settings**, click **Data & privacy** (tab label must be localized).
3. For each shipped language (**en**, **de**, **es**, **fr**, **ca**, **bg**, **zh-CN**, **hi**): switch app language, reload Settings → Data & privacy, confirm **no English** in titles, descriptions, labels, or buttons (except business name placeholder reflecting the tenant’s actual name).
4. Smoke: **`cd front && BASE_URL=http://127.0.0.1:4202 npm run test:landing-version`** (passes exit 0).

**Note:** API purge errors may still return an English `detail` string from the backend; the UI falls back to **`SETTINGS.PURGE_FAILED`** when `detail` is not a string.
