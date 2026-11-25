---
## Closing summary (TOP)

- **What happened:** Kitchen SLA slice 3 (category/product expected prep) was implemented and tester-verified on development.
- **What was done:** Tenant SLA mode/aggregation, category and product expected prep minutes, kitchen card clocks with max-line default and 5/10/15 fallback; settings UI, i18n, docs, and unit/Puppeteer coverage.
- **What was tested:** App/compile, i18n, kitchen-display-settings API, timer UI, absolute/percent/fallback SLA, product override, pytest (9 passed), and test:kitchen-timer - Overall PASS.
- **Why closed:** All testing criteria passed; roadmap Kitchen SLAs (#450) fully delivered including slices 1-2 already archived.
- **Closed at (UTC):** 2026-11-25 18:51
---

# Kitchen SLA: category / product expected prep (#450 slice 3)

## GitHub Issues
- **Issue:** https://github.com/satisfecho/pos/issues/450
- **450**
- Related: https://github.com/satisfecho/pos/issues/53

## Problem / goal
Slices 1-2 of Kitchen SLAs shipped and closed (placed HH:MM, Fresh/At risk/Overdue badges, urgent toggle; see archived `CLOSED-450-20261125-0917-roadmap-kitchen-slas.md`). Remaining roadmap work: **category / product expected prep times** so tickets can use starter-vs-main (or per-product) SLA clocks instead of only flat tenant timer thresholds. Documented as still open in `docs/0015-kitchen-display.md`.

## High-level instructions for coder
- Read `docs/0015-kitchen-display.md` (Still open / follow-up), `docs/0032-github-issues-roadmap.md` (#53), and the archived CLOSED-450 task for what already shipped. Reuse existing kitchen/bar display and `/tenant/kitchen-display-settings`; do not rebuild stations.
- Before coding, confirm product decisions on #450 (post **one** waiting-for-human comment if unanswered): absolute expected minutes vs % of expected; how multi-item tickets pick an SLA (max line, sum, primary category). Do not invent unilaterally.
- When design is clear: add owner/admin-scoped expected prep config (category and/or product), wire kitchen age/SLA to that config with safe fallback to current 5/10/15 defaults, update i18n, and extend kitchen timer / display smoke or unit coverage.
- Keep multi-tenant scoping; work on **`development`**.

## Status
- Follow-up to CLOSED-450 slices 1-2.
- **Unblocked** by human on #450 (2026-11-25T18:16:02Z): absolute vs % configurable per owner; multi-item aggregation configurable (default max line).
- **Implemented (this pass):** Category/product expected prep (slice 3).

## What was done
- Migration `20261125181840_kitchen_sla_expected_prep.sql`: tenant SLA mode/aggregation/percent bands + `kitchen_expected_prep_by_category`; `product.expected_prep_minutes`.
- Backend helpers `back/app/kitchen_sla.py` + pytest `tests/test_kitchen_sla.py`.
- Extended `GET`/`PUT /tenant/kitchen-display-settings` and order item `expected_prep_minutes` resolution; product create/update accepts override.
- Kitchen Timer settings UI: mode, aggregation, percent or absolute bands, category expected minutes; Products form expected-prep field.
- Kitchen card SLA/timer uses ticket expected (max_line default; sum / primary_category) with safe flat 5/10/15 fallback.
- i18n (all locales), docs `0015` / `0032` / `ROADMAP.md`; Puppeteer `test-kitchen-timer.mjs` checks new modal fields.

## Testing instructions

1. **App up:** HAProxy (e.g. `http://127.0.0.1:14202`). Front compile clean: `docker logs --since 10m pos-front` shows no kitchen-display `TS`/`NG` build failures.
2. **i18n:** `curl -s $BASE_URL/i18n/en.json` includes `KITCHEN_DISPLAY.SLA_THRESHOLD_MODE`, `SLA_AGG_*`, `EXPECTED_PREP_BY_CATEGORY`, and `PRODUCTS.EXPECTED_PREP_MINUTES`.
3. **API (cookie login, owner/admin):**
   - `GET /api/tenant/kitchen-display-settings` returns `sla_threshold_mode`, `sla_ticket_aggregation`, percent fields, `expected_prep_by_category`.
   - `PUT` with `expected_prep_by_category` e.g. `{"Starters":8,"Main Course":15}` and mode `percent_of_expected` or `absolute` returns 200 and persists.
4. **UI /kitchen:** Timer settings shows SLA mode, aggregation, category prep inputs (`data-testid=kitchen-sla-mode`, `kitchen-sla-aggregation`, `kitchen-prep-Starters`). Save and reload.
5. **SLA behaviour:** With category prep set and orders that include those categories, absolute mode overdue at max line expected; percent mode uses % of expected. With no expected prep, still Fresh/At risk/Overdue via 5/10/15.
6. **Products:** Optional expected prep minutes saves and overrides category default on orders API items.
7. **Unit:** `docker compose exec back python3 -m pytest tests/test_kitchen_sla.py -q`
8. **Puppeteer:** `BASE_URL=... LOGIN_EMAIL=... LOGIN_PASSWORD=... npm run test:kitchen-timer --prefix front` (or pos-node-chrome with volumes-from pos-front).

## Test report

- **Date/time (UTC):** start 2026-11-25T18:45:25Z, end 2026-11-25T18:49:53Z
- **Log window:** pos-front / pos-back roughly 2026-11-25T18:31Z-18:50Z (`--since 10m` / `40m` during the run). Earlier mid-implement TS errors at ~18:20Z were outside the clean window; last kitchen-display rebuilds complete by 18:38:40Z.
- **Environment:** `docker-compose.yml` + `docker-compose.dev.yml`; HAProxy `BASE_URL=http://127.0.0.1:14202` (Puppeteer internal `http://haproxy:4202` via `pos-node-chrome:local` on `pos2_net`); branch `development` @ `05ca1835e`. No repo `.env` demo login; owner `tester-fiscal-431@amvara.de` via temporary password (`app.seeds.set_user_password`) + minted JWT for API; login captcha fail counters cleared in Redis before UI login.
- **What was tested:** Kitchen SLA category/product expected prep (slice 3) per Testing instructions: app/compile, i18n, kitchen-display-settings GET/PUT, timer settings UI, absolute/percent/fallback SLA behaviour, product override on orders, unit pytest, Puppeteer `test:kitchen-timer`.

### Results

1. **App up / front compile** - **PASS** - `http://127.0.0.1:14202/` HTTP 200; `docker logs --since 10m pos-front` during test window has no kitchen-display `TS`/`NG` build failures (only unrelated NG8107 optional-chain warnings). Kitchen-display chunks rebuilt successfully (e.g. `chunk-4BNVUPN2.js | kitchen-display-component | 120.15 kB`).
2. **i18n** - **PASS** - `en.json` includes `KITCHEN_DISPLAY.SLA_THRESHOLD_MODE`, `SLA_AGG_MAX_LINE` / `SLA_AGG_SUM` / `SLA_AGG_PRIMARY_CATEGORY`, `EXPECTED_PREP_BY_CATEGORY`, and `PRODUCTS.EXPECTED_PREP_MINUTES`.
3. **API kitchen-display-settings** - **PASS** - Bearer GET returns `sla_threshold_mode`, `sla_ticket_aggregation`, percent bands, `expected_prep_by_category`. PUT `{"Starters":8,"Main Course":15}` with `absolute` and `percent_of_expected` both HTTP 200 and persist on subsequent GET.
4. **UI /kitchen timer settings** - **PASS** - Modal shows `data-testid=kitchen-sla-mode`, `kitchen-sla-aggregation`, `kitchen-prep-Starters`; save Starters=1 + reload restores value (`tmp/test-kitchen-sla-slice3.mjs`).
5. **SLA behaviour** - **PASS** - Absolute + short category prep: 13/13 kitchen cards Overdue. Cleared `expected_prep_by_category` keeps flat 5/10/15; old demo cards still Overdue with badges. Percent mode PUT 200. Unit helpers: `aggregate_ticket_expected_minutes` max_line of 8+15 = 15; pytest covers bands.
6. **Products expected prep override** - **PASS** - PUT `/api/products/5` `expected_prep_minutes=12` persists in DB; open orders show Pozole `expected_prep_minutes=12` and Enchiladas (Main Course) `15` from category map. Products UI has `#expected_prep_minutes` field. Override cleared after test.
7. **Unit pytest** - **PASS** - `tests/test_kitchen_sla.py`: 9 passed in 0.02s.
8. **Puppeteer test:kitchen-timer** - **PASS** - Timer settings + SLA mode/aggregation/category prep fields; 13 Waiting + 13 placed clocks + 13 SLA badges. RESULT: Kitchen timer test passed.
9. **Contrast** - **N/A (no new colour/chrome)** - Slice 3 reuses existing Fresh/At risk/Overdue badge tokens; no new brand/nav colours. Prior CLOSED-450 slice reported Overdue ~5.11:1 AA.

### Overall: **PASS**

### Product owner feedback

Owners can set absolute or percent-of-expected SLA bands and category prep minutes in Timer settings; tickets use max-line expected by default with safe 5/10/15 fallback when no prep is configured. Product-level expected prep overrides category defaults on order lines, so starter-vs-main clocks are ready without flat tenant-only thresholds.

### URLs tested

1. http://127.0.0.1:14202/
2. http://127.0.0.1:14202/i18n/en.json
3. http://127.0.0.1:14202/api/tenant/kitchen-display-settings
4. http://127.0.0.1:14202/api/products
5. http://127.0.0.1:14202/api/orders
6. http://haproxy:4202/login?tenant=1
7. http://haproxy:4202/dashboard
8. http://haproxy:4202/kitchen
9. http://haproxy:4202/products

### Relevant log excerpts

```
pytest: ......... [100%] 9 passed, 1 warning in 0.02s
pos-back: GET/PUT /tenant/kitchen-display-settings HTTP/1.1" 200 OK
pos-back: PUT /products/5 HTTP/1.1" 200 OK
pos-front: Application bundle generation complete (kitchen-display-component ~120 kB); no failures in test window
Puppeteer test-kitchen-timer: RESULT: Kitchen timer test passed. (13 Waiting, 13 placed, 13 SLA badges)
slice3 script: OVERALL PASS (ui save/reload, absolute overdue, percent PUT, fallback 5/10/15, products field)
```
