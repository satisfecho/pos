# Bulagarian internal dashboard subtitle not translated

## GitHub
- **Issue:** https://github.com/satisfecho/pos/issues/107

## Problem / goal
With Bulgarian selected and after login, the internal dashboard still shows the English subtitle **"Manage your business operations from here"**. The Bulgarian i18n JSON (and any related keys for the dashboard / home shell) needs to be completed so this string is translated like the rest of the staff UI. Related prior work: issue **#103** (Bulgarian language) — this is a follow-up gap on the dashboard subtitle.

## High-level instructions for coder
- Locate the dashboard (or layout) template that renders the subtitle and identify the translation key or hard-coded string.
- Add or fix the Bulgarian (`bg`) entry in the appropriate `front` i18n file(s); keep key parity with other locales.
- Manually verify: set locale to Bulgarian, log in as staff, confirm the subtitle is no longer English and matches tone of neighboring UI copy.
- Run the usual front build check (`docker compose … logs front` or equivalent) so no TS/i18n regressions.

## Implementation
- **Key:** `DASHBOARD.WELCOME_TEXT` in `front/public/i18n/bg.json` was still the English source string.
- **Change:** Set to **"Управлявайте бизнес операциите си оттук"** (imperative, aligned with neighboring dashboard card copy).

## Testing instructions
1. **Manual:** Open the app, use the header **language** dropdown and choose **Български** (`bg`). Log in as staff and open `/dashboard`. The line under **„Добре дошли отново“** must show the Bulgarian sentence above, not **"Manage your business operations from here"**.
2. **Build:** `docker compose -f docker-compose.yml -f docker-compose.dev.yml logs --tail=80 front` — no Angular/TS errors after reload.
3. **Smoke:** With stack up, `BASE_URL=http://127.0.0.1:4202 npm run test:landing-version --prefix front` (exit 0).
