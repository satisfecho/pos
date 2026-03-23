# Feedback page needs translation

## GitHub
- **Issue:** https://github.com/satisfecho/pos/issues/67

## Problem / goal
The public feedback URL (e.g. `https://satisfecho.de/feedback/1?token=…`) shows UI that does not respect the user’s selected language: parts of the form remain untranslated. Every visible string on that flow should use the same i18n approach as the rest of the app so locale selection is consistent end-to-end.

## High-level instructions for coder
- Audit the feedback route/component(s) and templates for hard-coded or missing translation keys.
- Align with existing Angular i18n / translation patterns used elsewhere (e.g. book, public pages); add keys and catalog entries for all user-facing copy on the feedback form and related messages.
- Manually verify at least one non-default locale that the full page (labels, buttons, validation, errors) switches correctly when language changes.
- If docs mention public feedback URLs or i18n conventions, skim `docs/` and `README.md` for consistency.

## Testing instructions

1. With the stack up (e.g. HAProxy on `http://127.0.0.1:4202`), open `/feedback/1` (or a valid tenant id).
2. Use the header language picker and switch to **Français**, **Català**, **中文（简体）**, and **हिन्दी** in turn. Confirm the form title, intro, rating label, comment labels/placeholder, contact fieldset legend and hint, submit/sending button text, and thank-you page copy are in that language (not English).
3. Optional: invalid tenant (`/feedback/0`) and missing tenant — error lines should match the selected language (`FEEDBACK.INVALID_TENANT` / `FEEDBACK.TENANT_NOT_FOUND`).
4. **Automated:** `BASE_URL=http://127.0.0.1:4202 npm run test:landing-version --prefix front` (exit 0). **Front build:** `docker compose -f docker-compose.yml -f docker-compose.dev.yml logs --tail=80 front` — no Angular/TS errors after changes.
