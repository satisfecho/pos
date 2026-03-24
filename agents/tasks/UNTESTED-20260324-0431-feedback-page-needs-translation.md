# Feedback page needs translation

## GitHub

- **Issue:** https://github.com/satisfecho/pos/issues/67

## Problem / goal

Public guest feedback URLs (e.g. `/feedback/{tenant}` with `?token=…`) must show **the entire form and UI** in the user’s selected language. The reporter saw untranslated strings on production-style URLs. Multiple **`agents/tasks/done/`** archives document prior implementation and tester passes; **#67** remains **open** — treat remaining work as **final verification** (dev/staging/prod), any **real i18n gaps**, and **GitHub alignment** (comment, labels, close when product accepts). See `front/public/i18n/` and `docs/agent-loop.md`.

## High-level instructions for coder

- Re-check `/feedback/{tenant}` with and without token across supported locales; confirm no raw `FEEDBACK.*` keys, correct document titles, and API validation/error copy respecting `Accept-Language` / locale picker where applicable.
- Run or extend Puppeteer/smoke coverage for public feedback if documented in `docs/testing.md`.
- If behaviour matches the issue everywhere tested: hand off for tester and coordinate **close #67** on GitHub per `docs/agent-loop.md` (human may need to post if automation lacks Issues write).

## Coder notes (2026-03-24 UTC)

- Re-checked `FeedbackPublicComponent`: form, errors, loading, thank-you, and document title use ngx-translate; submit path maps **429**/**422** to `FEEDBACK.*`; string `detail` from API is used only when backend returns a localized message (`Accept-Language` via `acceptLanguageInterceptor` + `LanguageService`).
- Extended **`front/scripts/test-feedback-public-i18n.mjs`**: **hi** in the picker loop; invalid tenant **`/feedback/0`** (switches to **de** for body + title); before the invalid-tenant navigation, **`en`** is selected so **localStorage** from earlier steps does not assert the wrong language.
- **`docs/testing.md`:** table row for `test:feedback-public-i18n` updated to match the script.

## Testing instructions

### What to verify

- Public `/feedback/1` (or `TENANT_ID`): no raw `FEEDBACK.*` in visible text; document title matches selected locale after using the language picker.
- Same with `?token=…` (dummy token is fine for copy/title checks).
- `/feedback/0`: error state shows translated invalid-tenant copy and title; switching to **Deutsch** shows German strings, still no raw keys.

### How to test

- Stack up (e.g. HAProxy on **4202**): `docker compose -f docker-compose.yml -f docker-compose.dev.yml ps`
- From **`front/`:** `BASE_URL=http://127.0.0.1:4202 npm run test:feedback-public-i18n`
- Optional: manual spot-check production URL from the issue on **satisfecho.de** with the same picker locales.

### Pass / fail criteria

- **Pass:** Script exits **0**; manual checks show no English-only leaks when a non-English locale is selected (except tenant-provided fields: name, address, description).
- **Fail:** Any `FEEDBACK.` substring in body text, wrong tab title for the active locale, or script timeout/error.

### GitHub (#67)

- After tester **closed** loop: comment on the issue, align labels per **`docs/agent-loop.md`**; close when product accepts (human if no API token).
