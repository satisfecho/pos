---
## Closing summary (TOP)

- **What happened:** Guests on the Take Away demo table menu saw each dish twice because `get_menu` merged linked `TenantProduct` and legacy `Product` rows without deduplication.
- **What was done:** `get_menu` in `back/app/main.py` now skips legacy products whose IDs are linked via active tenant products (same pattern as `public_tenant_menu.py`); added `back/tests/test_get_menu_dedup.py` with two pytest cases. No frontend change was required.
- **What was tested:** Pytest (2 passed), API smoke (7 products, no duplicate names), browser demo Take Away flow (7 product cards, no duplicate names), and clean `pos-front` build logs — all PASS.
- **Why closed:** All acceptance criteria and tester verification passed.
- **Closed at (UTC):** 2026-07-06 07:25
---

# Deduplicate products on table menu (GET /menu/{table_token})

## GitHub Issues
- **Issue:** https://github.com/satisfecho/pos/issues/278
- **278**

## Problem / goal

When guests open the ordering menu (e.g. landing “Probar demo: Take Away” → `/menu/{table_token}`), products appear twice (~18 items instead of ~9). Root cause: `get_menu` in `back/app/main.py` merges `TenantProduct` (catalog) and legacy `Product` rows without skipping linked duplicates.

`back/app/public_tenant_menu.py` already deduplicates via `linked_legacy_product_ids` — reuse that pattern in the table menu endpoint. Each sellable item should appear once in the customer ordering menu.

Related prior work: public menu dedup was fixed in **#258** (`public_tenant_menu.py`); this issue targets the **table token** menu path in `main.py`.

## High-level instructions for coder

- Reproduce: use landing “Probar demo: Take Away” or `GET /menu/{table_token}` for a demo table; confirm duplicate product names/ids in the response.
- In `get_menu` (`back/app/main.py`), before appending legacy products:
  - Build `linked_legacy_product_ids = {tp.product_id for tp in tenant_products if tp.product_id is not None}`.
  - Skip any legacy `Product` whose `id` is in that set (mirror `public_tenant_menu.py` ~lines 189–239).
- Add or extend pytest (e.g. `test_get_menu_dedup.py` or existing menu tests): tenant with `TenantProduct` linked to `Product` → menu returns one entry per dish, not two.
- **Frontend (optional, only if still needed after backend fix):** In `menu.component.html` / `featuredProducts`, exclude featured items from the grid below to avoid duplicate on-screen display.
- After fix: run targeted pytest; smoke table menu via browser or Puppeteer; check `docker logs --since 10m pos-front` for compile errors.
- Append **Testing instructions** when implementation is complete.

## Implementation summary

- **`back/app/main.py` (`get_menu`):** Build `linked_legacy_product_ids` from active `TenantProduct.product_id` values; skip matching legacy `Product` rows when building `products_list`; exclude linked legacy IDs from the question lookup set.
- **`back/tests/test_get_menu_dedup.py`:** Two pytest cases — linked legacy+tenant product returns one item (tenant_product source); unlinked legacy and standalone tenant product both appear.

No frontend change required (backend dedup is sufficient).

## Testing instructions

1. **Pytest (required):**
   ```bash
   docker compose -f docker-compose.yml -f docker-compose.dev.yml exec -T back python3 -m pytest tests/test_get_menu_dedup.py -q
   ```
   Expect: `2 passed`.

2. **API smoke (demo tenant):**
   ```bash
   TOKEN=$(docker compose -f docker-compose.yml -f docker-compose.dev.yml exec -T back python3 -c "
   from sqlmodel import Session, select
   from app.db import engine
   from app import models
   from app.main import _is_take_away_table
   with Session(engine) as s:
       for t in s.exec(select(models.Table).where(models.Table.tenant_id==1)):
           if _is_take_away_table(t):
               print(t.token); break
   ")
   curl -s "http://127.0.0.1:4202/api/menu/${TOKEN}" | python3 -c "
   import sys, json
   from collections import Counter
   d = json.load(sys.stdin)
   names = [p['name'] for p in d['products']]
   dupes = [n for n,c in Counter(names).items() if c>1]
   assert not dupes, dupes
   print('products:', len(names), 'duplicates: none')
   "
   ```

3. **Browser:** Landing → “Probar demo: Take Away” (or open `/menu/{table_token}`). Confirm each dish appears once in the grid.

4. **Frontend build:** No front changes; optional check: `docker logs --since 10m pos-front | grep -iE 'error|fatal'` — should be clean.

---

## Test report

1. **Date/time (UTC):** 2026-07-06 07:22–07:24 UTC (log window: last 15m on `pos-back`, `pos-front`).

2. **Environment:** `docker-compose.yml` + `docker-compose.dev.yml`; `BASE_URL=http://127.0.0.1:4202`; branch `development` @ `111b28e1`.

3. **What was tested:** Menu deduplication for `GET /menu/{table_token}` — pytest unit cases, live API response for demo Take Away table, browser flow from landing demo button, frontend build log check.

4. **Results:**
   - **Pytest `test_get_menu_dedup.py`:** **PASS** — `2 passed in 1.00s`.
   - **API smoke (demo tenant token `c8b96dbb-…`):** **PASS** — `products: 7 duplicates: none`.
   - **Browser (landing → demo Take Away → menu grid):** **PASS** — 7 `.product-card` entries, no duplicate `.product-name` text.
   - **Frontend build logs:** **PASS** — no `error`/`fatal` lines in `pos-front` logs (last 10m).

5. **Overall:** **PASS** (all criteria met).

6. **Product owner feedback:** Guests opening the Take Away demo menu now see each dish once (7 items), matching the deduplicated API payload. The fix aligns table-token menus with the public-menu dedup pattern from #258; no frontend change was needed.

7. **URLs tested:**
   1. http://127.0.0.1:4202/
   2. http://127.0.0.1:4202/menu/c8b96dbb-a988-447c-a25c-9cf892e5afce
   3. http://127.0.0.1:4202/api/menu/c8b96dbb-a988-447c-a25c-9cf892e5afce (via curl in API smoke)

8. **Relevant log excerpts:**
   ```
   # pytest (back container)
   ..                                                                       [100%]
   2 passed in 1.00s

   # API smoke (host)
   products: 7 duplicates: none

   # browser (Puppeteer)
   Product cards: 7
   PASS no duplicate product names in grid

   # pos-front (last 10m, grep error|fatal)
   (no matches)
   ```
