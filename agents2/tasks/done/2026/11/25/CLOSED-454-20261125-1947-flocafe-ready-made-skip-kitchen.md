---
## Closing summary (TOP)

- **What happened:** Issue #454 asked for ready-made / prepared catalog items to bypass kitchen routing (FloCafe-inspired), without copying upstream code.
- **What was done:** Added product `skip_kitchen`, KDS route `none`, lines starting as `ready`, kitchen/bar display and kitchen print omitting those lines; Products UI checkbox and docs; hybrid dine-in/takeaway left to existing table / take-away / `order_channel`.
- **What was tested:** Tester PASS - migration, pytest kitchen stations (incl. skip path), Products checkbox after front rebuild, hybrid order #5841 (skip + cook), `/kitchen`/`/bar` hide ready-made, staff orders Ready status, kitchen print omit / receipt keep, health 200.
- **Why closed:** All acceptance criteria passed; feature fully delivered for this issue.
- **Closed at (UTC):** 2026-11-25 20:23
---

# FloCafe: ready-made items skip kitchen / hybrid service

## GitHub Issues
- **Issue:** https://github.com/satisfecho/pos/issues/454
- **454**

## Status
- **Implemented (010):** Product `skip_kitchen` flag; KDS route `none`; lines start as `ready`; kitchen print omits them. Hybrid dine-in/takeaway left to existing table / take-away / `order_channel` (no new service mode).
- **Restored:** Previous FEAT/WIP for #454 was missing from `agents2/tasks/` (orphaned `agent:wip` label). Recreated so feature coders can pick it up.

## Problem / goal
Upstream inspiration (FloCafe): let prepared / ready-made catalog items bypass kitchen routing, and support a simple hybrid dine-in / takeaway service mode so staff do not send every line through KDS.

Adaptation goal only - do not copy upstream code. Fit Satisfecho kitchen / order / channel patterns.

## High-level instructions for coder
- Read issue #454 and existing kitchen / KDS / order-item routing docs and code before designing.
- Propose a minimal slice: mark some products (or categories) as ready-made / no-kitchen so those lines skip kitchen tickets while cooked items still route normally.
- Optionally add a clear dine-in vs takeaway (hybrid) service mode on the order if it stays small and consistent with existing `order_channel` / table flows.
- Prefer tenant-scoped settings or product flags; no cross-tenant leakage; no hard-coded secrets.
- Work on **`development`**. Add or extend smoke coverage for the chosen slice (kitchen / orders Puppeteer or API tests as appropriate).
- If product decisions (flag placement, which channels) are unclear, post **one** waiting-for-human comment on #454 and park the FEAT per `agents2/TASKS-README.md`.
- Do not paste upstream diffs, secrets, or PII into the task file or commits.

## What was implemented
- Migration `back/migrations/20261125195042_product_skip_kitchen.sql`: `product.skip_kitchen BOOLEAN NOT NULL DEFAULT false`.
- Model + create/update product API; Products UI checkbox (i18n all locales).
- `resolve_order_item_kds` returns route `none` when `skip_kitchen`; order JSON includes `skip_kitchen`.
- New order lines for skip-kitchen products start as status `ready` (public menu + delivery/offline item helper).
- Kitchen/bar display hides `skip_kitchen` / route `none` lines; kitchen print jobs omit them; receipts unchanged.
- Docs: `docs/0015-kitchen-display.md`.
- Tests: `back/tests/test_kitchen_stations.py` (skip path); `front/.../kitchen-display.component.spec.ts` (hide ready-made lines).

## Testing instructions
1. Apply migrations if needed: `docker compose exec back python -m app.migrate` (version includes `20261125195042`).
2. Backend unit: `docker compose exec back python3 -m pytest tests/test_kitchen_stations.py -q` (expect pass, including `test_skip_kitchen_ready_made`).
3. Front unit (optional): run kitchen-display specs; expect `should hide ready-made skip_kitchen lines from kitchen display (#454)` to pass.
4. Manual / UI:
   - Log in as owner/admin → **Products** → edit a product → enable **Ready-made (skip kitchen / bar)** → save.
   - Place an order that includes that product plus a normal cooked item.
   - Open `/kitchen` (and `/bar` if beverage): ready-made line must **not** appear; cooked line must still appear.
   - On **Orders**, ready-made line should show status **ready** immediately.
5. Rebuild/redeploy front if the environment serves a production nginx image (not `ng serve`) so the Products checkbox and KDS filter are live.
6. App health: landing responds (e.g. `curl -sk -o /dev/null -w "%{http_code}" https://127.0.0.1/` → 200).

## Test report

