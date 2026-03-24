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

## Coder implementation notes (2026-03-24, follow-up)

- **Re-verified:** All `FEEDBACK.*` keys still match across `front/public/i18n/*.json` (parity with `en.json`).
- **Gap closed:** Backend `400` errors from guest-feedback already use `get_message` + `Accept-Language`, but **422** (Pydantic) and **429** (slowapi rate limit) still surface **English** `detail` strings to the UI. `feedback-public.component.ts` now maps **429** → `FEEDBACK.RATE_LIMIT` and **422** (or array `detail`) → `FEEDBACK.VALIDATION_ERROR`, both translated in all seven locale files. Other string `detail` responses (localized API messages) unchanged.

## Testing instructions

1. **Backend:** `docker compose -f docker-compose.yml -f docker-compose.dev.yml exec -T back pytest tests/test_guest_feedback.py -q` — expect **5 passed**.
2. **Frontend build:** `docker compose -f docker-compose.yml -f docker-compose.dev.yml logs --tail=80 front` — no TS/Angular errors after rebuild.
3. **Smoke:** From `front/`, `BASE_URL=http://127.0.0.1:4202 npm run test:landing-version` — expect exit **0**.
4. **Manual (optional):** `/feedback/1` — pick **Deutsch**, submit invalid optional email `x` — expect German API message (existing behaviour). To exercise new keys, force a **422** or **429** (e.g. temporarily invalid body or rate limit) and confirm the message is in the selected UI language, not English slowapi/Pydantic text.
5. **GitHub #67:** Tester / PO: comment or close per product acceptance (token may lack `issues: write`).
