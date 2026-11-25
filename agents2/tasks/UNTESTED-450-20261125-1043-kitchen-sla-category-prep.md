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
