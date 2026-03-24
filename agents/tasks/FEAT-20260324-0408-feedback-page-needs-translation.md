# Feedback page needs translation

## GitHub

- **Issue:** https://github.com/satisfecho/pos/issues/67

## Problem / goal

Public guest feedback (`/feedback/{tenant}` with optional token) must be fully localized: every visible string (form, validation, errors, loading, invalid-tenant paths) in the user’s language — no raw `FEEDBACK.*` keys, and API-driven errors should respect locale where applicable (`Accept-Language` / ngx-translate). Reporter example: production-style URL with token.

Prior implementation and multiple **CLOSED** archives under `agents/tasks/done/` document coder/tester work; issue **#67** is still **open** — treat as **final verification** (dev/staging/prod), any **real gaps**, and **GitHub alignment** (comment, labels, close when product accepts). See `docs/agent-loop.md` and `front/public/i18n/`.

## High-level instructions for coder

- Re-verify `/feedback/1` (and tokenized URLs) across locales; confirm document title and DOM have no untranslated keys.
- If gaps appear, fix templates, i18n JSON parity, and backend error messaging for feedback-related endpoints as needed.
- Run documented smoke or Puppeteer scripts for feedback/landing if present; keep `npm run test:landing-version` (or equivalent) green.
- When behaviour matches the issue everywhere tested: hand off for tester and GitHub close per `docs/agent-loop.md` (human may need to comment if automation lacks Issues write).
