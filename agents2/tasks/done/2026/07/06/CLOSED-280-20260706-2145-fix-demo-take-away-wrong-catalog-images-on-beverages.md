---
## Closing summary (TOP)

- **What happened:** Demo Take Away beverages (e.g. Coca Cola) showed wrong catalog images and descriptions because `link_demo_products_to_catalog.py` used round-robin fallback when names did not match.
- **What was done:** Removed round-robin linking; added `repair_mismatched_links()` to delete bad `TenantProduct` rows; added four backend tests in `test_link_demo_products_to_catalog.py` asserting name-match-only linking and menu safety.
- **What was tested:** Backend tests (4 passed), idempotent link seed (122 skipped, no round-robin), Take Away menu API, browser smoke on Café americano and Amstel Radler, and regression `test_get_menu_dedup` (2 passed) — overall **PASS**.
- **Why closed:** All acceptance criteria and tester verification passed; demo Take Away no longer shows beer/wine catalog content on mismatched beverages.
- **Closed at (UTC):** 2026-07-06 22:10
---

# Fix demo Take Away menu: wrong catalog images on beverages (Coca Cola shows beer photo)

## GitHub Issues
- **Issue:** https://github.com/satisfecho/pos/issues/280
- **280**

## Problem / goal

In **Probar demo: Take Away**, demo beverages show wrong catalog content — e.g. **Coca Cola** displays a beer photo (Voll-Damm) and beer description; same for Coffee and other drinks.

**Root cause:** `seed_demo_products` creates tenant products without images. `link_demo_products_to_catalog.py` then links them to catalog `ProviderProduct` rows; when normalized names do not match, it falls back to **round-robin** assignment, pairing drinks with random beer/pizza/wine catalog items. The public menu (`get_menu`) keeps the demo product name/price but inherits the catalog image and description.

See **`back/app/seeds/link_demo_products_to_catalog.py`** (round-robin at name-mismatch), **`docs/0001-ci-cd-amvara9.md`** (deploy runs this seed after catalog imports), and **`docs/testing.md`** (link script usage).

## High-level instructions for coder

- Remove round-robin fallback in **`link_demo_products_to_catalog.py`**: link a demo product to catalog only when normalized names match (`Product.name` vs `ProviderProduct.name` or related `ProductCatalog.name`); skip products with no match.
- **Repair tenant 1 data:** delete or fix existing `TenantProduct` links where the demo product name and linked catalog/provider name do not match (bad links from prior round-robin runs).
- Add backend tests: **"Coca Cola"** must not link to **"Voll-Damm"**; demo menu response for Coca Cola must not include beer catalog description/image.
- Re-run link script locally after fix: `docker compose exec back python -m app.seeds.link_demo_products_to_catalog` and verify tenant 1 Take Away menu.
- Smoke test: Landing → **Probar demo: Take Away** → open **Coca Cola** — no beer photo or beer description.
- Append **Testing instructions** when implementation is complete; work on **`development`**.

## Implementation notes

- Removed round-robin fallback in `back/app/seeds/link_demo_products_to_catalog.py`; links only on normalized name match.
- Added `repair_mismatched_links()` (runs at start of `link_products` / deploy seed) to delete bad `TenantProduct` rows where `Product.name` does not match catalog/provider name.
- Added `back/tests/test_link_demo_products_to_catalog.py` (4 tests).

## Testing instructions

1. **Backend unit/integration tests**
   ```bash
   docker exec -w /app pos-back python3 -m pytest tests/test_link_demo_products_to_catalog.py -q
   ```
   Expect: 4 passed.

2. **Repair + re-link seed (idempotent)**
   ```bash
   docker compose exec back python -m app.seeds.link_demo_products_to_catalog
   ```
   Expect: mismatched links removed (if any); products without catalog name match reported as skipped (not round-robin linked).

3. **Menu API check** (tenant 1 Take Away token from DB or landing demo flow):
   ```bash
   TOKEN=$(docker exec pos-postgres psql -U pos -d pos -t -c "SELECT token FROM \"table\" WHERE tenant_id=1 AND lower(name) LIKE '%take away%' LIMIT 1;" | tr -d ' \n')
   curl -s "http://127.0.0.1:4202/api/menu/$TOKEN" | python3 -c "
   import json,sys
   d=json.load(sys.stdin)
   for p in d.get('products',[]):
       if p.get('name') in ('Coca Cola','Coffee','Water'):
           assert not (p.get('image_filename') or '').startswith('providers/'), p
           assert 'Damm' not in (p.get('description') or ''), p
   print('beverage menu OK')
   "
   ```

4. **Manual smoke:** Landing → **Probar demo: Take Away** → open **Coca Cola** (and Coffee) — no beer/wine/pizza photo or unrelated catalog description.

5. **Regression:** `docker exec -w /app pos-back python3 -m pytest tests/test_get_menu_dedup.py -q`

---

## Test report

1. **Date/time (UTC):** 2026-07-06 22:00–22:10 UTC. Log window: same window (`pos-back`, `pos-front`).

2. **Environment:** `docker-compose.yml` + `docker-compose.dev.yml`, `BASE_URL=http://127.0.0.1:4202`, branch `development` @ `6b98154c`.

3. **What was tested:** Backend unit/integration tests for name matching and repair; idempotent link seed; Take Away menu API; browser smoke (Landing → Try demo: Take Away → beverages); regression `test_get_menu_dedup`.

4. **Results:**
   - **Backend tests (`test_link_demo_products_to_catalog.py`):** **PASS** — `4 passed in 0.84s`.
   - **Link seed (repair + re-link):** **PASS** — `Skipped 122 product(s) with no catalog name match.` / `Done.` (no round-robin linking).
   - **Menu API (Coca Cola/Coffee/Water asserts):** **PASS** (vacuous) — tenant 1 Take Away menu has 7 products; `Coca Cola`/`Coffee`/`Water` not present in current demo DB (replaced by catalog-linked demo items). Script exited 0; no `Damm` in any product.
   - **Menu API (current beverages):** **PASS** — `Barocco D.O.C. Puglia`, `Amstel Radler`, `Café americano` present; name-matched catalog images/descriptions only; `Café americano` has tenant image, no provider link.
   - **Browser smoke:** **PASS** — Landing → **Try demo: Take Away** → opened **Café americano** and **Amstel Radler**; no `Voll-Damm` or beer catalog description text.
   - **Regression (`test_get_menu_dedup.py`):** **PASS** — `2 passed in 0.79s`.

5. **Overall:** **PASS** (Coca Cola scenario covered by unit tests; live demo menu beverages show no wrong-catalog pairing).

6. **Product owner feedback:** The round-robin catalog link bug is fixed: mismatched links are repaired and only name-matched products get catalog images. Local Take Away demo no longer shows beer content on soft drinks; current demo menu uses catalog-import products (Amstel Radler, Café americano, wine) with correct pairings.

7. **URLs tested:**
   1. `http://127.0.0.1:4202/`
   2. `http://127.0.0.1:4202/menu/c8b96dbb-a988-447c-a25c-9cf892e5afce`

8. **Relevant log excerpts:**
   ```
   pos-back | GET /menu/c8b96dbb-a988-447c-a25c-9cf892e5afce HTTP/1.1" 200 OK
   pytest test_link_demo_products_to_catalog.py: .... [100%] 4 passed
   pytest test_get_menu_dedup.py: .. [100%] 2 passed
   link_demo_products_to_catalog: Skipped 122 product(s) with no catalog name match.
   ```
