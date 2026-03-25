# Feedback page needs translation

## GitHub

- **Issue:** https://github.com/satisfecho/pos/issues/67

## Problem / goal

Public guest feedback (`/feedback/{tenant}`, e.g. with `?token=…` on production-style URLs) must show **fully translated** UI: every part of the form and related states in the selected language, with **no raw `FEEDBACK.*` keys** in visible copy or document title. Prior agent archives under `agents/tasks/done/` record repeated **PASS** on local Docker; the GitHub issue remains **open**—align **production** behaviour, capture evidence, and close the loop on the issue when product agrees (`docs/agent-loop.md`).

## High-level instructions for coder

- Re-verify on local stack: `FeedbackPublicComponent` (`front/src/app/feedback-public/`), locale files under `front/public/i18n/`, and automated check `npm run test:feedback-public-i18n --prefix front` (or `node front/scripts/test-feedback-public-i18n.mjs` with `BASE_URL`).
- Spot-check **production** (`https://satisfecho.de/feedback/…` or tenant under test) for the same acceptance bar; fix any real gaps (missing keys, title flicker, wrong locale) rather than re-litigating already-green dev-only paths.
- If behaviour matches acceptance, post a short verification summary on **#67** (or hand to closer with `issues:write`) and support closing the issue when product accepts.

## Testing instructions

**What to verify**

- Public `/feedback/{tenant}`: no raw `FEEDBACK.*` in visible copy or document title; browser tab title follows the active locale (not stuck on the default `POS - Point of Sale` from `index.html`), including first visit with browser language auto-detect (e.g. Spanish).

**How to test**

- Local (stack on HAProxy, e.g. port 4202):  
  `BASE_URL=http://127.0.0.1:4202 node front/scripts/test-feedback-public-i18n.mjs`
- **Production** (after this build is deployed):  
  `BASE_URL=https://satisfecho.de node front/scripts/test-feedback-public-i18n.mjs`  
  Prior to deploy, production could pass the DOM checks but fail the **document title** assertion on first-load ES auto-detect; that gap is what the code change addresses.

**Pass / fail**

