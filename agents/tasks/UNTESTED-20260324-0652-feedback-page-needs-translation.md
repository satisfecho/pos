# Feedback page needs translation

## GitHub

- **Issue:** https://github.com/satisfecho/pos/issues/67

## Problem / goal

Public guest feedback at `/feedback/{tenant}` (e.g. with `?token=…`) must show **no untranslated UI**: every part of the form and related states in the selected language. Prior CLOSED archives under `agents/tasks/done/` record repeated dev verification; **#67** remains open — align implementation with issue acceptance, optional production check on **satisfecho.de**, and GitHub closure when product agrees. See `front/public/i18n/`, `FeedbackPublicComponent`, and `docs/agent-loop.md`.

## High-level instructions for coder

- Re-read **#67** and verify `/feedback/{tenant}` with and without `?token=…` across supported locales (picker + `Accept-Language`); confirm no raw `FEEDBACK.*` keys in visible UI or document title.
- If dev already matches acceptance, document evidence for the issue; optional production spot-check; support verification comment and close **#67** when product accepts.
- If gaps remain, extend JSON under `front/public/i18n/` and template/bindings in `feedback-public` until all guest-visible copy is translated.
- Keep or extend automated checks (e.g. Puppeteer feedback i18n script) so regressions are caught.

## Coder notes (2026-03-24)

- **`FeedbackPublicComponent`** (`front/src/app/feedback-public/`): guest-visible copy uses the translate pipe or `TranslateService`; document title uses `translate.get` on language/translation changes so the tab title stays localized (see issue #67).
- **Locales:** `FEEDBACK` keys in `front/public/i18n/en.json` are present for **de, es, fr, ca, zh-CN, hi** (same key set).
- **API errors:** public POST uses localized `get_message(..., lang)` for tenant/token/email/phone failures; the client maps 429 and 422-style responses to `FEEDBACK.RATE_LIMIT` / `FEEDBACK.VALIDATION_ERROR`.
- **Automated evidence:** `npm run test:feedback-public-i18n --prefix front` with `BASE_URL=http://127.0.0.1:4202` completed successfully (ES `navigator.language` stub on first paint, EN→DE/FR/ES/CA/zh-CN/hi via picker, `?token=` path, submit → thank-you in DE, `/feedback/0` error copy).
- **GitHub #67:** Implementation matches stated acceptance on dev; close after product sign-off. Optional prod spot-check: same script with `BASE_URL=https://satisfecho.de`.

## Testing instructions

1. Start the dev stack (e.g. `docker compose -f docker-compose.yml -f docker-compose.dev.yml`); use the HAProxy host port (often **4202**).
2. From repo: `cd front && BASE_URL=http://127.0.0.1:4202 npm run test:feedback-public-i18n`
3. **Pass:** all `>>> RESULT: … OK` log lines; script asserts visible text and `document.title` do not contain the substring `FEEDBACK.`.
4. **Manual (optional):** `/feedback/1` — exercise language picker and, if needed, `?token=…` for a valid reservation on tenant 1.
