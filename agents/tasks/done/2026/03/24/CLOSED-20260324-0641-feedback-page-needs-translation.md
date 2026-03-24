---
## Closing summary (TOP)

- **What happened:** GitHub **#67** (public guest feedback `/feedback/{tenant}` fully localized) was driven through coder verification and tester Puppeteer runs on **development** @ **d8abbe1**.
- **What was done:** Coder confirmed **37** `FEEDBACK` keys per locale with no gaps vs `en.json`, `FeedbackPublicComponent` uses the translate pipe and `TranslateService` for tab title; **no application code changes** were required in the final pass.
- **What was tested:** `test-feedback-public-i18n.mjs` and `npm run test:landing-version --prefix front` both **PASS** (2026-03-24 ~06:44–06:45 UTC per test report).
- **Why closed:** Tester reported **PASS** overall; acceptance criteria for i18n and regression met; ready for archive. Optional production spot-check / human **#67** close with product remains outside this file.
- **Closed at (UTC):** 2026-03-24 07:20
---

# Feedback page needs translation

## GitHub

- **Issue:** https://github.com/satisfecho/pos/issues/67

## Problem / goal

Public guest feedback at `/feedback/{tenant}` (e.g. with `?token=…`) must be fully localized: every part of the form and UI in the selected language, no raw `FEEDBACK.*` keys, consistent document title across locale picker and `Accept-Language`. Prior **FEAT-**/**CLOSED-** archives under `agents/tasks/done/` document repeated dev verification; issue may still be open pending product/production confirmation.

## High-level instructions for coder

- Re-read **#67** and verify `/feedback/{tenant}` with and without `?token=…` across supported locales (`front/public/i18n/`, `FeedbackPublicComponent`).
- Confirm no untranslated strings or title leaks; fix any gaps in templates, `TranslateService`, or JSON keys.
- Run the dedicated feedback i18n / landing smoke scripts from `docs/testing.md` or `AGENTS.md` on the dev stack.
- If dev matches acceptance: optional production spot-check on **satisfecho.de**; coordinate verification comment and close **#67** with product per `docs/agent-loop.md`.

## Implementation notes (coder, 2026-03-24 UTC)

- Renamed **FEAT-20260324-0640** → **WIP-20260324-0641** on pickup.
- Compared `FEEDBACK` keys in `front/public/i18n/{en,de,es,fr,ca,zh-CN,hi}.json`: **37** keys each, no gaps vs `en.json`.
- `FeedbackPublicComponent` already uses the translate pipe for all user-visible copy; tab title uses `TranslateService.get` with subscriptions on `onLangChange` / `onTranslationChange` so the document title stays aligned with the picker and does not show raw keys before JSON loads (**#67**).
- **No application code changes** were required in this pass; behaviour matches acceptance on the dev stack.

---

## Testing instructions

1. **Stack:** Dev compose with HAProxy (e.g. port **4202**): `docker compose -f docker-compose.yml -f docker-compose.dev.yml ps` shows services up.
2. **Feedback i18n (required):** From repo root:
   `BASE_URL=http://127.0.0.1:4202 node front/scripts/test-feedback-public-i18n.mjs`  
   Expect success logs for: browser default `es` stub, locale switches (en/de/fr/es/ca/zh-CN/hi), `?token=` path, post-submit thank-you (de), invalid `/feedback/0` (en + de); **no** `FEEDBACK.` substring in asserted UI.
3. **Regression:** `BASE_URL=http://127.0.0.1:4202 npm run test:landing-version --prefix front` exits **0**.
4. **Optional manual:** Open `/feedback/1` and `/feedback/1?token=…`; switch language in the header picker; confirm form, errors, thank-you, and **browser tab title** are localized (no raw keys).

**Product / GitHub:** If tester passes, optional comment on **#67** and close with product after any production spot-check.

---

## Test report

1. **Date/time (UTC) and log window:** Run window **2026-03-24 ~06:44–06:45 UTC** (HAProxy lines below through **06:45:34**).
2. **Environment:** `docker-compose.yml` + `docker-compose.dev.yml`; **`BASE_URL=http://127.0.0.1:4202`**; branch **`development`** @ **`d8abbe1`**; Puppeteer **headless** (`HEADLESS=1` for feedback script; landing script default headless).
3. **What was tested:** Per **Testing instructions**: feedback public i18n script (locales, token path, thank-you, invalid tenant); landing/version regression with demo login and sidebar nav.
4. **Results:**
   - Feedback i18n script (`test-feedback-public-i18n.mjs`): **PASS** — exit **0**; all five `>>> RESULT:` lines OK; no `FEEDBACK.*` leaks reported.
   - Landing regression (`npm run test:landing-version --prefix front`): **PASS** — exit **0**; `>>> RESULT: Landing version OK; demo login (tenant=1) OK; sidebar nav OK.` (browser console showed WebSocket auth noise during nav; script completed successfully).
5. **Overall:** **PASS**
6. **Product owner feedback:** Automated checks confirm public feedback stays fully translated across the supported locales and token/edge paths, with no raw `FEEDBACK.*` keys in the asserted UI. A quick human pass on tab titles and production (**satisfecho.de**) remains optional before closing **#67** with product.
7. **URLs tested (Puppeteer, relative to `BASE_URL`):** (1) `/feedback/1` (default locale stub + locale switches), (2) `/feedback/1?token=…` (script-used token path), (3) post-submit thank-you route under feedback flow, (4) `/feedback/0` error UI (en + de), (5) `/` → login → `/dashboard` and 15 sidebar routes + 5 inventory sublinks (landing script).
8. **GitHub automation:** Attempted `gh issue comment 67` for **agent:testing** handoff; **failed** with `Resource not accessible by personal access token (addComment)` — labels/comments not updated from this environment; human or token with Issues write can apply **`docs/agent-loop.md`** labels if desired.
9. **Relevant log excerpts:** HAProxy (dev frontend/API traffic during run):

```
192.168.65.1:40685 [24/Mar/2026:06:45:34.238] http_frontend frontend_backend/front1 0/0/0/1/1 304 154 - - ---- "GET /chunk-QRXJ4ZIO.js HTTP/1.1"
192.168.65.1:40685 [24/Mar/2026:06:45:34.243] http_frontend frontend_backend/front1 0/0/0/2/2 200 47589 - - ---- "GET /chunk-JSVP2ZQ7.js HTTP/1.1"
192.168.65.1:40685 [24/Mar/2026:06:45:34.254] http_frontend api_backend/api1 0/0/0/14/14 200 621 - - ---- "GET /api/inventory/valuation HTTP/1.1"
```
