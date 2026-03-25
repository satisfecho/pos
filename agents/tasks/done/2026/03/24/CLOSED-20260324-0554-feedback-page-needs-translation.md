---
## Closing summary (TOP)

- **What happened:** Work tracked GitHub [#67](https://github.com/satisfecho/pos/issues/67): public `/feedback/{tenant}` must be fully translated (including `?token=`, thank-you, and invalid tenant).
- **What was done:** Feature review found no further application changes needed—`FeedbackPublicComponent`, language picker / `Accept-Language`, and `FEEDBACK` keys in `front/public/i18n/*.json` already satisfy acceptance; automated smoke `test-feedback-public-i18n.mjs` documents the check.
- **What was tested:** `BASE_URL=http://127.0.0.1:4202` `npm run test:feedback-public-i18n --prefix front` — **PASS** (all locales, token path, post-submit DE thank-you, `/feedback/0` EN+DE; no raw `FEEDBACK.*` in body or title).
- **Why closed:** Tester **Overall: PASS**; criteria met on local Docker stack; production spot-check left to human if needed.
- **Closed at (UTC):** 2026-03-24 05:58
---

# Feedback page needs translation

## GitHub

- **Issue:** https://github.com/satisfecho/pos/issues/67

## Problem / goal

Public guest feedback URLs (e.g. `/feedback/{tenant}` with optional `?token=…`) must show **every part of the form** in the user’s selected language. The reporter still sees untranslated strings on production-style URLs. Prior implementation and tester archives live under `agents/tasks/done/` (multiple **CLOSED** entries for this theme); align remaining work with `front/public/i18n/`, `FeedbackPublicComponent`, and `docs/agent-loop.md`.

## High-level instructions for coder

- Re-read **#67** and verify `/feedback/{tenant}` with and without `?token=…` across supported locales (picker + `Accept-Language`); confirm no raw `FEEDBACK.*` keys in UI or document title.
- If dev/staging already match acceptance, optional production spot-check on **satisfecho.de**; if product agrees, support closing **#67** with a short verification comment (human may post if automation lacks Issues write).
- Run or extend automated coverage for public feedback i18n if present under `front/scripts/`; keep landing/staff smoke passing per `AGENTS.md`.
- Do not open a **NEW-** task for this issue—GitHub-driven work stays in **FEAT-** queue.

## Implementation note (feature coder, 2026-03-24)

- Reviewed `FeedbackPublicComponent` (template + `Title` / `translate.get` for tab title), `LanguageService` / language picker, and **FEEDBACK** keys in `front/public/i18n/*.json` (all locales aligned with `en.json`).
- No application code changes were required: acceptance criteria for **#67** (no raw `FEEDBACK.*` in visible UI or document title; locales en/de/fr/es/ca/zh-CN/hi; `?token=` path; thank-you after submit; invalid `/feedback/0`) are already covered.
- Automated check: `BASE_URL=http://127.0.0.1:4202 node front/scripts/test-feedback-public-i18n.mjs` — **exit 0** on local Docker (HAProxy 4202). Documented in `docs/testing.md` as `npm run test:feedback-public-i18n --prefix front`.
- **Production (#67):** If satisfecho.de still showed old behaviour, likely stale assets or pre-fix deploy; human can confirm live and comment on the issue to close.

---

## Testing instructions (for tester)

1. **What to verify**  
   - `/feedback/{tenant}` (e.g. tenant `1`) and same URL with `?token=…` render fully translated copy for each language in the picker; no literal `FEEDBACK.` keys in page text or browser tab title.  
   - After submitting a valid rating, thank-you state and title stay localized.  
   - `/feedback/0` shows translated error copy and title for at least **en** and **de**.

2. **How to test**  
   - Stack up (e.g. `./run.sh` or Docker dev compose on HAProxy port **4202**).  
   - From repo root:  
     `BASE_URL=http://127.0.0.1:4202 npm run test:feedback-public-i18n --prefix front`  
     or:  
     `BASE_URL=http://127.0.0.1:4202 node front/scripts/test-feedback-public-i18n.mjs`

3. **Pass / fail**  
   - **Pass:** Script completes with all `>>> RESULT:` lines and **exit code 0**.  
   - **Fail:** Any assertion error, timeout, or raw `FEEDBACK.` substring in body or title checks.

---

## Test report

1. **Date/time (UTC) and log window**  
   - **Started:** 2026-03-24 05:56:45 UTC  
   - **Finished:** 2026-03-24 05:57:05 UTC (approx.; script ~12s)  
   - **Log window reviewed:** `docker compose … logs --since 2m` for **haproxy** (UTC-stamped lines ~05:56:52–05:56:57).

2. **Environment**  
   - **Compose:** `docker-compose.yml` + `docker-compose.dev.yml`  
   - **BASE_URL:** `http://127.0.0.1:4202` (HAProxy → front)  
   - **Branch / commit:** `development` @ `ab466c4`  
   - **Command:** `BASE_URL=http://127.0.0.1:4202 HEADLESS=1 npm run test:feedback-public-i18n --prefix front`

3. **What was tested**  
   - Per **Testing instructions**: public `/feedback/{tenant}` with and without `?token=…`, all picker locales, post-submit thank-you (DE), invalid `/feedback/0` (EN + DE); no raw `FEEDBACK.*` in body or document title.

4. **Results**  
   - **Criterion:** `/feedback/1` + picker locales (en/de/fr/es/ca/zh-CN/hi), titles and body — **PASS** — evidence: `>>> RESULT: Public feedback i18n OK (en + de + fr + es + ca + zh-CN + hi, no FEEDBACK.* leaks)`  
   - **Criterion:** Browser default locale (ES) on first load without stored `pos_language` — **PASS** — evidence: `>>> RESULT: Browser default locale (es, navigator stub) on first load OK (no FEEDBACK.* leaks)`  
   - **Criterion:** Same with `?token=dummy-token-for-i18n-smoke` — **PASS** — evidence: `>>> RESULT: Token URL path OK (no FEEDBACK.* leaks)`  
   - **Criterion:** After valid submit, thank-you UI and tab title localized (DE) — **PASS** — evidence: `>>> RESULT: Post-submit thank-you page i18n OK (de, no FEEDBACK.* leaks)`; HAProxy `POST /api/public/tenants/1/guest-feedback` **200**  
   - **Criterion:** `/feedback/0` translated EN + DE (body + title) — **PASS** — evidence: `>>> RESULT: Invalid tenant /feedback/0 error UI i18n OK`

5. **Overall:** **PASS**

6. **Product owner feedback**  
   - Local Docker verification matches **#67** acceptance: guest feedback is fully translated across supported languages, including deep link with token, success state, and invalid-tenant error. Production was not re-checked in this run; if **satisfecho.de** ever diverges, confirm deploy/cache there separately.

7. **URLs tested**  
   1. `http://127.0.0.1:4202/feedback/1`  
   2. `http://127.0.0.1:4202/feedback/1?token=dummy-token-for-i18n-smoke`  
   3. `http://127.0.0.1:4202/feedback/0` (after flow; EN then DE via picker)

8. **Relevant log excerpts**  
   - **haproxy (excerpt):** `GET /api/public/tenants/1 HTTP/1.1` … **200**; `POST /api/public/tenants/1/guest-feedback HTTP/1.1` … **200**; `GET /feedback/0 HTTP/1.1` … **200**; i18n JSON fetches `GET /i18n/de.json`, `en.json`, etc. — **304/200**, no 5xx in window.  
   - **front:** no new errors in `--since 2m` tail (empty for that slice).
