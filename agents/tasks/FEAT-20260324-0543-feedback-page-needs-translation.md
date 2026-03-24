# Feedback page needs translation

## GitHub

- **Issue:** https://github.com/satisfecho/pos/issues/67

## Problem / goal

Public guest feedback URLs (e.g. `/feedback/{tenant}` with optional `?token=…`) must show **every part of the form** in the user’s selected language—no untranslated or mixed-language UI. Reporter example: production-style URL on satisfecho.de.

Multiple **`agents/tasks/done/`** archives document repeated implementation and tester **PASS** on local Docker for this theme; **#67** remains **open** on GitHub. Remaining work is typically **product verification** (especially production), any **real i18n gaps** discovered there, and **GitHub alignment** (verification comment, labels, close when product accepts). See `front/public/i18n/`, `FeedbackPublicComponent`, and `docs/agent-loop.md`.

## High-level instructions for coder

- Re-read **#67** and verify `/feedback/{tenant}` with and without `?token=…` across supported locales (picker + `Accept-Language`); confirm no raw `FEEDBACK.*` keys in UI or document title.
- Run automated coverage where available (e.g. `npm run test:feedback-public-i18n --prefix front` with `BASE_URL` pointing at the dev stack) and fix any failures or gaps.
- If dev/staging already match acceptance, optional production spot-check on **satisfecho.de**; if product agrees, support closing **#67** with a short verification comment (human may post if automation lacks Issues write).
- Do not duplicate main-coder **NEW-** tasks for this issue—GitHub-driven work stays in this **FEAT-** queue.
