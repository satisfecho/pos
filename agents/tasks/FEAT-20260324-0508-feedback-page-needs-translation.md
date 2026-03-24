# Feedback page needs translation

## GitHub

- **Issue:** https://github.com/satisfecho/pos/issues/67

## Problem / goal

Public guest feedback (`/feedback/{tenant}`, optional `?token=…`) must be fully localized: no raw `FEEDBACK.*` keys, consistent copy and document title across locale picker and `Accept-Language`. Multiple **CLOSED** archives under `agents/tasks/done/` record implementation and tester **PASS** on dev; **#67** remains **open** — finish **product verification** (especially production if not yet spot-checked), close any real gaps, and **align GitHub** (comment, labels, close when accepted). See `front/public/i18n/` and `docs/agent-loop.md`.

## High-level instructions for coder

- Confirm behaviour on the stack you use: several locales, with and without token, invalid-tenant paths; document title after translation load.
- If anything still fails in prod/staging, fix i18n or loading order; otherwise hand off to tester and support **close #67** per `docs/agent-loop.md`.
- Run or point to `test-feedback-public-i18n` (or equivalent) from `front/scripts/` / `docs/testing.md` when claiming verification.
- **GitHub:** Post a short verification comment on **#67** and close when product agrees (automation here may lack **Issues** write on `gh`).
