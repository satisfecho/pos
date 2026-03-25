---
## Closing summary (TOP)

- **What happened:** GitHub issue **#67** (public guest feedback i18n) was driven through coder verification and independent tester PASS on the dev stack; automation could not update the issue due to token scope.
- **What was done:** No further product code was required on `development`; `npm run test:feedback-public-i18n` covered browser-default locale, seven picker locales, token URL, and invalid-tenant paths with no `FEEDBACK.*` leaks.
- **What was tested:** **PASS** on `docker-compose.yml` + `docker-compose.dev.yml` at `http://127.0.0.1:4202` (branch `development`, commit `dc98233`); all four script `>>> RESULT:` lines and body/title checks succeeded.
- **Why closed:** Tester **Overall: PASS** per documented criteria; optional production spot-check remains a human/GitHub follow-up if #67 is to be closed on record for prod.
- **Closed at (UTC):** 2026-03-24 05:11
---

# Feedback page needs translation

## GitHub

- **Issue:** https://github.com/satisfecho/pos/issues/67

## Problem / goal

Public guest feedback (`/feedback/{tenant}`, optional `?token=…`) must be fully localized: no raw `FEEDBACK.*` keys, consistent copy and document title across locale picker and `Accept-Language`. Multiple **CLOSED** archives under `agents/tasks/done/` record implementation and tester **PASS** on dev; **#67** remains **open** — finish **product verification** (especially production if not yet spot-checked), close any real gaps, and **align GitHub** (comment, labels, close when accepted). See `front/public/i18n/` and `docs/agent-loop.md`.

## High-level instructions for coder

- Confirm behaviour on the stack you use: several locales, with and without token, invalid-tenant paths; document title after translation load.
- If anything still fails in prod/staging, fix i18n or loading order; otherwise hand off to tester and support **close #67** per `docs/agent-loop.md`.
- Run or point to `test-feedback-public-i18n` (or equivalent) from `front/scripts/` / `docs/testing.md` when claiming verification.
- **GitHub:** Post a short verification comment on **#67** and close when product agrees (automation here may lack **Issues** write on `gh`).

---

## Coder verification (2026-03-24 UTC)

- Stack: `docker-compose.yml` + `docker-compose.dev.yml`, **BASE_URL** `http://127.0.0.1:4202`.
- Ran `npm run test:feedback-public-i18n --prefix front` — **PASS** (browser default `es-ES` stub, locale picker `en`→`de`→`fr`→`es`→`ca`→`zh-CN`→`hi`, `?token=` path, invalid tenant `/feedback/0` + DE title/body). No raw `FEEDBACK.*` in DOM; document titles matched expectations.
- **Product code:** No changes required on current `development` for dev verification.

---

## Testing instructions

### What to verify

- Public `/feedback/{tenant}` (and optional `?token=…`) shows translated copy only (no visible `FEEDBACK.*` keys), including loading and error states.
- Locale picker switches all visible strings and the **document title** consistently.
- Invalid tenant (`/feedback/0`) error UI and tab title localize when switching language.

### How to test

- Start dev stack (HAProxy on host port **4202** typical).
- From repo: `BASE_URL=http://127.0.0.1:4202 npm run test:feedback-public-i18n --prefix front`
- Optional manual spot-check: production `https://satisfecho.de/feedback/1` (or tenant URL in use) with 2–3 locales and hard refresh.

### Pass / fail criteria

- **PASS:** Script exits **0** and prints the four `>>> RESULT:` lines (browser-default ES, main locale sweep, token URL, invalid tenant).
- **FAIL:** Any timeout, exit **1**, or visible `FEEDBACK.` in page text.

### GitHub (#67)

- If **PASS** and product agrees: comment on **#67** with environment tested (dev/prod) and close the issue; label per `docs/agent-loop.md`.

---

## Test report (tester)

1. **Date/time (UTC)** and log window: started **2026-03-24 ~05:10:34 UTC**; completed **~05:10:43 UTC** (HAProxy request timestamps for `/feedback/*`). Report finalized **2026-03-24 05:10:48 UTC**.

2. **Environment:** `docker-compose.yml` + `docker-compose.dev.yml`; **`BASE_URL`** `http://127.0.0.1:4202`; branch **`development`**, commit **`dc98233`**.

3. **What was tested:** Per **What to verify** — public feedback translated copy (no `FEEDBACK.*`), locale picker + document titles, token URL, invalid tenant error UI and title after locale switch.

4. **Results:**
   - Translated copy only (incl. loading paths covered by script waits): **PASS** — `npm run test:feedback-public-i18n` asserted no `FEEDBACK.` in `document.body.innerText` on all steps; exit **0**.
   - Locale picker + document title consistency: **PASS** — script checks DE/FR/ES/CA/zh-CN/HI titles and body substrings (e.g. DE `Wie war`, ES `Cómo`).
   - Invalid tenant `/feedback/0` EN + DE + title: **PASS** — script reached `Invalid restaurant` / `Ungültiger Restaurant` and DE title contains `Ungültiger`.
   - Pass criteria (four `>>> RESULT:` lines): **PASS** — all four lines printed to stdout.

5. **Overall:** **PASS**.

6. **Product owner feedback:** Public guest feedback on the dev stack is fully covered by the automated sweep: browser-default Spanish, seven locales via the picker, a dummy `?token=` URL, and invalid-tenant messaging all show real copy with no raw i18n keys. Production was **not** re-checked in this run; a quick manual pass on the live tenant URL remains optional if you want prod parity on record before closing **#67**.

7. **URLs tested** (Puppeteer, tenant **1**):
   1. `http://127.0.0.1:4202/feedback/1` (ES auto-detect profile)
   2. `http://127.0.0.1:4202/feedback/1` (locale sweep)
   3. `http://127.0.0.1:4202/feedback/1?token=dummy-token-for-i18n-smoke`
   4. `http://127.0.0.1:4202/feedback/0` (invalid tenant, then DE)

8. **Relevant log excerpts:** `gh issue comment 67` failed: **Resource not accessible by personal access token**; label `agent:testing` not found on repo — **GitHub comment/labels not updated by automation this run.**

```
pos-haproxy | ... [24/Mar/2026:05:10:34.381] ... "GET /feedback/1 HTTP/1.1"
pos-haproxy | ... [24/Mar/2026:05:10:40.661] ... "GET /feedback/1?token=dummy-token-for-i18n-smoke HTTP/1.1"
pos-haproxy | ... [24/Mar/2026:05:10:42.398] ... "GET /feedback/0 HTTP/1.1"
```

```
> front@2.0.52 test:feedback-public-i18n
>>> RESULT: Browser default locale (es, navigator stub) on first load OK (no FEEDBACK.* leaks)
>>> RESULT: Public feedback i18n OK (en + de + fr + es + ca + zh-CN + hi, no FEEDBACK.* leaks)
>>> RESULT: Token URL path OK (no FEEDBACK.* leaks)
>>> RESULT: Invalid tenant /feedback/0 error UI i18n OK
```
