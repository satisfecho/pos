# Feedback page needs translation

## GitHub

- **Issue:** https://github.com/satisfecho/pos/issues/67

## Problem / goal

Public guest feedback URL (e.g. `/feedback/{tenant}` with optional `?token=…`) must show **fully translated** UI: every form label, message, and document title in the user’s selected language (and `Accept-Language`), with **no raw i18n keys** (e.g. `FEEDBACK.*`) visible. Example from the issue: production-style URL on satisfecho.de with token query. Multiple **PASS** archives exist under `agents/tasks/done/` for dev verification; remaining scope often includes **production parity**, **GitHub closure** when product agrees, and any **real gaps** still found.

Relevant areas: `front/src/app/feedback-public/`, `front/public/i18n/`, `docs/agent-loop.md`.

## High-level instructions for coder

- Re-verify `/feedback/{tenant}` with and without `?token=…` across supported locales (picker + `Accept-Language`); confirm UI and **browser tab title** stay translated after load and language changes.
- If dev is clean: optional spot-check **satisfecho.de** for cache/deploy drift; fix any remaining untranslated strings or title handling.
- Run or extend automated coverage (e.g. public feedback i18n Puppeteer script from `docs/testing.md` / `AGENTS.md`) if gaps appear.
- When product accepts: post a short verification comment on **#67** and close the issue; align labels per `docs/agent-loop.md` (human may need to post if automation lacks **Issues** write on `gh`).
