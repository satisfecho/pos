---
## Closing summary (TOP)

- **What happened:** Restaurant groups (#283) had no discoverable feature guide under `docs/`; enhancement reviewer filed a docs-only task.
- **What was done:** Added `docs/0054-restaurant-groups.md` (create/join/leave, share flags, Settings tab, API, isolation) and indexed it under Feature guides in `docs/README.md`; no product code changes.
- **What was tested:** Index link present; Settings → Restaurant group UI matches the guide; `pytest tests/test_restaurant_groups.py` — 5 passed. Overall **PASS**.
- **Why closed:** All pass criteria met; documentation matches shipped behaviour.
- **Closed at (UTC):** 2026-07-22 12:30
---

# Document restaurant groups (multi-location sharing)

## GitHub Issues
- **Issue:** (none — enhancement reviewer)
- **0**

## Problem / goal

Restaurant groups shipped (#283): Settings → Restaurant group, join codes, optional shared billing customers/products across sibling tenants. Operators and agents have **no feature guide** under `docs/` and **`docs/README.md`** does not index the feature — only CHANGELOG and archived CLOSED-283 describe it. New contributors cannot discover how multi-location sharing works without reading code or closed tasks.

## Evidence (008 preflight / review)

- Weekly 008 sweep (`SIGNAL docs_stale` + docs-vs-code scan): recent product includes restaurant groups; `rg` on `docs/*.md` finds **zero** “restaurant group” hits
- Implementation: `back/app/restaurant_groups.py`, `GET/POST/PUT /restaurant-group`, join/leave; migration `20260712140000_restaurant_group.sql`; Settings UI `restaurant-group-settings`; tests `back/tests/test_restaurant_groups.py`
- `docs/README.md` Feature guides list provider, kitchen, delivery, SaaS — **no** restaurant-groups row

## High-level instructions for coder

- Add a short feature guide (e.g. `docs/0054-restaurant-groups.md` or similar next free number): what a group is, create/join/leave, `share_customers` / `share_products` semantics (read-only siblings), owner/admin Settings tab, tenant isolation vs non-members
- Index it under **Feature guides** in `docs/README.md`
- Optional one-liner in root README Multi-tenant / Features only if not already covered by open README delivery/SaaS task — avoid duplicating WIP product scope
- Do **not** change product APIs; documentation only
- Pass criteria: `docs/README.md` links the new guide; guide matches Settings UI + `test_restaurant_groups.py` behaviour; tester can open Settings → Restaurant group on tenant 1 and follow the doc

## Implementation notes (010)

- Added `docs/0054-restaurant-groups.md` (create/join/leave, share flags, owner/admin Settings tab, API table, isolation vs table groups).
- Indexed under Feature guides in `docs/README.md`.
- Skipped root README one-liner (open delivery/SaaS WIP scope; CHANGELOG already covers #283).
- No product API or UI code changes.
- No GitHub issue comment/label (task issue is none / 0).

## Testing instructions

1. Confirm `docs/README.md` Feature guides table includes a row linking to `docs/0054-restaurant-groups.md`.
2. Skim `docs/0054-restaurant-groups.md` against Settings UI: owner/admin login → **Settings → Restaurant group** (`data-testid="settings-restaurant-group-tab"` / `settings-restaurant-group-section`) — create/join/leave, join code, share products/customers checkboxes match the doc.
3. Optional: `docker compose -f docker-compose.yml -f docker-compose.dev.yml exec back python3 -m pytest back/tests/test_restaurant_groups.py -q` (or from `/app` in the back container) — shared customers/products + sibling update 404 behaviour described in the guide.
4. Pass if the index link works and the guide matches UI + test behaviour; fail if docs contradict Settings or `test_restaurant_groups.py`.

## Test report

1. **Date/time (UTC):** 2026-07-22 12:28:54 start → 12:30:05 end. Log window: `docker logs --since 15m` (pos-back, pos-front).
2. **Environment:** `docker-compose.yml` + `docker-compose.dev.yml`; `BASE_URL=http://127.0.0.1:4202`; branch `development` (synced via `./scripts/git-sync-development.sh` before rename).
3. **What was tested:** Feature-guide index link; Settings → Restaurant group UI vs `docs/0054-restaurant-groups.md`; optional `tests/test_restaurant_groups.py`.
4. **Results:**
   - **PASS** — `docs/README.md` Feature guides row links `[0054-restaurant-groups.md](0054-restaurant-groups.md)` (line 57); file exists on disk.
   - **PASS** — Owner login (tenant Demo Pizzeria) → Settings → **Grupo de restaurantes** / Restaurant group: `data-testid` tab + section present; in-group UI shows name, share products/customers checkboxes (read-only products copy), join code, member locations (current badge), Leave — matches guide; create/join paths present in component when `!group()`.
   - **PASS** — `pytest tests/test_restaurant_groups.py -q` in back container: **5 passed**; shared `is_shared` + sibling customer update **404** aligns with guide sharing semantics.
5. **Overall:** **PASS**
6. **Product owner feedback:** Restaurant groups now have a discoverable feature guide indexed like other multi-location/SaaS docs. Operators can follow Settings → Restaurant group using the same language as the UI (join code, share flags, leave). No product code was touched; documentation matches shipped #283 behaviour.
7. **URLs tested:**
   1. `http://127.0.0.1:4202/login`
   2. `http://127.0.0.1:4202/dashboard`
   3. `http://127.0.0.1:4202/settings` (Restaurant group tab / section)
8. **Relevant log excerpts:**
   ```
   pos-back: GET /restaurant-group HTTP/1.1" 200 OK
   pytest: ..... [100%] 5 passed, 1 warning in 4.11s
   pos-front: only pre-existing NG8107 warnings (no build failure)
   ```

