---
## Closing summary (TOP)

- **What happened:** Kitchen SLA / age display for #450 was implemented and verified on development.
- **What was done:** Shipped placed HH:MM clock, Fresh/At risk/Overdue SLA badge with timer colors, urgent toggle on kitchen/bar cards, i18n, docs/roadmap sync; category/product expected prep (slice 3) deferred for product design.
- **What was tested:** Tester PASS (2026-11-25): i18n, kitchen-display-settings API, UI placed/SLA/urgent, Puppeteer test:kitchen-timer; unit ng test skipped (ChromeHeadless sandbox env).
- **Why closed:** All in-scope criteria passed; slice 3 correctly out of scope for this pass.
- **Closed at (UTC):** 2026-11-25 10:27
---

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

## Test report

- **Date/time (UTC):** start 2026-11-25T10:19:12Z, end 2026-11-25T10:26:12Z
- **Log window:** pos-front / pos-back roughly 2026-11-25T09:45Z-10:26Z (and `--since 10m` / `40m` checks during the run)
- **Environment:** `docker-compose.yml` + `docker-compose.dev.yml`; `BASE_URL=http://127.0.0.1:14202` (HAProxy); branch `development` @ `acc2dbeda`; Puppeteer via `pos-node-chrome:local` + front `node_modules` volume (`PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium`). Owner login used temporary password via `app.seeds.set_user_password` for `tester-fiscal-431@amvara.de` (no `DEMO_LOGIN_*` in env).
- **What was tested:** Kitchen SLA / placed clock / timer settings / urgent toggle per Testing instructions (slices 1-2 + urgent); i18n keys; kitchen-display-settings API; Puppeteer `test-kitchen-timer`; contrast on SLA badge; `/bar` smoke. Slice 3 (category prep) out of scope.

### Results

1. **App up / front compile** - **PASS** - `http://127.0.0.1:14202/` and `/kitchen` return 200; `docker logs --since 10m pos-front` shows no kitchen-display `TS`/`NG` build failures (only unrelated NG8107 optional-chain warnings).
2. **i18n served** - **PASS** - `en.json` has `KITCHEN_DISPLAY.PLACED` / `SLA_FRESH` / `SLA_WARNING` / `SLA_OVERDUE` (Placed / Fresh / At risk / Overdue); `de` and `es` keys present.
3. **API kitchen-display-settings** - **PASS** - cookie login `GET /api/tenant/kitchen-display-settings` -> `{yellow_minutes:5, orange_minutes:10, red_minutes:15}`; `PUT` same defaults 200.
4. **UI Placed HH:MM + relative** - **PASS** - `[data-testid=kitchen-order-placed]` shows `Placed: HH:MM` plus parenthetical relative (`formatOrderTime`); on multi-day-old demo cards relative falls back to clock (>24h), Waiting timer still live.
5. **Waiting timer** - **PASS** - `.order-waiting` present on 13 cards (`test-kitchen-timer`).
6. **SLA badge + border** - **PASS** - Overdue + left border `rgb(239,68,68)` / `timer-red`; after raising thresholds to 999999+, badges became Fresh + `timer-green` border `rgb(34,197,94)`; defaults restored.
7. **Timer settings UI** - **PASS** - `.timer-settings-btn` opens settings UI (modal/text with threshold labels).
8. **Urgent toggle** - **PASS** - `[data-testid=kitchen-urgent-toggle]` Mark (`Urgent for kitchen`) -> Clear urgent; `order-card-urgent` + `.urgent-badge`; sorted to front.
9. **Contrast (SLA badge)** - **PASS** - Overdue text `rgb(185,28,28)` on wash composited over white card ~**5.11:1** (WCAG AA).
10. **Puppeteer test:kitchen-timer** - **PASS** - 13 placed clocks + 13 SLA badges; Timer settings button found; RESULT passed.
11. **Unit ng test kitchen-display.spec** - **SKIP (env)** - Spec bundle builds; ChromeHeadless in `pos-node-chrome` fails as root without sandbox (`zygote_host_impl_linux.cc` --no-sandbox). Instructions allow skip when ChromeHeadless unavailable; SLA/urgent covered by Puppeteer + API.

### Overall: **PASS**

### Product owner feedback

Kitchen cards now clearly show placed time, live wait, and Fresh/At risk/Overdue with matching border colours; urgent mark/clear works for owners with `order:update_status`. Threshold changes via settings/API recolor tickets as expected. Category/product expected-prep (slice 3) remains a follow-up and was correctly left out of this pass.

### URLs tested

1. http://127.0.0.1:14202/
2. http://127.0.0.1:14202/i18n/en.json
3. http://127.0.0.1:14202/i18n/de.json
4. http://127.0.0.1:14202/i18n/es.json
5. http://127.0.0.1:14202/api/health
6. http://127.0.0.1:14202/api/token
7. http://127.0.0.1:14202/api/tenant/kitchen-display-settings
8. http://127.0.0.1:14202/login
9. http://127.0.0.1:14202/dashboard
10. http://127.0.0.1:14202/kitchen
11. http://127.0.0.1:14202/bar

### Relevant log excerpts

```
pos-back: GET /tenant/kitchen-display-settings HTTP/1.1" 200 OK
pos-back: PUT /tenant/kitchen-display-settings HTTP/1.1" 200 OK
pos-front: kitchen-display-component chunks rebuilt (e.g. chunk-N2OVGJSP.js | kitchen-display-component | 103.64 kB); no Application bundle generation failed
Puppeteer: RESULT: Kitchen timer test passed. (13 placed, 13 SLA badges)
```
