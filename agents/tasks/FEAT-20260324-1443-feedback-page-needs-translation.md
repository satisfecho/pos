# Feedback page needs translation

## GitHub

- **Issue:** https://github.com/satisfecho/pos/issues/67

## Problem / goal

Public guest feedback (`/feedback/{tenant}`, e.g. with `?token=…` on production) must show **fully translated** UI in the selected language: no missing strings, wrong language, or raw i18n keys (`FEEDBACK.*`) in visible copy or document title. Issue reporter cited **https://satisfecho.de** example URL. See `front/public/i18n/`, `FeedbackPublicComponent`, and prior **`agents/tasks/done/`** archives for this theme (multiple tester PASS notes; optional production spot-check and GitHub close remain product decisions per `docs/agent-loop.md`).

## High-level instructions for coder

- Reproduce locally and (if relevant) on production: exercise `/feedback/{tenant}` with and without token across supported locales (language picker and `Accept-Language`).
- Confirm every guest-visible string (form, errors, thank-you, invalid tenant, rate limits) uses ngx-translate; tab title stays localized after language changes.
- Fix any gaps in locale JSON files under `front/public/i18n/` or binding in `feedback-public` as needed; add a short regression check (manual or script) so keys do not reappear.
- When satisfied, document evidence for the issue; support verification comment and closing **#67** when product agrees.
