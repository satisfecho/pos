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
