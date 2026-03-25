---
## Closing summary (TOP)

- **What happened:** Tester handed off **CLOSED-20260324-1558-feedback-page-needs-translation** after verifying public guest feedback i18n against local Docker (HAProxy 4202).
- **What was done:** Coder alignment of **FEEDBACK** keys across locales and ngx-translate in `FeedbackPublicComponent` was accepted; tester ran `BASE_URL=http://127.0.0.1:4202 node front/scripts/test-feedback-public-i18n.mjs` with exit **0** and reviewed haproxy/front logs (no build errors).
- **What was tested:** Testing instructions items **1–2** — **PASS**; optional manual browse and production spot-check were **not** run (N/A per test report).
- **Why closed:** Overall **PASS** on required automated acceptance; task criteria for dev verification satisfied.
- **Closed at (UTC):** 2026-03-24 16:02
---

# Feedback page needs translation

## GitHub

- **Issue:** https://github.com/satisfecho/pos/issues/67

## Problem / goal

Public guest feedback (`/feedback/{tenant}`, e.g. with `?token=…` on production URLs) must show **fully translated** UI: every form label, message, error, and document title in the **selected** language—no mixed languages, missing strings, or raw `FEEDBACK.*` keys. Reporter cited `https://satisfecho.de/feedback/1?token=…` as an example.

Relevant areas: `front/src/app/feedback-public/`, locale JSON under `front/public/i18n/`, and `front/scripts/test-feedback-public-i18n.mjs` for regression coverage. Prior closed tasks under `agents/tasks/done/` document many verification passes on **development**; issue may still need production sign-off or gap fixes.

## High-level instructions for coder

- Reproduce on local Docker and optionally production: open `/feedback/{tenant}` with and without token; exercise the language picker and `Accept-Language`; confirm no untranslated segments or wrong-language copy.
- Ensure `FeedbackPublicComponent` template and programmatic strings (API errors, titles) use ngx-translate consistently; extend locale files for any missing keys across supported languages.
- Run or extend `npm run` / `node front/scripts/test-feedback-public-i18n.mjs` (with `BASE_URL` pointing at HAProxy dev port) so regressions are caught in CI or local smoke.
- If **development** already matches acceptance, document evidence for the issue; support a short GitHub verification comment and closing **#67** when product agrees (`docs/agent-loop.md`).

## Coder notes (2026-03-24)

- **Locales:** Compared `FEEDBACK` objects in `front/public/i18n/{en,de,fr,es,ca,zh-CN,hi}.json` — all **37** keys present in every file (no missing translations for public form strings).
- **Front:** `FeedbackPublicComponent` uses ngx-translate for template copy and `translate.stream()` for the document title (avoids raw keys before JSON load). Submit errors use `translate.instant` for known codes; invalid `reservation_token` comes from the API with `Accept-Language` (`back/app/messages.py`).
- **Automated check:** On local Docker (HAProxy `4202`), `BASE_URL=http://127.0.0.1:4202 node front/scripts/test-feedback-public-i18n.mjs` completed with **exit 0** (browser `es-ES` stub, picker de/fr/es/ca/zh-CN/hi, token URL, invalid-token submit DE message, thank-you DE, `/feedback/0`, `/feedback/999999999`).

## Testing instructions

1. Start the dev stack so the app is reachable (e.g. HAProxy on `4202`).
2. From repo root: `BASE_URL=http://127.0.0.1:4202 node front/scripts/test-feedback-public-i18n.mjs` — expect exit **0** and no `FEEDBACK.` substrings in the DOM assertions.
3. Optional manual: open `/feedback/1` with and without `?token=…`, switch languages, submit once — confirm no raw keys or mixed-language chrome.
4. For GitHub **#67** closure on production: repeat spot-check on `https://satisfecho.de/feedback/1` (or tenant under test) if product wants prod sign-off.

---

## Test report

1. **Date/time (UTC):** 2026-03-24 16:00:41 UTC (run start). Log window reviewed: ~16:00:41–16:01:00 UTC (`pos-haproxy` / `pos-front` tails).

2. **Environment:** `docker-compose.yml` + `docker-compose.dev.yml`; HAProxy host port **4202**; **`BASE_URL=http://127.0.0.1:4202`**; branch **`development`**, commit **`c5795f9`**.

3. **What was tested:** Items 1–2 of **Testing instructions** (stack up; `test-feedback-public-i18n.mjs`). Item 3 (manual) not run (optional). Item 4 (production spot-check) not run (product sign-off path only).

4. **Results:**
   - Dev stack reachable on 4202: **PASS** — `docker compose … ps` shows `pos-haproxy` `0.0.0.0:4202->4202/tcp`, services up.
   - `BASE_URL=http://127.0.0.1:4202 node front/scripts/test-feedback-public-i18n.mjs` exit **0**, seven `>>> RESULT:` lines, no `FEEDBACK.` leaks: **PASS** — command exit code 0; script output as expected.
   - Optional manual browse (item 3): **N/A** — not required for automated pass.
   - Production URL check (item 4): **N/A** — not executed; remains for product if closing **#67** against prod.

5. **Overall:** **PASS** (local Docker / dev acceptance per instructions 1–2).

6. **Product owner feedback:** Public feedback i18n is covered by an automated Puppeteer script across default browser locale (es stub), all picker languages, token URL, invalid-token API error, thank-you flow, and invalid/missing tenant errors—all without raw `FEEDBACK.*` in the DOM. Production smoke on satisfecho.de is still optional before formally closing the GitHub issue if you want prod parity confirmation.

7. **URLs tested** (via Puppeteer against `http://127.0.0.1:4202`):
   1. `http://127.0.0.1:4202/feedback/1` (multiple navigations, language switches en/de/fr/es/ca/zh-CN/hi)
   2. `http://127.0.0.1:4202/feedback/1?token=dummy-token-for-i18n-smoke`
   3. `http://127.0.0.1:4202/feedback/1?token=bogus-reservation-token-i18n-check` (submit → localized API error)
   4. `http://127.0.0.1:4202/feedback/1` (valid submit → thank-you DE)
   5. `http://127.0.0.1:4202/feedback/0` (invalid tenant)
   6. `http://127.0.0.1:4202/feedback/999999999` (missing tenant / 404)

8. **Relevant log excerpts:**
   - `pos-haproxy` (sample during run): `GET /i18n/de.json`, `GET /chunk-HMUOE5MY.js` (feedback-public lazy chunk), `GET /api/public/tenants/999999999` → **404** (missing-tenant path).
   - `pos-front` tail: `Application bundle generation complete` (no build errors in window).
