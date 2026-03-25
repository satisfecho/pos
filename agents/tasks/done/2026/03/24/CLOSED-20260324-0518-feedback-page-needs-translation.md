---
## Closing summary (TOP)

- **What happened:** Public guest feedback i18n for GitHub **#67** was fully verified on the dev stack: locale parity, UI/title behavior, and automated smoke coverage all matched the task goal.
- **What was done:** Coder confirmed `FEEDBACK` keys across `en` and all target locales, `feedback-public` uses `translate` / `Title` updates correctly, and no further code changes were required this round.
- **What was tested:** `test-feedback-public-i18n.mjs` and `npm run test:landing-version` both **PASS** on `BASE_URL=http://127.0.0.1:4202` per the test report.
- **Why closed:** Tester **overall PASS**; all stated automated criteria met; optional manual/prod checks left to product alignment on closing **#67**.
- **Closed at (UTC):** 2026-03-24 06:45
---

# Feedback page needs translation

## GitHub

- **Issue:** https://github.com/satisfecho/pos/issues/67

## Problem / goal

Public guest feedback at `/feedback/{tenant}` (optional `?token=…`) must be fully localized: no raw `FEEDBACK.*` keys, consistent copy and document title across locale picker and `Accept-Language`. Multiple **CLOSED** archives under `agents/tasks/done/2026/03/24/` record repeated tester **PASS** on dev; **#67** is still **open** on GitHub — treat remaining work as **product/GitHub alignment** (optional production spot-check if product wants it on record), and any **real** i18n gaps if found. See `front/public/i18n/` and `docs/agent-loop.md`.

## High-level instructions for coder

- Re-read **#67** and spot-check `/feedback/{tenant}` with and without token across several locales (picker + `Accept-Language`).
- If anything still fails in prod/staging, fix i18n or loading order; otherwise document verification for closer.
- Coordinate **close #67** when product accepts: verification comment on the issue and labels per `docs/agent-loop.md` (automation here may lack **Issues** write on `gh` — human can mirror the task outcome on GitHub).

---

## Coder verification (2026-03-24 UTC)

- **Locales:** Compared `FEEDBACK` key set in `en.json` with `de`, `es`, `fr`, `ca`, `zh-CN`, `hi` — all keys present (parity with English).
- **UI / title:** `feedback-public.component` uses `translate` pipe / `TranslateService` for all guest-visible strings; `Title` updates via `translate.get()` on lang change and loading/error/thank-you states (issue #67 pattern).
- **Automated:** `BASE_URL=http://127.0.0.1:4202 node front/scripts/test-feedback-public-i18n.mjs` — **PASS** (es `Accept-Language` stub on first load, picker de/fr/es/ca/zh-CN/hi, `?token=`, `/feedback/0` error states, document titles). Regression: `npm run test:landing-version --prefix front` — **PASS**.
- **Code change this round:** None required; implementation already matches goal.

---

## Testing instructions

1. Stack up (e.g. HAProxy on 4202). Run:
   `BASE_URL=http://127.0.0.1:4202 node front/scripts/test-feedback-public-i18n.mjs`
   Expect exit **0** and four `>>> RESULT:` lines (no `FEEDBACK.` substring in body text).
2. Optional manual: open `/feedback/1`, switch language in picker, confirm tab title updates and no raw keys flash (hard refresh).
3. Optional prod: repeat spot-check on production URL if product wants GitHub #67 closed with a prod note.
4. Regression: `BASE_URL=http://127.0.0.1:4202 npm run test:landing-version --prefix front` — exit **0**.

**Closer / product:** If tester **PASS**, add verification comment on **#67** and close when agreed; archive this task per `agents/tasks/README.md`.

---

## Test report

1. **Date/time (UTC) and log window:** 2026-03-24T05:20Z–05:23Z (automated runs; `pos-front` tail reference ~04:46Z rebuild still shows clean bundle generation during dev session).
2. **Environment:** `docker-compose.yml` + `docker-compose.dev.yml`; `BASE_URL=http://127.0.0.1:4202`; branch **development**, commit **bb4baaa**.
3. **What was tested:** Per **Testing instructions** §1 (public feedback i18n script), §4 (landing-version regression). Optional §2 manual and §3 prod **not** run (**N/A**).
4. **Results:**
   - **§1 `test-feedback-public-i18n.mjs` exit 0 + four `>>> RESULT:` lines, no `FEEDBACK.` in body assertions:** **PASS** — process exit 0; console showed all four expected result lines including browser-default **es** stub, picker locales, token path, `/feedback/0` error UI.
   - **§4 `npm run test:landing-version --prefix front` exit 0:** **PASS** — `>>> RESULT: Landing version OK; demo login (tenant=1) OK; sidebar nav OK.`; `exit_code: 0` in run log (~42.8s).
5. **Overall:** **PASS** (no failed criteria).
6. **Product owner feedback:** Guest feedback routes remain fully covered by the automated i18n script across picker locales and the Spanish first-load stub, with invalid-tenant and token URLs included. Landing and staff nav regression still passes on the same stack, so there is no sign of collateral breakage from this area. Remaining alignment is whether product wants an explicit production URL check before closing **#67**.
7. **URLs tested (automated):**
   1. `http://127.0.0.1:4202/feedback/1` (incl. es navigator stub first load; picker de/fr/es/ca/zh-CN/hi)
   2. `http://127.0.0.1:4202/feedback/1?token=dummy-token-for-i18n-smoke`
   3. `http://127.0.0.1:4202/feedback/0` (invalid tenant / i18n error UI)
   4. Landing + staff nav via `test-landing-version.mjs`: `/`, `/dashboard`, `/my-shift`, `/staff/orders`, `/reservations`, `/guest-feedback`, `/tables`, `/kitchen`, `/bar`, `/customers`, `/products`, `/catalog`, `/reports`, `/working-plan`, `/users`, `/settings`, and inventory subroutes under `/inventory/*`.
8. **Relevant log excerpts:**
   - **test-feedback-public-i18n.mjs (stdout):** four `>>> RESULT:` lines ending with `Invalid tenant /feedback/0 error UI i18n OK`.
   - **test-landing-version.mjs (stdout):** `>>> RESULT: Landing version OK; demo login (tenant=1) OK; sidebar nav OK.` + metadata `exit_code: 0`.
   - **docker `pos-front` (tail):** `Application bundle generation complete. [0.254 seconds] - 2026-03-24T04:46:37.705Z` (no TS/NG errors in tail).

**GitHub:** `gh issue comment 67` failed with `Resource not accessible by personal access token (addComment)` — human should mirror this **PASS** on **#67** if needed.
