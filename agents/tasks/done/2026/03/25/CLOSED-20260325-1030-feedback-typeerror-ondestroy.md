---
## Closing summary (TOP)

- **What happened:** The Angular dev build failed with `TS2339` because `FeedbackPublicComponent` referenced `langSub` without declaring it (and lifecycle cleanup was inconsistent).
- **What was done:** The component was refactored to use `DestroyRef` and `takeUntilDestroyed` on merged translate streams; document title updates use an optional `titleI18n` subscription with resubscribe-safe cleanup. The class implements `OnInit` only—no manual `OnDestroy`/`langSub`.
- **What was tested:** Docker front rebuild (no `TS2339`/`langSub`), `test-feedback-public-i18n.mjs` (all checks OK), and `npm run test:landing-version` (PASS)—**overall PASS** per the embedded test report.
- **Why closed:** Verification met all pass/fail criteria; incident no longer reproducible on current `development`.
- **Closed at (UTC):** 2026-03-24 15:31
---

# TypeScript build failure: FeedbackPublicComponent OnDestroy property

## Source
- **Service:** pos-front container (hot reload build)
- **Window:** 15:00 UTC on 2026-03-24 (Application bundle generation failed)
- **Error lines:**
  - `TS2339: Property 'langSub' does not exist on type 'FeedbackPublicComponent'` at src/app/feedback-public/feedback-public.component.ts:54:9
  - `TS2339: Property 'langSub' does not exist on type 'FeedbackPublicComponent'` at src/app/feedback-public/feedback-public.component.ts:89:9
  - (Likely `TS2439` for langSub, and `TS2420` for OnDestroy implementation)

## High-level instructions for coder
- Inspect `src/app/feedback-public/feedback-public.component.ts` to find property declaration issues with `langSub` and possibly missing or incorrect `OnDestroy` implementation
- Fix TypeScript compilation errors to unblock Angular bundle generation in development
- No data flow or API changes expected; focus on fixing component class definition and lifecycle hook implementation
- After fix, verify frontend rebuild succeeds in Docker; run `docker compose logs -f front` and confirm no Angular TS errors

## Coder notes (implementation)

- **Cause:** The component referenced `this.langSub` for `merge(translate.onLangChange, …).subscribe(…)` and for cleanup in `updateDocumentTitle()` without declaring `langSub` on the class (or the field was renamed inconsistently).
- **Fix (current `development`):** `FeedbackPublicComponent` uses `DestroyRef` + `takeUntilDestroyed(this.destroyRef)` on the merged translate event streams. The document title uses an optional `titleI18nSub` (`Subscription`): unsubscribe the previous stream before subscribing again, and pipe `takeUntilDestroyed(this.destroyRef)` on `translate.stream(key)`. The class implements **`OnInit` only**; teardown is handled by `DestroyRef`, not a manual `OnDestroy` with `langSub`. File: `front/src/app/feedback-public/feedback-public.component.ts`.

## Testing instructions

### What to verify

- Angular dev build completes with no `TS2339` / `langSub` errors for `FeedbackPublicComponent`.
- Public feedback page still localizes correctly and document title tracks locale (issue #67).

### How to test

1. Stack: `docker compose -f docker-compose.yml -f docker-compose.dev.yml up` (HAProxy host port often **4202**).
2. Confirm compile:  
   `docker compose -f docker-compose.yml -f docker-compose.dev.yml logs --tail=80 front`  
   Expect **Application bundle generation complete** and **no** `TS2339` / `langSub` / `FeedbackPublicComponent` errors (optionally `touch front/src/app/feedback-public/feedback-public.component.ts` to force a rebuild).
3. From repo root:  
   `BASE_URL=http://127.0.0.1:4202 node front/scripts/test-feedback-public-i18n.mjs`  
   All `>>> RESULT:` lines must print **OK**.
4. Regression:  
   `BASE_URL=http://127.0.0.1:4202 npm run test:landing-version --prefix front`  
   Expect `>>> RESULT: Landing version OK…` and exit code **0**.

### Pass/fail criteria

- **Pass:** No Angular/TS errors for `feedback-public.component.ts`; both commands exit **0**; feedback i18n script reports OK on every check.
- **Fail:** Any `langSub` or missing-property error, or either script exits non-zero.

---

## Test report

1. **Date/time (UTC) and log window:** Verification run **2026-03-24T15:29:21Z** – **2026-03-24T15:30:03Z** (Puppeteer + follow-up front log after forced rebuild **15:29:54Z** – **15:29:59Z**).

2. **Environment:** `docker-compose.yml` + `docker-compose.dev.yml`; **`BASE_URL=http://127.0.0.1:4202`**; branch **`development`** @ **28ab793**; **`HEADLESS=1`** for feedback i18n script.

3. **What was tested:** Per “What to verify”: Angular dev build / no `TS2339` / `langSub` on `FeedbackPublicComponent`; public feedback i18n and title/locale behaviour via scripted checks; landing regression.

4. **Results:**
   - **Angular compile (no `langSub` / TS2339 on current tree):** **PASS** — After `touch front/src/app/feedback-public/feedback-public.component.ts`, `pos-front` logged `Application bundle generation complete` at **2026-03-24T15:29:59.356Z** with no `TS2339` / `langSub` in the same window. (Earlier container history at **15:00:34Z** shows a transient `langSub` failure immediately followed by successful rebuilds — not reproduced on verification rebuild.)
   - **`test-feedback-public-i18n.mjs`:** **PASS** — Exit **0**; all seven `>>> RESULT:` lines **OK** (locales, token URL, invalid token DE error, thank-you DE, `/feedback/0`, missing tenant 404).
   - **`npm run test:landing-version --prefix front`:** **PASS** — Exit **0**; `>>> RESULT: Landing version OK; demo login (tenant=1) OK; sidebar nav OK.`

5. **Overall:** **PASS**

6. **Product owner feedback:** The feedback public route compiles cleanly in Docker after a forced rebuild, and automated checks confirm translations and error paths behave as expected without leaking raw `FEEDBACK.*` keys. The historical `langSub` error in front logs matches the incident window already documented in the task and does not reflect the current codebase state.

7. **URLs tested**
   1. `http://127.0.0.1:4202/` (landing)
   2. `http://127.0.0.1:4202/dashboard` (post-login)
   3. `http://127.0.0.1:4202/my-shift`, `/staff/orders`, `/reservations`, `/guest-feedback`, `/tables`, `/kitchen`, `/bar`, `/customers`, `/products`, `/catalog`, `/reports`, `/working-plan`, `/users`, `/settings` (sidebar nav, landing script)
   4. `http://127.0.0.1:4202/inventory/items`, `/inventory/suppliers`, `/inventory/purchase-orders`, `/inventory/stock`, `/inventory/reports` (landing script)
   5. `http://127.0.0.1:4202/feedback/1` (and same with `?token=` variants per script)
   6. `http://127.0.0.1:4202/feedback/0`
   7. `http://127.0.0.1:4202/feedback/999999999`

8. **Relevant log excerpts**

```
pos-front | Application bundle generation complete. [0.293 seconds] - 2026-03-24T15:29:59.356Z
```

```
>>> RESULT: Browser default locale (es, navigator stub) on first load OK (no FEEDBACK.* leaks)
>>> RESULT: Public feedback i18n OK (en + de + fr + es + ca + zh-CN + hi, no FEEDBACK.* leaks)
...
>>> RESULT: Missing tenant (404) error UI i18n OK
```

```
>>> RESULT: Landing version OK; demo login (tenant=1) OK; sidebar nav OK.
---
exit_code: 0
```