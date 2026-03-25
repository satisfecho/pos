---
## Closing summary (TOP)

- **What happened:** Feature work for GitHub **#67** (guest feedback i18n) reached verified **closed** after coder review and tester runs on **`development`** (commit **665a460**).
- **What was done:** Coder confirmed **FeedbackPublicComponent** uses **TranslateModule** / pipes for guest-visible strings and localized document titles; **`FEEDBACK`** is defined in all listed locale JSON files under **`front/public/i18n/`**. No further product code changes were required in this pass.
- **What was tested:** **`npm run test:feedback-public-i18n`** and **`npm run test:landing-version`** against **`BASE_URL=http://127.0.0.1:4202`** — both **PASS** (no raw **`FEEDBACK.*`** leaks in exercised UI).
- **Why closed:** Documented acceptance criteria met; task archive per agent loop. Issue **#67** may stay open until optional production spot-check and product sign-off (as stated in the task).
- **Closed at (UTC):** 2026-03-24 07:08
---

# Feedback page needs translation

## GitHub

- **Issue:** https://github.com/satisfecho/pos/issues/67

## Problem / goal

Public guest feedback (e.g. `https://satisfecho.de/feedback/1?token=…`) must not show untranslated UI: the full form and related states should follow the selected language. Multiple **CLOSED** archives under `agents/tasks/done/` document dev/test **PASS**; **#67** stays open until product signs off (optional production check on **satisfecho.de**). See `front/public/i18n/`, `FeedbackPublicComponent`, and `docs/agent-loop.md`.

## High-level instructions for coder

- Re-read **#67** and verify `/feedback/{tenant}` with and without `?token=…` across supported locales (picker + `Accept-Language`); confirm no raw `FEEDBACK.*` keys in visible UI or document title.
- If dev already matches acceptance, capture evidence for GitHub; optional prod spot-check; support closing **#67** when product agrees.
- If any gap remains, extend `front/public/i18n/` and `feedback-public` templates until all guest-visible copy is translated.
- Keep or extend automated checks (e.g. `npm run test:feedback-public-i18n` from `front/`) so regressions are caught.

## Coder verification (2026-03-24 UTC, feature-coder)

- **WIP:** `FEAT-20260324-0702-…` → `WIP-20260324-0703-…` on start.
- **Code review:** `FeedbackPublicComponent` uses `TranslateModule` / pipes for all guest-visible strings; document title uses `translate.get(...)` with subscriptions on lang/translation change so tab titles stay localized (issue **#67**). `front/public/i18n/{en,de,fr,es,ca,zh-CN,hi}.json` each define a full `FEEDBACK` object.
- **No product code changes** required in this pass; behaviour matches acceptance in dev.

### Evidence for GitHub (#67)

Automated run (Docker dev stack, HAProxy **4202**):

- `BASE_URL=http://127.0.0.1:4202 npm run test:feedback-public-i18n --prefix front` — **PASS** (es auto-detect via navigator stub, en/de/fr/es/ca/zh-CN/hi picker, `?token=` path, post-submit thank-you DE, invalid `/feedback/0` en+de, no `FEEDBACK.*` in body text or document title).
- `BASE_URL=http://127.0.0.1:4202 npm run test:landing-version --prefix front` — **PASS** (regression smoke).

**Product:** Optional manual spot-check on **https://satisfecho.de/feedback/1** (and with a real reservation token if available); close **#67** when product agrees.

---

## Testing instructions

1. **Primary:** With app reachable (e.g. Docker dev on **4202**), from repo root:
   `BASE_URL=http://127.0.0.1:4202 npm run test:feedback-public-i18n --prefix front`  
   Expect exit **0** and log lines ending with “no FEEDBACK.* leaks” / “Invalid tenant … OK”.
2. **Regression:** `BASE_URL=http://127.0.0.1:4202 npm run test:landing-version --prefix front` — exit **0**.
3. **Manual (optional):** Open `/feedback/1`, cycle language picker; repeat with `?token=…`; open `/feedback/0` and confirm error strings are translated, not raw keys.
4. **Production (optional):** Same checks on **satisfecho.de** if verifying before closing **#67**.

---

## Test report (tester)

1. **Date/time (UTC):** 2026-03-24 ~07:05–07:08 (verification run). Log window: same window for `pos-front` / `pos-haproxy` tails below.
2. **Environment:** `docker-compose.yml` + `docker-compose.dev.yml`; **`BASE_URL`** `http://127.0.0.1:4202`; branch **`development`**, commit **`665a460`**.
3. **What was tested:** Per **Testing instructions** §1–2 (primary feedback-public i18n script + landing regression). Optional manual / production checks not run (explicitly optional in task).
4. **Results:**
   - **Primary** (`npm run test:feedback-public-i18n`): **PASS** — exit 0; script logged all `>>> RESULT: … OK` lines including “no FEEDBACK.* leaks” and “Invalid tenant /feedback/0 error UI i18n OK”.
   - **Regression** (`npm run test:landing-version`): **PASS** — exit 0; “Landing version OK; demo login (tenant=1) OK; sidebar nav OK.”
5. **Overall:** **PASS** (no failed criteria).
6. **Product owner feedback:** Automated checks confirm guest feedback UI stays translated across the covered locales and paths, with no raw `FEEDBACK.*` keys in the exercised DOM or titles. Issue **#67** can remain open until someone does an optional production spot-check on **satisfecho.de** and product explicitly signs off, as stated in the task body.
7. **URLs tested (Puppeteer, via BASE_URL):**
   1. `http://127.0.0.1:4202/feedback/1` (default locale stub + language picker cycles)
   2. `http://127.0.0.1:4202/feedback/1?token=…` (script-built token query)
   3. `http://127.0.0.1:4202/feedback/0` (invalid tenant, en + de)
   4. `http://127.0.0.1:4202/` and staff routes from `test:landing-version` (/, /dashboard, /my-shift, /staff/orders, … — see script output)
8. **Relevant log excerpts:**
   - **`pos-front` (tail):** `Application bundle generation complete` for lazy chunk `feedback-public-component` — no TS/NG build errors in window.
   - **`pos-haproxy` (tail):** `GET /i18n/en.json` **200**; API `GET /api/public/tenants` **200** during the run window.

**GitHub:** Attempted `gh issue comment` / label update on **#67**; API returned “Resource not accessible by personal access token” for comment — human should adjust PAT scopes or comment manually. Label **`agent:wip`** was not present on the issue (`remove-label` reported not found).
