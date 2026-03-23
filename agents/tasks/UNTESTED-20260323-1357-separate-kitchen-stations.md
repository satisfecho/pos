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
