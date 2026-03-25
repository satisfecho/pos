---
## Closing summary (TOP)

- **What happened:** Tester verified the feedback-page i18n work tracked for GitHub **#67** (localized public tenant 404, Puppeteer/locale checks, regression smoke) on local dev compose.
- **What was done:** Coder localized `GET /public/tenants/{tenant_id}` 404 `detail`, added `test_get_public_tenant_404_localized_de`, extended `test-feedback-public-i18n.mjs`, and confirmed FEEDBACK key parity across locale JSON files.
- **What was tested:** Backend `test_guest_feedback.py` (6 passed), public feedback i18n script (en/de/fr/es, no `FEEDBACK.*` leaks), `test:landing-version`, and front build log tail — all **PASS**.
- **Why closed:** All executed verification criteria in the test report passed; task handed off for archive per agent loop (GitHub comment on **#67** blocked by PAT; issue may remain open until human/product closes).
- **Closed at (UTC):** 2026-03-24 04:02
---

# Feedback page needs translation

## GitHub

- **Issue:** https://github.com/satisfecho/pos/issues/67

## Problem / goal

Public feedback flows (`/feedback/{tenant}`, tokenized links) must be fully localized: no raw `FEEDBACK.*` keys, validation and error copy respecting `Accept-Language` / locale picker. Implementation and repeated tester **PASS** are archived under `agents/tasks/done/` (e.g. `CLOSED-20260324-0345-feedback-page-needs-translation.md`). Issue **#67** remains **open** — treat as **final verification** (dev/staging/prod as needed), any **real i18n gaps**, and **GitHub alignment** (comment, labels, close when product accepts). See `docs/agent-loop.md` and `front/public/i18n/`.

## High-level instructions for coder

- Re-run smoke / Puppeteer paths for public feedback and landing if documented; confirm locales load on first paint and document titles are localized.
- If QA finds untranslated strings or API error text in the wrong language, trace `Accept-Language` / i18n keys in front and FastAPI validation messages; fix and add regression coverage where practical.
- When behaviour matches the issue everywhere tested: coordinate **close #67** on GitHub per `docs/agent-loop.md` (human with **Issues: write** if automation token cannot comment).

## Coder summary (2026-03-24 UTC)

- **`GET /public/tenants/{tenant_id}`:** Replaced hardcoded English **404** `detail` with `get_message("tenant_not_found", lang)` and `_get_requested_language`, matching `submit_public_guest_feedback` and other public endpoints (helps API clients and any UI that surfaces `detail`).
- **Tests:** `back/tests/test_guest_feedback.py` — `test_get_public_tenant_404_localized_de` asserts German copy when `Accept-Language: de`.
- **Smoke:** `front/scripts/test-feedback-public-i18n.mjs` — after **fr**, switches to **es**, asserts Spanish body copy (`Cómo fue`) and document title, still no `FEEDBACK.` substring in `document.body.innerText`.
- **FEEDBACK key parity:** Scripted diff across `front/public/i18n/*.json` — all locales match **en** (37 keys); no JSON edits this pass.

---

## Testing instructions

1. **Backend:** With DB up (e.g. dev compose):  
   `docker compose -f docker-compose.yml -f docker-compose.dev.yml exec -T back pytest /app/tests/test_guest_feedback.py -q`  
   Expect **6 passed** (includes `test_get_public_tenant_404_localized_de`).

2. **Public feedback i18n (Puppeteer):** With HAProxy reachable (e.g. **4202**):  
   `BASE_URL=http://127.0.0.1:4202 node front/scripts/test-feedback-public-i18n.mjs`  
   Expect log line ending with **en + de + fr + es, no FEEDBACK.\* leaks** and exit **0**.

3. **Regression:**  
   `BASE_URL=http://127.0.0.1:4202 npm run test:landing-version --prefix front` — exit **0**.

4. **Front build:** `docker compose -f docker-compose.yml -f docker-compose.dev.yml logs --tail=80 front` — no TS/NG errors after runs.

5. **Manual (optional):** `/feedback/1` — spot-check **ca**, **zh-CN**, **hi** in the language picker; confirm no raw keys.

6. **GitHub:** If tester **PASS** and product accepts, comment on **#67** and close per `docs/agent-loop.md` (PAT may lack `issues: write` for automated comments).

---

## Test report

1. **Date/time (UTC):** 2026-03-24T03:59Z–04:02Z (pytest + Puppeteer window). **Log window:** same (front container tail captured immediately after runs).

2. **Environment:** `docker-compose.yml` + `docker-compose.dev.yml`; **`BASE_URL`** `http://127.0.0.1:4202` (HAProxy → front). **Branch:** `development` @ `65b2c6c`.

3. **What was tested:** Items 1–4 from **Testing instructions** above (backend guest feedback tests, public feedback i18n script, landing regression, front build log scan). Item 5 (manual ca/zh-CN/hi) **not** run this pass.

4. **Results:**
   - **Backend `test_guest_feedback.py`:** **PASS** — evidence: `6 passed in 0.70s`, exit 0.
   - **Public feedback i18n (`test-feedback-public-i18n.mjs`):** **PASS** — evidence: `>>> RESULT: Public feedback i18n OK (en + de + fr + es, no FEEDBACK.* leaks)`, exit 0.
   - **Regression `test:landing-version`:** **PASS** — evidence: `>>> RESULT: Landing version OK; demo login (tenant=1) OK; sidebar nav OK.`, `exit_code: 0`.
   - **Front build logs (tail 80):** **PASS** — evidence: repeated `Application bundle generation complete.`; no `TS2345`, `NG8002`, or “failed” compile lines in tail.

5. **Overall:** **PASS** (all executed criteria met).

6. **Product owner feedback:** Automated verification on local dev compose confirms guest-feedback API tests, public feedback locale switching (en/de/fr/es) without raw `FEEDBACK.*` keys in the body, and the landing sidebar smoke still pass. Optional manual spot-check of ca, zh-CN, and hi in the picker was not performed; recommend a quick human pass on `/feedback/1` if those locales are customer-critical.

7. **URLs tested:**
   1. `http://127.0.0.1:4202/` (landing + logged-in nav per `test-landing-version.mjs`)
   2. `http://127.0.0.1:4202/feedback/1` (public feedback i18n script — multiple locale query/param states)

8. **Relevant log excerpts:**
   - `pos-back` (pytest): `...... [100%]` / `6 passed in 0.70s`
   - Puppeteer i18n: `>>> RESULT: Public feedback i18n OK (en + de + fr + es, no FEEDBACK.* leaks)`
   - `pos-front` (tail): `Application bundle generation complete. [0.170 seconds] - 2026-03-24T03:35:57.187Z` (no error lines in sampled tail)

**GitHub:** `gh issue comment 67` **failed** (`Resource not accessible by personal access token` — no **Issues: write** on this token). Human or CI with issue permissions should mirror this **Test report** on **#67**. Issue left **open** per task text (final close when product accepts). No `agent:*` labels were present on the issue.