- **Date/time (UTC):** start 2026-11-25T20:14:28Z, end 2026-11-25T20:21:43Z
- **Log window:** pos-front / pos-back roughly 2026-11-25T20:14Z-20:21Z (migrate, product PUT, order create, front rebuild)
- **Environment:** `docker-compose.yml` + `docker-compose.prod.yml` (nginx front); `BASE_URL=https://127.0.0.1`; branch `development` @ `4238d4f65` (front rebuild `COMMIT_HASH=79753be4e` during verify). Puppeteer host Chrome (`PUPPETEER_EXECUTABLE_PATH` under `~/.cache/puppeteer`). Owner login via temporary password (`app.seeds.set_user_password` for `ralf@roeber.de`). Product 6 `skip_kitchen` restored to `false` after UI checks.
- **What was tested:** Migration `20261125195042`; pytest kitchen stations incl. `test_skip_kitchen_ready_made`; Products Ready-made checkbox after nginx rebuild; hybrid Take Away order #5841 (Coca Cola skip + Enchiladas cook); `/kitchen` / `/bar` hide ready-made; `/staff/orders` shows Ready; kitchen print payload omits Coca Cola, receipt keeps it; landing health.

### Results

1. **Migration applied** - **PASS** - `python -m app.migrate` reports schema version `20261125195042` (`product_skip_kitchen.sql` applied).
2. **Backend pytest `tests/test_kitchen_stations.py`** - **PASS** - `6 passed` including `test_skip_kitchen_ready_made` (route `none`, initial status `ready`).
3. **Front unit kitchen-display.spec (#454)** - **SKIP (env)** - prod nginx image has no `ng test` / Chromium in container; filter covered by Puppeteer kitchen + component source `skip_kitchen` / route `none` hide.
4. **Front rebuild (nginx)** - **PASS** - Pre-rebuild `/i18n/en.json` lacked `PRODUCTS.SKIP_KITCHEN`; after `compose ... build front && up -d front`, served key is `Ready-made (skip kitchen / bar)` and JS chunks contain `skip_kitchen`.
5. **Products UI checkbox** - **PASS** - Edit Coca Cola: `[data-testid=product-skip-kitchen]` present, checked, label Ready-made (skip kitchen / bar).
6. **Order line statuses / KDS fields** - **PASS** - `GET /api/orders`: Coca Cola `status=ready`, `skip_kitchen=true`, `kitchen_station_route=none`; Enchiladas `pending`, `skip_kitchen=false`, route `kitchen`.
7. **Kitchen display** - **PASS** - `/kitchen` card `#5841` shows `1x Enchiladas` only; Coca Cola not on any kitchen card (`skipVisible=false`, `cookVisible=true`).
8. **Bar display** - **PASS** - `/bar` cards do not show Coca Cola (`skipVisible=false`).
9. **Staff Orders UI** - **PASS** - `/staff/orders` order `#5841`: `Enchiladas ... Pending` and `Coca Cola ... Ready`.
10. **Kitchen print omit / receipt keep** - **PASS** - `_build_order_payload(..., 'kitchen')` lines = Enchiladas only; receipt includes Coca Cola + Enchiladas.
11. **App health** - **PASS** - `https://127.0.0.1/` and `/api/health` return 200 (`{"status":"ok"}`).

### Overall: **PASS**

### Product owner feedback

Ready-made products can be marked in Products, land as Ready on the order, and stay off kitchen/bar tickets while cooked lines still appear. Kitchen print payloads match that split; receipts still list the ready-made item. After a prod-front rebuild the checkbox copy and KDS filter are live on the local nginx stack.

### URLs tested

1. https://127.0.0.1/
2. https://127.0.0.1/api/health
3. https://127.0.0.1/i18n/en.json
4. https://127.0.0.1/login?tenant=1
5. https://127.0.0.1/dashboard
6. https://127.0.0.1/products
7. https://127.0.0.1/kitchen
8. https://127.0.0.1/bar
9. https://127.0.0.1/staff/orders
10. https://127.0.0.1/api/token
11. https://127.0.0.1/api/products
12. https://127.0.0.1/api/orders

### Relevant log excerpts

```
pos-back: Database schema version: 20261125195042
pytest: 6 passed (test_skip_kitchen_ready_made included)
pos-back: PUT /products/6 HTTP/1.1" 200 OK
order #5841 items: Coca Cola ready skip_kitchen=true route=none; Enchiladas pending route=kitchen
kitchen payload: lines=[Enchiladas]; receipt includes Coca Cola
Puppeteer: products skip UI checked; kitchen card #5841 Enchiladas only; staff/orders Coca Cola Ready
pos-front (after rebuild): SKIP_KITCHEN= Ready-made (skip kitchen / bar); landing 200
```
