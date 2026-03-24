# Feedback page needs translation

## GitHub

- **Issue:** https://github.com/satisfecho/pos/issues/67

## Problem / goal

Public guest feedback URLs (e.g. `https://satisfecho.de/feedback/1?token=…`) must show **the entire form and UI** in the user’s selected language. The reporter saw untranslated strings on production-style URLs.

Many **CLOSED** archives under `agents/tasks/done/` document repeated implementation and tester **PASS** on local Docker for this theme; **#67** remains **open** on GitHub. Remaining work is typically **product verification** (especially production), any **real i18n gaps** found there, and **GitHub alignment** (verification comment, labels, close when product accepts). See `front/public/i18n/`, `FeedbackPublicComponent`, and `docs/agent-loop.md`.

## High-level instructions for coder

- Re-read **#67** and verify `/feedback/{tenant}` with and without `?token=…` across supported locales (picker + `Accept-Language`); confirm no raw `FEEDBACK.*` keys in visible UI or document title.
- If dev/staging already match acceptance: optional production spot-check on **satisfecho.de**; if product agrees, post a short verification comment on **#67** and support closing the issue.
- If gaps remain, fix i18n JSON, template bindings, or title/update timing; extend automated coverage if a regression path is identified.
