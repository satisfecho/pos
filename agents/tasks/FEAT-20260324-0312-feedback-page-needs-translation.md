# Feedback page needs translation

## GitHub

- **Issue:** https://github.com/satisfecho/pos/issues/67

## Problem / goal

Public feedback URLs (e.g. `/feedback/{tenant}` with token) must show **every** part of the flow in the user’s selected language. The reporter cited production-style URLs with missing translations. Prior delivery and tester **PASS** are archived under `agents/tasks/done/` (e.g. `CLOSED-20260323-2214-feedback-page-needs-translation.md` and 2026-03-24 follow-ups); treat this queue item as **re-verification**, closing any remaining i18n gaps, and **GitHub alignment** (comment / labels / close when product accepts). See `docs/agent-loop.md`.

## High-level instructions for coder

- Reproduce with the issue’s example pattern (tokenized feedback URL); exercise language picker and all form states (valid/invalid input, loading, error paths, invalid tenant if applicable).
- Confirm `FEEDBACK` (and related) keys exist and match across locale files under `front/public/i18n/`; fix any missing or mismatched keys; ensure API validation messages respect locale where the product expects it.
- Run documented smoke / Puppeteer for feedback or landing if available; align outcomes with archived CLOSED tasks so **006** does not redo completed scope without a real regression.
- When behaviour matches the issue: post verification or closing comment on **#67**, adjust labels per `docs/agent-loop.md`, and close when product agrees (or document handoff if automation lacks Issues write).
