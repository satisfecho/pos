# Feedback page needs translation

## GitHub

- **Issue:** https://github.com/satisfecho/pos/issues/67

## Problem / goal

Public guest feedback (`/feedback/{tenant}`, e.g. with `?token=…` on production URLs) must show **fully translated** UI: every form label, message, error, and document title in the **selected** language—no mixed languages, missing strings, or raw `FEEDBACK.*` keys. Reporter cited `https://satisfecho.de/feedback/1?token=…` as an example.

Relevant areas: `front/src/app/feedback-public/`, locale JSON under `front/public/i18n/`, and `front/scripts/test-feedback-public-i18n.mjs` for regression coverage. Prior closed tasks under `agents/tasks/done/` document many verification passes on **development**; issue may still need production sign-off or gap fixes.

## High-level instructions for coder

- Reproduce on local Docker and optionally production: open `/feedback/{tenant}` with and without token; exercise the language picker and `Accept-Language`; confirm no untranslated segments or wrong-language copy.
- Ensure `FeedbackPublicComponent` template and programmatic strings (API errors, titles) use ngx-translate consistently; extend locale files for any missing keys across supported languages.
- Run or extend `npm run` / `node front/scripts/test-feedback-public-i18n.mjs` (with `BASE_URL` pointing at HAProxy dev port) so regressions are caught in CI or local smoke.
- If **development** already matches acceptance, document evidence for the issue; support a short GitHub verification comment and closing **#67** when product agrees (`docs/agent-loop.md`).
