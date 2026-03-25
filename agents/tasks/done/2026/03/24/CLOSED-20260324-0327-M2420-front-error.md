---
## Closing summary (TOP)

- **What happened:** The frontend Docker build failed with **TS2420** because `FeedbackPublicComponent` did not correctly satisfy the `OnDestroy` interface.
- **What was done:** Subscriptions were moved to **`DestroyRef`** + **`takeUntilDestroyed`** (rxjs-interop), removing the incorrect `OnDestroy` surface while preserving teardown when the title i18n key changes.
- **What was tested:** Tester **PASS**: Angular bundle generation clean, `/feedback/1` HTTP 200, and **`test-feedback-public-i18n.mjs`** exit 0 with all asserted i18n paths OK.
- **Why closed:** All pass/fail criteria in the test report were met for the current tree and stack.
- **Closed at (UTC):** 2026-03-24 15:07
---

# Frontend bundle failed: FeedbackPublicComponent OnDestroy (TS2420)

## Source

- **Service:** `pos-front` (Docker), **UTC window:** ~2026-03-24T03:27:32Z (build log).
- **Representative lines:** `Class 'FeedbackPublicComponent' incorrectly implements interface 'OnDestroy'.` → **Application bundle generation failed.**

## High-level instructions for coder

- Open `FeedbackPublicComponent` (`front/src/app/feedback-public/`) and align `OnDestroy` contract (e.g. `ngOnDestroy` signature / `implements OnDestroy` vs missing or wrong method).
- Rebuild front (`docker compose` front logs or `ng build`) until bundle generation is clean; ensure no regression on feedback public route.

## Coder notes (2026-03-24)

- Removed `implements OnDestroy` / `ngOnDestroy` and wired language + title `translate.stream` subscriptions with `inject(DestroyRef)` and `takeUntilDestroyed(this.destroyRef)` from `@angular/core/rxjs-interop`. Same teardown behavior, no `OnDestroy` surface for TS2420.
- Kept explicit `titleI18nSub?.unsubscribe()` before replacing the stream when the title key changes.

---

## Testing instructions

### What to verify

- Front bundle builds (no TS2420 / Angular compiler errors on `FeedbackPublicComponent`).
- Public `/feedback/:tenantId` still loads, i18n/title behavior unchanged (issue #67).

### How to test

- Compose: `docker compose -f docker-compose.yml -f docker-compose.dev.yml` (HAProxy e.g. `http://127.0.0.1:4202`).
- Front logs: `docker compose -f docker-compose.yml -f docker-compose.dev.yml logs --tail=80 front` — expect **Application bundle generation complete**, no errors.
- Optional local build: `cd front && npx ng build --configuration=development-no-ssr` (matches dev container) and/or `--configuration=production-static` (prod image).
- Puppeteer (see `docs/testing.md`):  
  `BASE_URL=http://127.0.0.1:4202 node front/scripts/test-feedback-public-i18n.mjs`

### Pass/fail criteria

- **Pass:** Build succeeds; feedback script exits 0; no `FEEDBACK.*` key leaks in DOM per script assertions.
- **Fail:** Any Angular/TS error referencing `FeedbackPublicComponent` or `OnDestroy`; feedback script fails or route 503.

---

## Test report

1. **Date/time (UTC) and log window:** 2026-03-24T15:02–15:04Z (verification run); Docker `pos-front` logs reviewed for the same window (includes earlier same-day rebuilds back to ~09:56Z for context).

2. **Environment:** `docker compose -f docker-compose.yml -f docker-compose.dev.yml`; `BASE_URL=http://127.0.0.1:4202`; branch `development` @ `7115ae3`.

3. **What was tested:** Front bundle health for `FeedbackPublicComponent`; public `/feedback/:tenant` load and i18n/title behavior per `front/scripts/test-feedback-public-i18n.mjs` (issue #67 alignment).

4. **Results:**
   - **Angular build / no TS2420 on current sources:** **PASS** — Latest `pos-front` log lines show `Application bundle generation complete` including lazy chunk `feedback-public-component`; no recurring failure after the final rebuild in the sampled tail. (Older log history still contains a resolved **TS2420** / `OnDestroy` block from before the coder change — not present in the final successful cycle.)
   - **`/feedback/1` reachable:** **PASS** — `curl -s -o /dev/null -w "%{http_code}"` → `200`.
   - **Puppeteer `test-feedback-public-i18n.mjs`:** **PASS** — Exit code `0`; all eight `>>> RESULT:` lines printed; assertions cover no `FEEDBACK.*` leaks and localized error paths.

5. **Overall:** **PASS** (all criteria met for current tree and running stack).

6. **Product owner feedback:** The feedback public page builds cleanly again and automated i18n checks pass across locales, token URLs, and error states. Guests should see translated copy and titles without raw `FEEDBACK.*` keys. Remaining product tracking for broader feedback UX stays on **#67** until the closer/product closes it.

7. **URLs tested:**
   1. `http://127.0.0.1:4202/feedback/1` (default locale / language picker flows)
   2. `http://127.0.0.1:4202/feedback/1?token=dummy-token-for-i18n-smoke`
   3. `http://127.0.0.1:4202/feedback/1?token=bogus-reservation-token-i18n-check` (submit → localized API error)
   4. `http://127.0.0.1:4202/feedback/0` (invalid tenant error UI)
   5. `http://127.0.0.1:4202/feedback/999999999` (404 / missing tenant error UI)

8. **Relevant log excerpts:**
   - `pos-front`: `Application bundle generation complete. [0.327 seconds] - 2026-03-24T15:00:35.177Z` (after a brief intermediate **TS2339** `langSub` failure that cleared in the same rebuild cycle).
   - Puppeteer stdout: eight `>>> RESULT: … OK` lines ending with `Missing tenant (404) error UI i18n OK`; process exit `0`.
