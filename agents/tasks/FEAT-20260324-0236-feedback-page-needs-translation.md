# Feedback page needs translation

## GitHub

- **Issue:** https://github.com/satisfecho/pos/issues/67

## Problem / goal

Public feedback URLs (e.g. `/feedback/{tenant}` with token) must show **every** part of the form in the user’s selected language. The reporter saw untranslated strings on production-style URLs. Multiple **CLOSED** archives under `agents/tasks/done/` already document implementation and tester **PASS** for this scope; GitHub **#67** remains **open** — treat remaining work as **verification**, any real i18n gaps, and **GitHub alignment** (comment / labels / close when product agrees). See `docs/agent-loop.md`.

## High-level instructions for coder

- Re-verify `/feedback/{tenant}` (with and without token, invalid tenant path) across several locales using the in-app language picker; confirm `FEEDBACK` (and related) keys exist and read correctly in `front/public/i18n/*.json`.
- If anything is still hard-coded or missing keys, fix in the feedback public flow only; keep JSON valid (no syntax regressions).
- Run documented smoke / Puppeteer if applicable; check `docker compose` **front** logs for a clean Angular build after changes.
- When behaviour matches the issue: use **`gh`** on **#67** if your token allows — verification or closing comment, labels per `docs/agent-loop.md`, and close when product accepts; otherwise note human handoff in the task file for the committer.
