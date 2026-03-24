# Feedback page needs translation

## GitHub

- **Issue:** https://github.com/satisfecho/pos/issues/67

## Problem / goal

Public guest feedback (`/feedback/{tenant}` with optional token) must be fully localized: every visible string (form, validation, errors, loading, invalid-tenant paths) in the user’s language — no raw `FEEDBACK.*` keys, and API-driven errors should respect locale where applicable (`Accept-Language` / ngx-translate). Reporter example: production-style URL with token.

Prior implementation and multiple **CLOSED** archives under `agents/tasks/done/` document coder/tester work; issue **#67** is still **open** — treat as **final verification** (dev/staging/prod), any **real gaps**, and **GitHub alignment** (comment, labels, close when product accepts). See `docs/agent-loop.md` and `front/public/i18n/`.

## High-level instructions for coder

- Re-verify `/feedback/1` (and tokenized URLs) across locales; confirm document title and DOM have no untranslated keys.
- If gaps appear, fix templates, i18n JSON parity, and backend error messaging for feedback-related endpoints as needed.
- Run documented smoke or Puppeteer scripts for feedback/landing if present; keep `npm run test:landing-version` (or equivalent) green.
- When behaviour matches the issue everywhere tested: hand off for tester and GitHub close per `docs/agent-loop.md` (human may need to comment if automation lacks Issues write).

## Coder notes (2026-03-24)

- Audited `front/public/i18n/*.json`: `FEEDBACK` keys match `en.json` across `de`, `es`, `fr`, `ca`, `zh-CN`, `hi` (no missing keys for the public form).
- **Tab title:** for `invalid_tenant` / `tenant_not_found`, document title now uses `FEEDBACK.INVALID_TENANT` / `FEEDBACK.TENANT_NOT_FOUND` instead of the generic `FEEDBACK.TITLE` (aligns title with error copy when the picker language changes).
- **Puppeteer:** `front/scripts/test-feedback-public-i18n.mjs` now also loads `/feedback/1?token=dummy-token-for-i18n-smoke` and asserts no raw `FEEDBACK.*` in the DOM.
- Public POST `/public/tenants/{id}/guest-feedback` already uses `_get_requested_language` + `get_message` for 404/400 paths; the app sends `Accept-Language` via `accept-language.interceptor.ts`.

---

## Testing instructions

### What to verify

- `/feedback/1` and `/feedback/1?token=…` show no raw i18n keys (`FEEDBACK.*`) in the visible page; language picker switches copy and **document title** for default, Deutsch, Français, Español.
- Error routes: `/feedback/0` (or non-numeric id) and a non-existent tenant id (if available) show translated error text and a tab title that matches the error (not the generic form title).

### How to test

- Stack up: `docker compose -f docker-compose.yml -f docker-compose.dev.yml` (HAProxy e.g. `http://127.0.0.1:4202`).
- From `front/`:  
  `BASE_URL=http://127.0.0.1:4202 npm run test:feedback-public-i18n`  
  `BASE_URL=http://127.0.0.1:4202 npm run test:landing-version`
- Manual spot-check: open `/feedback/1`, switch languages, check form + thank-you path after submit; optional invalid tenant URLs above.

### Pass / fail criteria

- **Pass:** Both npm scripts exit 0; manual checks show no literal `FEEDBACK.` strings in the UI; titles update with language.
- **Fail:** Any `FEEDBACK.` visible in DOM, wrong/missing translations for a supported locale, or regression in landing smoke test.

### GitHub (tester / closer)

- Issue **#67:** after verification, update labels/comments per `docs/agent-loop.md`; close when product accepts.
