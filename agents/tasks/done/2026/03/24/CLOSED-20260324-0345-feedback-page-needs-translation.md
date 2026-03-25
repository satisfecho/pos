---
## Closing summary (TOP)

- **What happened:** Tester verified GitHub issue **#67** (public feedback localization) on **`development`** at **`dd46fc7`**; automated `gh issue comment` failed (PAT lacks comment scope), so GitHub follow-up stays manual.
- **What was done:** Coder pass confirmed **`FEEDBACK`** key parity across **`front/public/i18n/*.json`**, product already uses the translate pipe / `instant()` for titles and errors, and **`front/scripts/test-feedback-public-i18n.mjs`** was extended to exercise **en**, **de**, and **fr** including document title and no raw **`FEEDBACK.`** in visible DOM text.
- **What was tested:** **`BASE_URL=http://127.0.0.1:4202 node front/scripts/test-feedback-public-i18n.mjs`** and **`npm run test:landing-version --prefix front`** both exited **0**; optional manual/prod checks were **N/A** in the report.
- **Why closed:** Mandatory acceptance criteria **passed**; no further product-code retest required per tester **PASS**; archived per **`agents/tasks/README.md`**.
- **Closed at (UTC):** 2026-03-24 03:51
---

# Feedback page needs translation

## GitHub

- **Issue:** https://github.com/satisfecho/pos/issues/67

## Problem / goal

Public feedback routes (`/feedback/{tenant}`, token flows) must be fully localized: no raw `FEEDBACK.*` keys, validation and error copy should respect locale / `Accept-Language` where applicable. Prior implementation and multiple **CLOSED** tester archives under `agents/tasks/done/` document substantial work; the issue remains **open** — treat remaining scope as **final verification** (including production when possible), any **real i18n gaps**, and **GitHub alignment** (comment, labels, close when product accepts). See `docs/agent-loop.md` and `front/public/i18n/`.

## High-level instructions for coder

- Re-verify `/feedback/{tenant}` (and related public paths) across at least two non-default locales; confirm document title, form labels, validation messages, and loading / error branches are translated.
- Cross-check locale JSON validity (e.g. `de.json`) and key parity across `front/public/i18n/` for `FEEDBACK` and shared keys used on the feedback flow.
- Run documented smoke or Puppeteer scripts for landing/feedback if present; fix only if QA finds real untranslated strings or regressions — avoid re-implementing closed scope without evidence.
- When behaviour matches the issue: coordinate **close #67** on GitHub per `docs/agent-loop.md` (or hand off if automation lacks Issues write).

## Coder summary (2026-03-24 UTC)

- **`FEEDBACK` key parity:** All files under `front/public/i18n/*.json` expose the same 37 keys as `en.json` under `FEEDBACK` (scripted diff).
- **Product code:** No further UI/i18n changes required for this pass; public feedback already uses translate pipe / `instant()` for titles and errors.
- **Automation:** `front/scripts/test-feedback-public-i18n.mjs` extended to switch **de** then **fr**, assert French copy (`Comment s…`) and localized document title, and fail on any `FEEDBACK.` substring in `document.body.innerText`.
- **Local verification:** `BASE_URL=http://127.0.0.1:4202 node front/scripts/test-feedback-public-i18n.mjs` and `npm run test:landing-version --prefix front` both exit **0**.

---

## Testing instructions

1. With the stack reachable (e.g. HAProxy on **4202**):  
   `BASE_URL=http://127.0.0.1:4202 node front/scripts/test-feedback-public-i18n.mjs`  
   Expect log line ending with **en + de + fr, no FEEDBACK.\* leaks** and exit code **0**.
2. Regression:  
   `BASE_URL=http://127.0.0.1:4202 npm run test:landing-version --prefix front` — exit **0**.
3. **Manual (optional):** `/feedback/1` — use the language picker for **de**, **fr**, and one more locale (e.g. **es**); confirm form labels, loading text, and (if triggered) error lines are translated, not raw keys; browser tab title tracks locale.
4. **Production (optional):** Repeat spot-check on deployed host if product wants prod sign-off before closing **#67**.
5. **GitHub:** If tester passes and product accepts, comment on **#67** and close per `docs/agent-loop.md`.

---

## Test report

