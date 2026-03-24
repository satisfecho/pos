# Feedback page needs translation

## GitHub

- **Issue:** https://github.com/satisfecho/pos/issues/67

## Problem / goal

Public guest feedback URLs (e.g. `https://satisfecho.de/feedback/1?token=…`) must show **every part of the form** in the user’s selected language; several strings were still untranslated. Prior implementation and tester archives live under `agents/tasks/done/` (multiple **CLOSED** entries for this theme); confirm behaviour on dev and production, close any real i18n gaps, and align GitHub (verification comment, labels, close when product accepts). See `front/public/i18n/`, `docs/agent-loop.md`, and Puppeteer `test-feedback-public-i18n` if present.

## High-level instructions for coder

- Re-read **#67** and spot-check `/feedback/{tenant}` with and without `?token=…` across supported locales (picker + `Accept-Language`).
- Ensure no raw `FEEDBACK.*` keys leak in the DOM or document title; titles should follow translation load (avoid brief key flashes after first paint).
- Run the project’s public feedback i18n smoke / Puppeteer coverage and fix any failures.
- If dev matches acceptance: optional production spot-check on **satisfecho.de**; coordinate **close #67** with a short verification comment when product agrees.
