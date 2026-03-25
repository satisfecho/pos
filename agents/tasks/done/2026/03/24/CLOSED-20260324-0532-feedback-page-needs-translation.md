---
## Closing summary (TOP)

- **What happened:** GitHub **#67** (public feedback i18n) was implemented and handed to testing; mandatory automated checks were run on the local Docker stack (`BASE_URL=http://127.0.0.1:4202`, branch **development**, commit **`4d1a4d7`**).
- **What was done:** Coder verified **FEEDBACK** key parity across locales and extended `front/scripts/test-feedback-public-i18n.mjs` with a POST submit → thank-you path; tester executed the task’s mandatory items (public feedback i18n script + landing regression).
- **What was tested:** `node front/scripts/test-feedback-public-i18n.mjs` **PASS** (exit 0; no `FEEDBACK.` leaks in asserted checks); `npm run test:landing-version --prefix front` **PASS**; optional manual `/feedback/1` and production spot-check **not** run.
- **Why closed:** Tester **overall PASS** (no failed criteria); acceptance bar met on local Docker per test report and product-owner note (prod confirmation remains optional before closing **#67** on GitHub).
- **Closed at (UTC):** 2026-03-24 05:37
---

# Feedback page needs translation

## GitHub

- **Issue:** https://github.com/satisfecho/pos/issues/67

## Problem / goal

Public guest feedback URLs (e.g. `https://satisfecho.de/feedback/1?token=…`) must show **every part of the form** in the user’s selected language; several strings were still untranslated. Prior implementation and tester archives live under `agents/tasks/done/` (multiple **CLOSED** entries for this theme); confirm behaviour on dev and production, close any real i18n gaps, and align GitHub (verification comment, labels, close when product accepts). See `front/public/i18n/`, `docs/agent-loop.md`, and Puppeteer `test-feedback-public-i18n` if present.

## High-level instructions for coder

- Re-read **#67** and spot-check `/feedback/{tenant}` with and without `?token=…` across supported locales (picker + `Accept-Language`).
- Ensure no raw `FEEDBACK.*` keys leak in the DOM or document title; titles should follow translation load (avoid brief key flashes after first paint).
- Run the project’s public feedback i18n smoke / Puppeteer coverage and fix any failures.
- If dev matches acceptance: optional production spot-check on **satisfecho.de**; coordinate **close #67** with a short verification comment when product agrees.

---

## Coder verification (2026-03-24 UTC)

- **Locales:** `FEEDBACK` key parity `en` vs `de`, `es`, `fr`, `ca`, `zh-CN`, `hi` — all keys present (script check).
- **UI / title:** `feedback-public` already uses `translate` pipe / `TranslateService`; document title uses `translate.get()` with lang / translation change subscriptions (issue #67).
- **Tests:** Extended `front/scripts/test-feedback-public-i18n.mjs` with a **POST submit → thank-you** step (locale `de`, asserts “Vielen Dank” in body, no `FEEDBACK.` in body or tab title). Existing coverage unchanged (es first-load stub, picker loop, `?token=`, `/feedback/0`).

---

## Testing instructions

1. Stack up (e.g. HAProxy on **4202**). Run:
   `BASE_URL=http://127.0.0.1:4202 node front/scripts/test-feedback-public-i18n.mjs`  
   Expect exit **0** and **six** `>>> RESULT:` lines (including post-submit thank-you); no `FEEDBACK.` substring in asserted body/title checks.
2. Regression: `BASE_URL=http://127.0.0.1:4202 npm run test:landing-version --prefix front` — exit **0**.
3. Optional manual: `/feedback/1`, switch locale, hard refresh — no raw keys; tab title matches locale.
4. Optional prod: spot-check **satisfecho.de** if product wants **#67** closed with a prod note.

**Closer / product:** On tester **PASS**, mirror verification on GitHub **#67** when agreed; archive per `agents/tasks/README.md`.

---

## Test report (tester, 2026-03-24 UTC)

1. **Date/time (UTC) and log window:** Started ~`2026-03-24T05:34:56Z`; automated runs finished ~`2026-03-24T05:35:38Z`. Docker log tail reviewed for the same window (no new front build errors during the run; prior rebuild lines only).

2. **Environment:** `docker-compose.yml` + `docker-compose.dev.yml`; HAProxy `BASE_URL=http://127.0.0.1:4202`; branch **`development`**, commit **`4d1a4d7`**. Puppeteer headless (default). **GitHub:** attempted `gh issue comment 67` for agent start — **Resource not accessible by personal access token**; labels **`agent:testing`** not updated from this environment.

3. **What was tested:** Items 1–2 under **Testing instructions** (mandatory). Optional manual `/feedback/1` and optional prod spot-check **not** run.

4. **Results:**
   - **Item 1 — `test-feedback-public-i18n.mjs`:** **PASS** — exit `0`; output included five `>>> RESULT:` lines (es auto-detect, locale loop, token path, post-submit thank-you de, `/feedback/0`). *Note:* instructions say “six” lines; current script defines five checkpoints—all executed successfully.
   - **Item 1 — no `FEEDBACK.` leaks:** **PASS** — asserted by script messaging (“no FEEDBACK.* leaks” on each RESULT).
   - **Item 2 — `test:landing-version`:** **PASS** — exit `0`; `>>> RESULT: Landing version OK; demo login (tenant=1) OK; sidebar nav OK.`

5. **Overall:** **PASS** (failed criteria: none).

6. **Product owner feedback:** Public feedback i18n automation on local Docker (port 4202) matches the acceptance bar: locales, token URL, German thank-you after submit, and invalid tenant UI all pass without raw translation keys. Landing regression also passed, so the change does not appear to break core staff navigation. Production confirmation on satisfecho.de remains optional before closing **#67** if you want a prod-specific note.

7. **URLs tested (Puppeteer):**
   1. `http://127.0.0.1:4202/feedback/1` (first load with es navigator stub; main locale loop; post-submit flow; revisits)
   2. `http://127.0.0.1:4202/feedback/1?token=…` (script-generated token query)
   3. `http://127.0.0.1:4202/feedback/0`
   4. `http://127.0.0.1:4202/` and staff routes exercised by landing test (`/dashboard`, `/my-shift`, `/staff/orders`, `/reservations`, `/guest-feedback`, `/tables`, `/kitchen`, `/bar`, `/customers`, `/products`, `/catalog`, `/reports`, `/working-plan`, `/users`, `/settings`, inventory subpaths under `/inventory/…`).

8. **Relevant log excerpts:**
   - **pos-front (tail):** `Application bundle generation complete` for `feedback-public-component` lazy chunk; no errors in tail.
   - **pos-back (tail):** routine `200 OK` for proxied requests (e.g. `/public/tenants/1`, `/reservations/book-week-slots`); no 5xx in sampled tail during test window.
