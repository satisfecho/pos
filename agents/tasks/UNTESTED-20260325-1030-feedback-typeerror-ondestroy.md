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