# Feedback page needs translation

## GitHub
- **Issue:** https://github.com/satisfecho/pos/issues/67

## Problem / goal
Public guest feedback URLs such as `/feedback/{tenant}` with optional `?token=…` must show **fully translated** UI in the selected language. The issue reports untranslated strings on production-style URLs (example in issue body). Every part of the form and related states should use i18n; no raw translation keys in visible copy or document title. See `front/src/app/feedback-public/`, `front/public/i18n/`, and prior `agents/tasks/done/**/CLOSED-*-feedback-page-needs-translation.md` archives for context.

## High-level instructions for coder
- Re-read issue **#67** and reproduce on local Docker (`/feedback/{tenant}`, with and without token) across supported locales (picker and `Accept-Language`).
- Confirm no raw `FEEDBACK.*` keys in DOM, user-visible strings, or tab title after locale switches.
- If gaps exist, fix templates/services and JSON under `front/public/i18n/`; keep API error paths localized where user-facing.
- If dev already matches acceptance, capture concise evidence; optional production check on **satisfecho.de**; support product/GitHub closure of **#67** when agreed (`docs/agent-loop.md`).
