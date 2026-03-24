# Feedback page needs translation

## GitHub

- **Issue:** https://github.com/satisfecho/pos/issues/67

## Problem / goal

Public guest feedback (e.g. `/feedback/{tenant}` with optional `?token=…`, including production URLs) must show **fully localized** UI: no untranslated segments in the form or related states for the user’s selected language. Issue reporter listed several untranslated spots on the token deep link.

Prior **`agents/tasks/done/`** archives document repeated dev/test **PASS** on **`development`**; **#67** may remain open until optional production spot-check and product sign-off. See `front/public/i18n/`, `FeedbackPublicComponent`, and `docs/agent-loop.md`.

## High-level instructions for coder

- Re-read **#67** and exercise `/feedback/{tenant}` with and without `?token=…` across supported locales (language picker and `Accept-Language`).
- Confirm no raw `FEEDBACK.*` keys (or other i18n leaks) in visible DOM, document title, or post-submit states.
- If anything is still missing, add keys in all locale JSON files under `front/public/i18n/` and bind in the guest feedback templates/components.
- Run or extend the existing feedback i18n smoke (Puppeteer under `front/scripts/` if present) and note results for the closer.
- If dev matches acceptance: optional verification on **satisfecho.de**; support a short GitHub verification comment and closing **#67** when product agrees.
