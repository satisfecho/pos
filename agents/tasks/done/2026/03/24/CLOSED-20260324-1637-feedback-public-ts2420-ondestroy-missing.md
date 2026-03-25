---
## Closing summary (TOP)

- **What happened:** `pos-front` reported TS2420 because `FeedbackPublicComponent` implemented `OnDestroy` without `ngOnDestroy` during dev hot-reload.
- **What was done:** Coder restored a real `ngOnDestroy()` with `titleI18nSub` cleanup and kept the inner `translate.get` subscription pattern required for production-static / GitHub #67; tester re-verified compile and scripts.
- **What was tested:** Angular rebuild after `touch` on the component, `test-feedback-public-i18n.mjs`, and `test:landing-version` — all **PASS** (exit 0, no TS2420 in latest tail).
- **Why closed:** All pass/fail criteria met; coder and tester reports **PASS**.
- **Closed at (UTC):** 2026-03-24 16:46
---

# pos-front: TS2420 FeedbackPublicComponent missing ngOnDestroy (dev rebuild)

## Source

- **Service:** `pos-front` (`docker logs pos-front`).
- **UTC window:** After prior log review **2026-03-24T16:20:00Z**; failure timestamp **2026-03-24T16:26:41.224Z**; successful **Application bundle generation complete** at **2026-03-24T16:26:49.341Z** (and later rebuilds through **16:28:15.820Z**).
- **Representative lines:**
  - `Application bundle generation failed. [0.297 seconds] - 2026-03-24T16:26:41.224Z`
  - `TS2420: Class 'FeedbackPublicComponent' incorrectly implements interface 'OnDestroy'. Property 'ngOnDestroy' is missing in type 'FeedbackPublicComponent' but required in type 'OnDestroy'.` (`feedback-public.component.ts:19`)

## High-level instructions for coder

- Confirm `FeedbackPublicComponent` either implements `OnDestroy` with a real `ngOnDestroy()` or drops the interface if nothing to tear down; align with Angular compiler expectations so dev hot-reload does not intermittently fail the bundle.
- Re-check related lifecycle / subscription cleanup if `OnDestroy` is kept (see archived `agents/tasks/done/2026/03/25/CLOSED-20260325-1030-feedback-typeerror-ondestroy.md` for prior context on the same component).
- After change, watch `docker compose … logs --tail=80 front` for a clean rebuild on save.

## Coder notes (implementation)

