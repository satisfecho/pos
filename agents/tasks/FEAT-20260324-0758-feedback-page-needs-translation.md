# Feedback page needs translation

## GitHub
- **Issue:** https://github.com/satisfecho/pos/issues/67

## Problem / goal
Public guest feedback at `/feedback/{tenant}` (e.g. with `?token=…`) must be **fully translated** in the selected language. The issue reports untranslated strings on production-style URLs. No raw translation keys in visible UI or document title. See `front/src/app/feedback-public/`, `front/public/i18n/`, and `docs/agent-loop.md` / prior `agents/tasks/done/**/CLOSED-*-feedback-page-needs-translation.md` archives.

## High-level instructions for coder
- Re-read issue **#67** and reproduce on local Docker (`/feedback/{tenant}`, with and without token) across supported locales (picker and `Accept-Language`).
- Confirm no raw `FEEDBACK.*` keys in DOM, user-visible strings, or tab title after locale switches.
- If gaps exist, fix templates/services and JSON under `front/public/i18n/`; keep API error paths localized where user-facing.
- If dev already matches acceptance, capture concise evidence; optional production check on **satisfecho.de**; support product/GitHub closure of **#67** when agreed (`docs/agent-loop.md`).
