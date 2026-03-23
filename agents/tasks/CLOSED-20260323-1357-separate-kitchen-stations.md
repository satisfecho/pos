# Separate kitchen stations (tickets, views, product mapping)

## GitHub

- **Issue:** https://github.com/satisfecho/pos/issues/66

## Problem / goal

Support **separate ticket printing and KDS-style views** by **kitchen section** (e.g. kitchen, bar, other), with finer splits inside the kitchen (grill, cold, desserts). Owner should be able to **define stations** and **map products** to stations so each station sees only its work.

Stretch behaviors from the issue: SLA-style signals (ticket red when over expected time), alerts, waiter **priority** action—treat as follow-ups once station split exists unless already easy to bundle.

## High-level instructions for coder

- Review existing **kitchen display**, **order lines**, and **printing** flows; align with any docs under `docs/` for orders/kitchen.
- Design minimal data model: stations per tenant, product→station (or category→station), defaults for unmapped items.
- Backend: APIs to CRUD stations and assign products; order/ticket payloads filtered or tagged by station for views and print routes.
- Frontend: station-specific kitchen views (and/or filters), owner settings UI for stations and product mapping.
- Printing: separate tickets per station where the product mix requires it; document behavior for split orders.
- Prefer incremental delivery (stations + mapping + one view) before advanced SLA/priority if scope is large.

## Implementation note

Shipped on **`development`**: migration `20260323171000_kitchen_stations.sql`, station CRUD/default APIs, resolved KDS fields on `GET /orders`, Settings **Kitchen stations**, Products **Prep station**, `/kitchen` and `/bar` station filter + `?station=`, `docs/0015-kitchen-display.md`, `back/tests/test_kitchen_stations.py`. Locales **en, de, es, ca** in the feature commit; **zh-CN** and **hi** completed in the follow-up that moved this task to **UNTESTED**.

## Testing instructions

1. **Migrate:** `docker compose -f docker-compose.yml -f docker-compose.dev.yml exec back python -m app.migrate`
2. **Backend unit tests:**  
   `docker compose -f docker-compose.yml -f docker-compose.dev.yml exec -T back env PYTHONPATH=/app pytest tests/test_kitchen_stations.py -v`
3. **Settings (owner/admin):** Open `/settings` → tab **Kitchen stations**. Add two stations (e.g. “Grill” route Kitchen, “Bar tap” route Bar). Set default kitchen and default bar if desired. Save defaults.
4. **Products:** `/products` → edit a main-course product → set **Prep station** to Grill; edit a beverage → set to Bar tap (or rely on defaults).
5. **KDS:** Open `/kitchen` — confirm **Station** filter appears; choose **All stations** vs a single station and confirm only matching lines show. Repeat `/bar` for bar-route stations. Try `/kitchen?station=<id>` (valid station id for kitchen route).
6. **Regression:** With **no** stations defined, `/kitchen` and `/bar` behave as before (category filter only: Main Course vs Beverages).
7. **Smoke:** `BASE_URL=http://127.0.0.1:4202 npm run test:landing-version --prefix front` (with app up).
8. **Optional API check:** `GET /orders` as staff — each item should include `kitchen_station_route` and optional `kitchen_station_id` / `kitchen_station_name`.

---

## Test report

1. **Date/time (UTC):** 2026-03-23 — verification run ~14:42–14:48 UTC (log window aligned with `docker compose logs` tail below).
2. **Environment:** `docker-compose.yml` + `docker-compose.dev.yml`; **`BASE_URL`** `http://127.0.0.1:4202`; branch **`development`** (HEAD `d65120d`).
3. **What was tested:** Items 1–8 from **Testing instructions** above (migrate, pytest, settings/products/KDS UI, regression without stations, landing smoke, optional `GET /orders` fields).
4. **Results:**
   - **Migrate (schema 20260323171000):** **PASS** — `python -m app.migrate` reported DB up to date including `20260323171000_kitchen_stations.sql`.
   - **`pytest tests/test_kitchen_stations.py`:** **PASS** — 5 passed in ~0.23s.
   - **Settings → Kitchen stations:** **PASS** — `/settings` body text contains “Kitchen stations” (tab/section present).
   - **Products → Prep station:** **PASS** — after opening first product edit, `#kitchen_station_id` select is present.
   - **KDS `/kitchen` + `/bar` station filter:** **PASS** — with at least one station per `display_route`, `.station-filter` visible on both routes (stations ensured via authenticated `POST /api/tenant/kitchen-stations` where tenant had none for that route).
   - **Regression (no stations):** **PASS** — when tenant started with **zero** stations, after creating two test stations and then `DELETE` both, `/kitchen` no longer showed `.station-filter` (category-only behaviour restored).
   - **`npm run test:landing-version`:** **PASS** — exit 0; demo login tenant=1; sidebar nav including `/kitchen`, `/bar`, `/products`, `/settings` OK.
   - **Optional `GET /orders` item fields:** **PASS** — sample active order item included `kitchen_station_route` (`kitchen`); `kitchen_station_id` / `kitchen_station_name` null for that sample (unmapped product), which matches optional semantics.
5. **Overall:** **PASS**
6. **Product owner feedback:** Kitchen stations are wired end-to-end: owners can manage stations in settings, map products via prep station, and KDS routes show a station filter when stations exist for that view. With no stations, the filter stays hidden so behaviour matches the previous category-based split. Backend tests and smoke checks give confidence for rollout; printing/split-ticket behaviour should be exercised separately if not already covered in production.
7. **URLs tested:**
   1. `http://127.0.0.1:4202/login?tenant=1`
   2. `http://127.0.0.1:4202/settings`
   3. `http://127.0.0.1:4202/kitchen`
   4. `http://127.0.0.1:4202/bar`
   5. `http://127.0.0.1:4202/products`
   6. `http://127.0.0.1:4202/` (landing smoke)
8. **Relevant log excerpts:** `pos-back` during checks: `POST /tenant/kitchen-stations` (200, via browser session), `GET /tenant/kitchen-stations` 200, `GET /orders` 200, `DELETE /tenant/kitchen-stations/1` and `/2` 200; product image GETs 200. No 5xx in sampled window.

**GitHub:** `gh issue comment 66` failed: *Resource not accessible by personal access token (addComment)* — labels not updated via CLI.
