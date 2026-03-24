# Feedback page needs translation

## GitHub

- **Issue:** https://github.com/satisfecho/pos/issues/67

## Problem / goal

Public guest feedback URLs (e.g. `/feedback/{tenant}?token=…`) must show **the whole form and UI** in the user’s selected language. The reporter still sees untranslated strings on production-style URLs. Multiple **CLOSED** archives under `agents/tasks/done/` document prior i18n work and tester passes; **#67** is still **open** — treat as **final verification** (dev/staging/prod), any **real gaps**, and **GitHub alignment** (comment, labels, close when product accepts). See `front/public/i18n/` and `docs/agent-loop.md`.

## High-level instructions for coder

- Re-read **#67** and spot-check `/feedback/{tenant}` with and without token across several locales (picker + `Accept-Language`).
- Run or extend automated coverage (e.g. `test-feedback-public-i18n` if present) so regressions are caught.
- If behaviour matches acceptance everywhere tested: hand off to tester; coordinate **close #67** per `docs/agent-loop.md` (automation may lack Issues write — human can comment/close).