- **Pass:** Script exits 0; all `>>> RESULT:` lines print; no assertion errors.
- **Fail:** Any raw `FEEDBACK.` in body/title, or missing localized substring in `document.title` where the script expects it (see script comments for #67).

---

## Test report

1. **Date/time (UTC) and log window:** 2026-03-24 16:30–16:32 UTC; Docker `pos-front` / `pos-haproxy` tails aligned with local Puppeteer run (~16:30:39–16:30:41 HAProxy entries for `/feedback/…`).

2. **Environment:** `docker-compose.yml` + `docker-compose.dev.yml`; local **`BASE_URL=http://127.0.0.1:4202`**; production **`BASE_URL=https://satisfecho.de`**; branch **`development`**, commit **`dcc0ec9`**; **`HEADLESS=1`**.

3. **What was tested:** Public `/feedback/{tenant}` — no raw `FEEDBACK.*` in visible copy or title; document title matches active locale on first load with Spanish browser language (navigator stub in script).

4. **Results**
   - **Local — script exit 0, all RESULT lines:** **PASS** — `node front/scripts/test-feedback-public-i18n.mjs` with `BASE_URL=http://127.0.0.1:4202` exited 0; seven `>>> RESULT:` lines printed (ES auto-detect, locales, token path, invalid token DE error, thank-you de, /feedback/0, 404).
   - **Local — no raw FEEDBACK.* / localized title (inferred from script assertions):** **PASS** — script checks body/title for leaks and ES title contains `Cómo`.
   - **Production — script exit 0:** **FAIL** — same script with `BASE_URL=https://satisfecho.de` exited 1: `Expected ES auto-detect document title to include "Cómo", got: POS - Point of Sale`.
   - **Production — document title follows locale on first-load ES:** **FAIL** — title stuck on default from `index.html` (matches task note about pre-deploy gap).

5. **Overall:** **FAIL** — production does not meet the scripted acceptance bar (#67 document title on first-load ES auto-detect). Local stack passes.

6. **Product owner feedback:** Local Docker behaviour matches the intended bar: automated i18n checks are green. Production still shows the generic tab title on the Spanish first-visit scenario the script models, so guests on satisfecho.de are not yet getting the same experience as dev until a build with the title fix is live there. Recommend deploying the current `development` front build to production and re-running the production command, or closing the issue only after that check passes.

7. **URLs tested**
   1. `http://127.0.0.1:4202/feedback/1` (and flows inside script: token query, submit, `/feedback/0`, `/feedback/999999999`)
   2. `https://satisfecho.de/feedback/1` (failed at first scenario — full production suite not completed)

8. **Relevant log excerpts**
   - **Local test (command):** exit code 0; stdout included all `>>> RESULT:` lines listed above.
   - **`pos-haproxy` (sample):** `GET /feedback/999999999` 200; `GET /api/public/tenants/999999999` 404; prior lines show `/feedback/1` dev-server and `i18n/de.json` / `en.json` fetches during the run window.
   - **`pos-front`:** rebuild lines around 16:27–16:28Z showing `feedback-public-component` chunk build complete (context: dev server healthy during test).

**Loop protection:** N/A (first verification cycle for this task file).

**GitHub:** Issue **#67** comment/labels not updated — `gh issue comment` returned *Resource not accessible by personal access token (addComment)*.

**001 log reviewer (2026-03-24T17:30:40Z):** No new **FEAT-** (this WIP already tracks **#67**). Docker logs since prior review: no new front/haproxy/postgres lines; **pos-back** routine **GET /docs 200** only — no **NEW-** opened.

**001 log reviewer (2026-03-24T17:37:17Z):** Same dedupe — no new **FEAT-** for **#67**. **`gh issue comment 67`** / **`gh issue edit 67 --add-label agent-planned`** still fail: *Resource not accessible by personal access token* (**`issues:write`** needed). Docker **`--since 2026-03-24T17:30:40Z`**: **pos-front** / **pos-haproxy** / **pos-postgres** empty; **pos-back** ~200 lines **GET /docs 200** only; `grep -iE 'error|exception|traceback| 5[0-9]{2} '` — no matches → **0× new NEW**.

**001 log reviewer (2026-03-24T17:50:00Z):** Same dedupe — no new **FEAT-** for **#67**. **`gh issue comment 67`** failed again (**`addComment`**). Docker **`--since 2026-03-24T17:43:49Z`**: **pos-front** / **pos-haproxy** / **pos-postgres** empty; **pos-back** **GET /docs 200** only → **0× new NEW**.

**001 log reviewer (2026-03-24T17:56:16Z):** Same dedupe — no new **FEAT-** for **#67** (only open issue; **WIP** already links it). **`gh issue comment 67`** / **`gh issue edit 67 --add-label agent-planned`** failed — *Resource not accessible by personal access token* (**`issues:write`** needed). Docker **`--since 2026-03-24T17:50:00Z`**: **pos-front** / **pos-postgres** empty; **pos-haproxy** / **pos-back** routine **200** only; `grep` on **pos-back** — no **error**/**exception**/**traceback**/**5xx** → **0× new NEW**. Counts this run: **0 FEAT**, **0 NEW**.

**001 log reviewer (2026-03-24T18:02:51Z):** Same dedupe — **0× new FEAT** for **#67** (`WIP` links **https://github.com/satisfecho/pos/issues/67**). **`gh issue comment 67`** / **`gh issue edit 67 --add-label agent-planned`** — **failed** (**`addComment`**, **`addLabelsToLabelable`**); PAT needs **`issues:write`**. Docker **`--since 2026-03-24T17:56:16Z`**: **pos-front** / **pos-haproxy** / **pos-postgres** **0** new lines; **pos-back** ~193 lines, all **`GET /docs` 200**; no **error**/**exception**/**traceback**/**5xx** → **0× new NEW**. Counts: **0 FEAT**, **0 NEW**.

**001 log reviewer (2026-03-24T18:10:00Z):** Same dedupe — **0× new FEAT** for **#67**. **`gh issue comment 67`** — **`addComment`** PAT failure; **`--add-label agent:planned`** — label **not found**; **`agent-planned`** — **`addLabelsToLabelable`** PAT failure. Docker **`--since 2026-03-24T18:02:51Z`**: **pos-front** / **pos-haproxy** / **pos-postgres** empty; **pos-back** **`GET /docs` 200** only; `grep` — no incidents → **0× new NEW**. Counts: **0 FEAT**, **0 NEW**.
