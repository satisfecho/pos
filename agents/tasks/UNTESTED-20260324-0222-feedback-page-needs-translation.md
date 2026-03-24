# Feedback page needs translation

## GitHub

- **Issue:** https://github.com/satisfecho/pos/issues/67

## Problem / goal

Public feedback URL (e.g. `/feedback/{tenant}` with token) must show **every** part of the form in the user’s selected language. The reporter noted untranslated strings on the live-style URL. Prior implementation and multiple tester **PASS** archives exist under `agents/tasks/done/` (e.g. `CLOSED-20260323-2214-feedback-page-needs-translation.md` and 2026-03-24 close-loop / housekeeping / alignment tasks); issue **#67** is still **open** on GitHub.

## High-level instructions for coder

- Re-verify `/feedback/{tenant}` across supported locales (language picker + direct navigation); confirm `FEEDBACK` (and related) keys in `front/public/i18n/*.json` cover all UI copy, including errors and success states.
- If any gap remains, add or fix keys and bindings only where needed; validate JSON (no syntax regressions like past `de.json` issues).
- Run targeted smoke / Puppeteer if documented for feedback or landing; align with `docs/agent-loop.md` for GitHub handoff when product accepts closure of **#67**.

## Implementation (coder, 2026-03-24)

- Audited `front/public/i18n/*.json`: all locales include the same `FEEDBACK.*` keys as `en.json`; `node` JSON parse check OK for every file.
- **Gap fixed:** The error branch (`invalid_tenant` / `tenant_not_found`) used `translate.instant()` at load time and had **no** language picker, so copy stayed in the language active at navigation time and users could not switch locale on that screen. Replaced with `errorKind` + `translate` pipe in the template, added `app-language-picker` and a small layout shell (`feedback-error-shell` / `feedback-error-bar` in `feedback-public.component.scss`).

## Testing instructions

1. With the stack up (e.g. HAProxy `http://127.0.0.1:4202`), open `/feedback/1`. Use the language picker and confirm form, thank-you (after submit), and **BOOK** strings (address label, Google Maps button) match **Español**, **Deutsch**, and at least two other supported locales.
2. Open `/feedback/0` (or another invalid id). Confirm **language picker** is visible, **title** and **error line** match the selected language; change language on that page and confirm **both** title and error update (not frozen English).
3. Optional: use a non-existent tenant id that passes numeric validation but fails API (if reproducible in your DB) — `FEEDBACK.TENANT_NOT_FOUND` should behave like step 2.
4. **Automated:** `BASE_URL=http://127.0.0.1:4202 npm run test:landing-version --prefix front` (exit 0). **Front build:** `docker compose -f docker-compose.yml -f docker-compose.dev.yml logs --tail=80 front` — no TS/NG errors after changes.
