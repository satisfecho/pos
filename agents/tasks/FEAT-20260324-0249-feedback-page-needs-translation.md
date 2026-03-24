# Feedback page needs translation

## GitHub

- **Issue:** https://github.com/satisfecho/pos/issues/67

## Problem / goal

Public feedback URLs (e.g. `/feedback/{tenant}` with token) must show **every** part of the form in the user’s selected language. The reporter saw untranslated strings on production-style URLs.

Prior implementation and multiple **CLOSED** archives under `agents/tasks/done/` document i18n work and tester **PASS** for this scope; **#67** may still need **final QA on production**, any **remaining gaps**, and **GitHub alignment** (comment / labels / close when product accepts). See `docs/agent-loop.md`.

## High-level instructions for coder

- Re-verify `/feedback/{tenant}` (with and without token) across locales using the shared language picker; confirm invalid-tenant and loading paths stay localized.
- If anything is still English or missing keys, extend `front/public/i18n/*` and templates; keep JSON valid (syntax errors block whole locales).
- Run documented smoke / Puppeteer for feedback or landing if available; check `docker compose` **front** logs for build errors after edits.
- When behaviour matches the issue: coordinate **close #67** on GitHub (or note handoff if automation lacks Issues write).
