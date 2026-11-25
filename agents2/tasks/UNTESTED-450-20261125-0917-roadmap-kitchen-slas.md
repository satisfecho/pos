# Roadmap: Kitchen SLAs / stations (#450)

## GitHub Issues
- **Issue:** https://github.com/satisfecho/pos/issues/450
- **450**
- Related: https://github.com/satisfecho/pos/issues/53

## Problem / goal
Kitchen tickets should reflect **age / SLA** (fresh → warning → overdue), with category-aware expected times and clearer placed time on every ticket. Station-specific views already have a foundation (`docs/0015-kitchen-display.md`); this roadmap item tracks the remaining SLA / age-gradient work from #53 and `docs/0032-github-issues-roadmap.md`.

## High-level instructions for coder
- Read `docs/0015-kitchen-display.md` and the #53 section in `docs/0032-github-issues-roadmap.md`. Reuse existing kitchen/bar WebSocket display and kitchen-station filter; do not rebuild stations from scratch.
- Prefer an incremental first slice: (1) show clear placed/order time on each ticket, (2) age-based visual gradient or SLA badge from elapsed time, (3) optional category/product expected prep duration config.
- Later slices (only if first slice is solid): priority/claim flag + API; finer station tags beyond current kitchen/bar.
- Keep multi-tenant settings owner/admin scoped; defaults must be safe when no SLA config exists.
- Update i18n for any new UI strings; add or extend kitchen display smoke/spec coverage.
- If SLA thresholds or claim UX need product decisions, post **one** waiting-for-human comment on #450 and park per `TASKS-README.md`.
- Work on **`development`**.

## Status
- **WIP started:** 2026-11-25T09:21:29Z
- **Implemented (this pass):** Completed / polished slices (1) and (2), plus kitchen urgent toggle (slice 4 already had API on `/orders`). Category/product expected prep (slice 3) left for a follow-up - needs product design (absolute vs % of expected, multi-item ticket rule).
- Timer age colors + `/tenant/kitchen-display-settings` already existed; this pass adds clear **Placed HH:MM**, **SLA badge** (Fresh / At risk / Overdue), urgent toggle on kitchen/bar cards, i18n, docs/roadmap sync, and extended unit + Puppeteer checks.

## What changed
- `front/src/app/kitchen-display/kitchen-display.component.ts` - placed clock, SLA badge, urgent toggle (`order:update_status`)
- `front/src/app/kitchen-display/kitchen-display.component.spec.ts` - SLA mapping + urgent API tests
- `front/public/i18n/*.json` - `KITCHEN_DISPLAY.PLACED`, `SLA_FRESH`, `SLA_WARNING`, `SLA_OVERDUE`
- `front/scripts/test-kitchen-timer.mjs` - asserts placed clock + SLA badge when cards exist
- `docs/0015-kitchen-display.md`, `docs/0032-github-issues-roadmap.md`, `ROADMAP.md` - status synced with shipped SLA/timer/urgent/stations

## Testing instructions

1. **App up:** HAProxy (e.g. `http://127.0.0.1:14202` or `4202`). Front compile clean: `docker logs --since 10m pos-front` shows no `TS`/`NG` errors for kitchen-display.
2. **i18n served:** `curl -s $BASE_URL/i18n/en.json` includes `KITCHEN_DISPLAY.PLACED` and `SLA_*` keys.
3. **API (owner/admin cookie login):** `GET /api/tenant/kitchen-display-settings` returns `{yellow_minutes, orange_minutes, red_minutes}` (defaults 5/10/15).
4. **UI `/kitchen` (or `/bar`):** With at least one active order card:
   - **Placed:** clock `HH:MM` plus relative age (`[data-testid=kitchen-order-placed]`).
   - **Waiting:** live mm:ss timer.
   - **SLA badge:** Fresh / At risk / Overdue (`[data-testid=kitchen-sla-badge]`) matching border color (green / yellow-orange / red).
   - **Timer settings:** change thresholds; cards recolor after save.
   - **Urgent:** with `order:update_status`, toggle Mark/Clear urgent on the card; badge + sort-to-front.
5. **Puppeteer:** `BASE_URL=... LOGIN_EMAIL=... LOGIN_PASSWORD=... PUPPETEER_EXECUTABLE_PATH=... npm run test:kitchen-timer --prefix front` (pass when login env available; empty kitchen still OK for timer button).
6. **Unit:** `ng test --include=src/app/kitchen-display/kitchen-display.component.spec.ts --watch=false` when ChromeHeadless is available in the environment.
7. **Out of scope this pass:** category/product expected prep minutes (slice 3) - do not fail the test for missing per-category SLA config.
