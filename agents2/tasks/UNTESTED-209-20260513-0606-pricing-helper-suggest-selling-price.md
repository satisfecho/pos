# Pricing helper: suggest selling price from cost / pour cost target (drinks & food)

## GitHub Issues
- **Issue:** https://github.com/satisfecho/pos/issues/209
- **209**

## Problem / goal

Restaurant owners cannot see a suggested selling price when they buy
inventory (e.g. a beer keg, a wine box, a bag of flour). Today the POS
already knows the cost and the recipe, but the math (pour cost / margin
/ markup, plus waste, fixed extras, and rounding) is done by hand
outside the app.

Add a small **Pricing helper** that turns an existing cost basis into a
suggested selling price. **No DB tables, no migration, no new
permissions.** Reuse what the codebase already exposes (recipe cost
endpoint, `Product.cost_cents`, `convert_units`, tenant tax rules,
tax-inclusive pricing convention).

Two flows, one UI, one backend module:

- **Flow A — Product with recipe.** Cost comes from
  `GET /recipes/product/{product_id}/cost`. If the product has no
  recipe, fall back to `Product.cost_cents`. If both are missing, return
  a clear error.
- **Flow B — What-if simulator.** Owner enters
  `container_cost_cents`, `container_volume + unit`, and
  `serving_size + unit`. Backend converts units with `convert_units()`
  and rejects incompatible pairs (weight ↔ volume).

## High-level instructions for coder

- **Look up docs first** (per `.cursor/rules/lookup-docs-before-new-code.mdc`):
  scan `docs/` and `README.md` for any inventory / cost / recipe / tax
  notes. Skim `back/app/inventory_models.py`,
  `back/app/inventory_service.py`, `back/app/inventory_routes.py`, and
  `back/app/models.py` (Product price/cost fields) so the helper aligns
  with the existing patterns and naming.
- **Backend (`back/app/`)**
  - New `pricing_service.py` with one pure function:
    `suggest_price(cost_per_serving_cents, *,
    target_pour_cost_pct=None, target_margin_pct=None,
    target_markup_pct=None, extra_fixed_cents=0, waste_pct=0,
    rounding_step_cents=None)` returning
    `cost_per_serving_cents`, `suggested_price_cents`,
    `profit_per_serving_cents`, and the resulting
    `pour_cost_pct`, `margin_pct`, `markup_pct`.
  - Validate that **exactly one** target is set. Apply rounding **last**.
  - New `pricing_routes.py` (admin-only auth, mirror
    `inventory_routes.py`):
    - `POST /pricing/simulate` — Flow B body; response also includes
      `break_even_servings` and `total_profit_if_sold_out_cents`.
    - `GET /pricing/product/{product_id}/suggest` with target query
      params — Flow A. Reuse `calculate_product_cost()` to get the
      cost basis, then fall back to `Product.cost_cents` when no
      recipe exists. Clear `404` / `400` when neither is available.
  - Tax-inclusive prices stay tax-inclusive (project convention).
  - Add unit tests for `pricing_service` (math, validation,
    rounding, waste, fixed extra).
- **Frontend (`front/src/app/`)**
  - New `products/pricing-helper.component.ts` modal.
    - Segmented target selector: **Pour cost / Margin / Markup**.
    - Heuristic default: 25 % pour cost for drinks, 30 % food cost
      for food, picked from `product.category` when available.
    - Optional fields: waste %, extra fixed cost per serving,
      rounding step (default `0.50`).
    - Live preview with cost per serving, suggested price, profit
      per serving, break-even servings, total profit if sold out.
    - **"Use this price"** writes the value into the price input
      (no auto-save).
  - Button **"Calculate ideal price"** next to the price field in
    `products/products.component.ts`. Open Flow A when `product.id`
    exists, Flow B otherwise.
  - New `pricing.service.ts` thin wrapper for both endpoints.
  - **RTL:** use logical CSS (`margin-inline-*`, `text-align:
    start/end`, `inset-inline-*`) so the modal renders correctly in
    Urdu (see UNTESTED-205 / `.cursor/rules/angular-ngx-translate.mdc`).
  - **i18n:** add the keys below to **all 9 locales** (`bg`, `ca`,
    `de`, `en`, `es`, `fr`, `hi`, `ur`, `zh-CN`) with the same
    structure (per `.cursor/rules/angular-ngx-translate.mdc`):
    `PRICING.TITLE`, `PRICING.TARGET_POUR_COST`,
    `PRICING.TARGET_MARGIN`, `PRICING.TARGET_MARKUP`,
    `PRICING.EXTRA_FIXED_COST`, `PRICING.WASTE_PCT`,
    `PRICING.ROUNDING`, `PRICING.COST_PER_SERVING`,
    `PRICING.SUGGESTED_PRICE`, `PRICING.PROFIT_PER_SERVING`,
    `PRICING.BREAK_EVEN`, `PRICING.TOTAL_PROFIT_IF_SOLD_OUT`,
    `PRICING.USE_THIS_PRICE`, `PRICING.MODE_RECIPE`,
    `PRICING.MODE_SIMULATE`, `PRICING.NO_COST_BASIS`.
- **Out of scope** (do not add): persisting pricing scenarios /
  history, bulk pricing for the whole menu, auto re-pricing when
  `average_cost_cents` changes, per-supplier packaging.
- **Acceptance**
  - Helper opens from Product edit (Flow A) and from manual entry
    (Flow B), and returns a suggested price.
  - Flow A reads cost from `GET /recipes/product/{id}/cost` when a
    recipe exists; falls back to `Product.cost_cents`; clear error
    if neither.
  - Pour cost / margin / markup math is correct; rounding applied
    last; tax-inclusive convention preserved.
  - No DB / permission changes; no regressions on Products or
    Inventory.
  - All 9 locale JSONs in sync; UI renders correctly in Urdu (RTL).
- **Build check (mandatory):** after any frontend edit, watch
  `docker compose logs --since "10m ago" --tail=80 pos-front` until
  the bundle compiles cleanly (no `TS2345`, `NG8002`, "Decorators
  are not valid here", or "Application bundle generation failed").
- **Smoke tests:** confirm `http://127.0.0.1:4202/` returns 200,
  the products page still loads, and Flow B math is correct on a
  manual run before marking the task `UNTESTED-`.

## Testing instructions (for tester)

1. **Backend unit tests:** from repo root with compose dev stack:
   `docker compose -f docker-compose.yml -f docker-compose.dev.yml exec -T back python3 -m pytest tests/test_pricing_service.py -q` (expect all passed).
2. **API (auth required):** as an owner/admin with `product:write`, call
   `GET /api/pricing/product/{id}/suggest?target_pour_cost_pct=25` for a product that has recipe cost or `cost_cents`; expect JSON with `suggested_price_cents`. Call `POST /api/pricing/simulate` with JSON body
   `{"container_cost_cents":5000,"container_quantity":"20","container_unit":"liter","serving_quantity":"200","serving_unit":"milliliter","target_pour_cost_pct":25}` — expect `servings_in_container` ≈ 100 and coherent `suggested_price_cents`.
3. **Frontend:** Products → edit or add product → **Calculate ideal price**. With saved product, confirm **From recipe / cost** loads a preview when recipe or cost exists; switch to **Container simulator** and adjust fields — preview updates. **Use this price** fills the price field without saving until user saves the form.
4. **i18n / RTL:** switch UI to Urdu (`ur`); reopen the helper — layout should not break (logical CSS on modal).
5. **Smoke:** `curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:4202/` → 200; `BASE_URL=http://127.0.0.1:4202 npm run test:landing-version --prefix front` passes (includes navigating to `/products`).
