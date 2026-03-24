# Feedback page needs translation

## GitHub

- **Issue:** https://github.com/satisfecho/pos/issues/67

## Problem / goal

Public guest feedback (`/feedback/{tenant}`, e.g. with `?token=…`) must show fully translated UI: no missing strings, wrong language, or raw `FEEDBACK.*` keys in visible copy or document title. Reporter cited production-style URLs (e.g. satisfecho.de). Many **CLOSED** archives under `agents/tasks/done/` cover this theme; **#67** remains open until product verification and GitHub closure align with `docs/agent-loop.md`.

## High-level instructions for coder

- Reproduce `/feedback/{tenant}` with and without token across supported locales (`front/public/i18n/`, `FeedbackPublicComponent` under `front/src/app/feedback-public/`).
- Fix any remaining i18n gaps (JSON parity vs `en.json`, translate pipe / title handling, API error display).
- Run or extend automated checks (e.g. `front/scripts/test-feedback-public-i18n.mjs`) and document results for testers / product.
