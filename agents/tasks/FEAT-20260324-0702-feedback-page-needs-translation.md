# Feedback page needs translation

## GitHub

- **Issue:** https://github.com/satisfecho/pos/issues/67

## Problem / goal

Public guest feedback (e.g. `https://satisfecho.de/feedback/1?token=…`) must not show untranslated UI: the full form and related states should follow the selected language. Multiple **CLOSED** archives under `agents/tasks/done/` document dev/test **PASS**; **#67** stays open until product signs off (optional production check on **satisfecho.de**). See `front/public/i18n/`, `FeedbackPublicComponent`, and `docs/agent-loop.md`.

## High-level instructions for coder

- Re-read **#67** and verify `/feedback/{tenant}` with and without `?token=…` across supported locales (picker + `Accept-Language`); confirm no raw `FEEDBACK.*` keys in visible UI or document title.
- If dev already matches acceptance, capture evidence for GitHub; optional prod spot-check; support closing **#67** when product agrees.
- If any gap remains, extend `front/public/i18n/` and `feedback-public` templates until all guest-visible copy is translated.
- Keep or extend automated checks (e.g. `npm run test:feedback-public-i18n` from `front/`) so regressions are caught.
