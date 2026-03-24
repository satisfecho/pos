# Feedback page needs translation

## GitHub

- **Issue:** https://github.com/satisfecho/pos/issues/67

## Problem / goal

Public feedback routes (`/feedback/{tenant}`, token flows) must be fully localized: no raw `FEEDBACK.*` keys, validation and error copy should respect locale / `Accept-Language` where applicable. Prior implementation and multiple **CLOSED** tester archives under `agents/tasks/done/` document substantial work; the issue remains **open** — treat remaining scope as **final verification** (including production when possible), any **real i18n gaps**, and **GitHub alignment** (comment, labels, close when product accepts). See `docs/agent-loop.md` and `front/public/i18n/`.

## High-level instructions for coder

- Re-verify `/feedback/{tenant}` (and related public paths) across at least two non-default locales; confirm document title, form labels, validation messages, and loading / error branches are translated.
- Cross-check locale JSON validity (e.g. `de.json`) and key parity across `front/public/i18n/` for `FEEDBACK` and shared keys used on the feedback flow.
- Run documented smoke or Puppeteer scripts for landing/feedback if present; fix only if QA finds real untranslated strings or regressions — avoid re-implementing closed scope without evidence.
- When behaviour matches the issue: coordinate **close #67** on GitHub per `docs/agent-loop.md` (or hand off if automation lacks Issues write).
