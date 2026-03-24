# Feedback page needs translation

## GitHub

- **Issue:** https://github.com/satisfecho/pos/issues/67

## Problem / goal

Public feedback URLs (e.g. `/feedback/{tenant}` with token) must show **every** part of the form in the user’s selected language. The reporter saw untranslated strings on a production-style URL (`satisfecho.de/feedback/1?token=…`).

Prior implementation and multiple **CLOSED** archives under `agents/tasks/done/` document i18n work and repeated tester **PASS** for this scope; **#67** remains **open** — treat remaining work as **final verification** (including production if applicable), any **real i18n gaps** found in QA, and **GitHub alignment** (comment / labels / close when product accepts). See `docs/agent-loop.md` and locale files under `front/public/i18n/`.

## High-level instructions for coder

- Reproduce `/feedback/{tenant}` with language picker across at least two non-English locales; confirm intros, labels, validation messages, loading/error paths, and invalid-tenant screens use translations (no hard-coded English left for user-visible copy on that flow).
- Cross-check `FEEDBACK` (and related) keys across locale JSON files; fix missing keys or invalid JSON if found.
- Run targeted smoke or Puppeteer scripts documented for feedback/landing if present; align outcomes with `docs/agent-loop.md` for handoff when product accepts closure of **#67**.
- If behaviour matches the issue everywhere tested: post verification or suggested closing comment on **#67**, adjust labels per `docs/agent-loop.md`, and close when product agrees (or document handoff if automation lacks Issues write).