1. **Date/time (UTC) and log window**  
   Started **2026-03-24T03:48:34Z**; landing regression finished **2026-03-24T03:49:18Z**. Docker log review: `pos-front` tail after run (no errors in excerpt).

2. **Environment**  
   Compose: `docker-compose.yml` + `docker-compose.dev.yml`. **`BASE_URL`:** `http://127.0.0.1:4202` (HAProxy → front). **Branch:** `development`, **commit:** `dd46fc7`.

3. **What was tested** (from Testing instructions)  
   Required items (1) public feedback i18n Puppeteer script, (2) landing-version regression. Optional (3) manual `/feedback/1` for **es**, (4) production spot-check, (5) GitHub close — noted below.

4. **Results**

   | Criterion | Result | Evidence |
   |-----------|--------|----------|
   | (1) `test-feedback-public-i18n.mjs` exit 0, expected result line | **PASS** | Console: `>>> RESULT: Public feedback i18n OK (en + de + fr, no FEEDBACK.* leaks)`; process exit 0 |
   | (2) `npm run test:landing-version --prefix front` exit 0 | **PASS** | Console: `>>> RESULT: Landing version OK; demo login (tenant=1) OK; sidebar nav OK.`; `exit_code: 0` |
   | (3) Manual de/fr/es picker on `/feedback/1` | **N/A** | Optional; automated script already exercises **en**, **de**, **fr** on `/feedback/1` including document title assertions |
   | (4) Production | **N/A** | Optional; not run from this environment |
   | (5) GitHub | **FAIL** (automation) | \`gh issue comment 67 --repo satisfecho/pos\` → \`Resource not accessible by personal access token (addComment)\`; closer/product must comment/close **#67** manually |

5. **Overall:** **PASS** — mandatory checks (1) and (2) passed. Item (5) blocked by PAT scope; no product-code retest required.

6. **Product owner feedback**  
   Automated checks show the public feedback page stays fully translated across English, German, and French, with no raw `FEEDBACK.*` keys in the visible DOM and localized document titles. The general landing and staff sidebar crawl still passes, so no regression was detected on the paths that script exercises. GitHub automation could not post a comment on **#67** from this environment (PAT lacks issue comment permission); please add the verification note and close the issue when product accepts. If you need Spanish or production parity before closing, run the optional steps in the task file.

7. **URLs tested**

   1. `http://127.0.0.1:4202/feedback/1` (Puppeteer: default locale, then language select **de**, then **fr**)  
   2. `http://127.0.0.1:4202/`  
   3. `http://127.0.0.1:4202/dashboard`  
   4. `http://127.0.0.1:4202/my-shift`  
   5. `http://127.0.0.1:4202/staff/orders`  
   6. `http://127.0.0.1:4202/reservations`  
   7. `http://127.0.0.1:4202/guest-feedback`  
   8. `http://127.0.0.1:4202/tables`  
   9. `http://127.0.0.1:4202/kitchen`  
   10. `http://127.0.0.1:4202/bar`  
   11. `http://127.0.0.1:4202/customers`  
   12. `http://127.0.0.1:4202/products`  
   13. `http://127.0.0.1:4202/catalog`  
   14. `http://127.0.0.1:4202/reports`  
   15. `http://127.0.0.1:4202/working-plan`  
   16. `http://127.0.0.1:4202/users`  
   17. `http://127.0.0.1:4202/settings`  
   18. `http://127.0.0.1:4202/inventory/items`  
   19. `http://127.0.0.1:4202/inventory/suppliers`  
   20. `http://127.0.0.1:4202/inventory/purchase-orders`  
   21. `http://127.0.0.1:4202/inventory/stock`  
   22. `http://127.0.0.1:4202/inventory/reports`  

8. **Relevant log excerpts**

   **Puppeteer (stdout):**

   ```
   >>> RESULT: Public feedback i18n OK (en + de + fr, no FEEDBACK.* leaks)
   ```

   **Landing test (stdout, tail):**

   ```
   >>> RESULT: Landing version OK; demo login (tenant=1) OK; sidebar nav OK.
   exit=0
   ```

   **`docker logs pos-front` (tail, post-run):** build completed without error in window — e.g. `Application bundle generation complete. [0.170 seconds] - 2026-03-24T03:35:57.187Z` (no TS/NG errors in tail).