- **Cause:** **TS2420** appears when the class **`implements OnDestroy`** but **`ngOnDestroy`** is missing (e.g. partial save or bad merge during hot reload).
- **Fix (current tree):** Keep **`OnDestroy`** with a real **`ngOnDestroy()`** that unsubscribes **`titleI18nSub`**. Do **not** add **`takeUntilDestroyed`** on the inner **`translate.get(key)`** subscription: **`[2.0.53]`** changelog documents that production-static builds need that omission so **`document.title`** updates on satisfecho.de (GitHub **#67**). Merged translate events still use **`takeUntilDestroyed(this.destroyRef)`**; **`titleI18nSub?.unsubscribe()`** before each **`get()`** resubscribe avoids duplicate streams when **`updateDocumentTitle()`** runs often.
- **Comment tweak:** Clarified in source why the inner subscription stays plain **`.subscribe()`** (production-static / **#67**).

## Testing instructions

### What to verify

- Angular dev build completes with **no TS2420** (or other TS errors) for **`FeedbackPublicComponent`**.
- Public feedback i18n, document title, and subscription cleanup behave as before.

### How to test

1. Stack: `docker compose -f docker-compose.yml -f docker-compose.dev.yml up` (HAProxy host port often **4202**).
2. Force rebuild and confirm compile:  
   `touch front/src/app/feedback-public/feedback-public.component.ts`  
   `docker compose -f docker-compose.yml -f docker-compose.dev.yml logs --tail=80 front`  
   Expect **Application bundle generation complete** and **no** `TS2420` / `FeedbackPublicComponent` / `OnDestroy` errors.
3. From repo root:  
   `BASE_URL=http://127.0.0.1:4202 node front/scripts/test-feedback-public-i18n.mjs`  
   All `>>> RESULT:` lines must print **OK** (exit **0**).
4. Regression:  
   `BASE_URL=http://127.0.0.1:4202 npm run test:landing-version --prefix front`  
   Expect `>>> RESULT: Landing version OK…` and exit **0**.

### Pass/fail criteria

- **Pass:** No Angular/TS errors for `feedback-public.component.ts`; both commands exit **0**; feedback i18n script reports OK on every check.
- **Fail:** Any `TS2420` / `OnDestroy` error, or either script exits non-zero.

## Test report (coder)

1. **UTC:** ~2026-03-24T16:39–16:41Z.
2. **Environment:** `docker-compose.yml` + `docker-compose.dev.yml`; **`BASE_URL=http://127.0.0.1:4202`**; branch **`development`**.
3. **Front logs:** After save, **Application bundle generation complete** for `feedback-public-component` chunk; no TS errors in tail.
4. **`test-feedback-public-i18n.mjs`:** **PASS** (exit 0; seven `>>> RESULT:` OK).
5. **`npm run test:landing-version --prefix front`:** **PASS** (exit 0).
6. **Overall:** **PASS**.

## Test report (tester)

1. **Date/time (UTC) and log window:** **2026-03-24T16:42Z–16:45Z**; `pos-front` logs inspected for rebuilds through **2026-03-24T16:44:30.787Z**.
2. **Environment:** `docker-compose.yml` + `docker-compose.dev.yml`; **`BASE_URL=http://127.0.0.1:4202`**; branch **`development`**, **`78ae4ff`**.
3. **What was tested:** Per **Testing instructions** — Angular compile after `touch` on `feedback-public.component.ts`, `test-feedback-public-i18n.mjs`, `test:landing-version`.
4. **Results:**
   - **TS2420 / `FeedbackPublicComponent` / `OnDestroy`:** **PASS** — Source implements **`ngOnDestroy()`** at line 136; post-`touch` **`docker compose … logs --tail=25 front`** shows **`Application bundle generation complete`** at **16:44:30.787Z** with **no** `TS2420` / `OnDestroy` lines in that tail (earlier **16:41Z** window in an **80-line** tail had contained a **stale** TS2420 block before a succeeding rebuild; current tree + latest rebuild are clean).
   - **`test-feedback-public-i18n.mjs`:** **PASS** — Exit **0**; seven **`>>> RESULT:`** lines **OK**.
   - **`npm run test:landing-version --prefix front`:** **PASS** — **`>>> RESULT: Landing version OK…`**, **EXIT:0**.
5. **Overall:** **PASS**.
6. **Product owner feedback:** Public feedback still loads translated strings and document title behaviour without raw `FEEDBACK.*` keys in the checked flows. Dev hot-reload rebuilds cleanly for this component, so local iteration should not hit the previous TS2420 compile break.
7. **URLs tested (Puppeteer):**
   1. `http://127.0.0.1:4202/`
   2. `http://127.0.0.1:4202/dashboard`
   3. `http://127.0.0.1:4202/my-shift`
   4. `http://127.0.0.1:4202/staff/orders`
   5. `http://127.0.0.1:4202/reservations`
   6. `http://127.0.0.1:4202/guest-feedback`
   7. `http://127.0.0.1:4202/tables`
   8. `http://127.0.0.1:4202/kitchen`
   9. `http://127.0.0.1:4202/bar`
   10. `http://127.0.0.1:4202/customers`
   11. `http://127.0.0.1:4202/products`
   12. `http://127.0.0.1:4202/catalog`
   13. `http://127.0.0.1:4202/reports`
   14. `http://127.0.0.1:4202/working-plan`
   15. `http://127.0.0.1:4202/users`
   16. `http://127.0.0.1:4202/settings`
   17. `http://127.0.0.1:4202/inventory/items`
   18. `http://127.0.0.1:4202/inventory/suppliers`
   19. `http://127.0.0.1:4202/inventory/purchase-orders`
   20. `http://127.0.0.1:4202/inventory/stock`
   21. `http://127.0.0.1:4202/inventory/reports`
   22. `http://127.0.0.1:4202/feedback/1` (and same with `?token=` variants per script)
   23. `http://127.0.0.1:4202/feedback/0`
   24. `http://127.0.0.1:4202/feedback/999999999`
8. **Relevant log excerpts:** `pos-front` after final `touch`: `Application bundle generation complete. [0.194 seconds] - 2026-03-24T16:44:30.787Z` (lazy chunk includes `feedback-public-component`); no `TS2420` in that tail.
