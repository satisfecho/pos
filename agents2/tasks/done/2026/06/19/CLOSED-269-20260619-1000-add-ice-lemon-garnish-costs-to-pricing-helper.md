---
## Closing summary (TOP)

- **What happened:** Issue #269 asked for optional per-serving ice, lemon, and garnish costs in the pricing helper so suggested drink prices reflect real extras.
- **What was done:** Added a visible **Garnishes** section (ice, lemon, other) in the pricing helper UI; amounts sum with **Extra fixed cost** into existing `extra_fixed_cents` for recipe and simulate modes; i18n keys in all locales; backend unit test `test_garnish_costs_summed_via_extra_fixed`.
- **What was tested:** Backend pytest (10 passed), clean Angular build, pricing helper smoke (preview updates, Use this price, combined garnish + extra fixed), and landing/sidebar smoke — all **PASS**.
- **Why closed:** All acceptance criteria and test report passed; product owner confirmed ready to ship.
- **Closed at (UTC):** 2026-06-19 10:10
---

# Add ice, lemon, and garnish costs to the pricing helper

## GitHub Issues
- **Issue:** https://github.com/satisfecho/pos/issues/269
- **269**

## Problem / goal

The pricing helper (simulate and recipe modes) prices the main container or full recipe only. Common drink extras — ice, lemon, and similar garnishes — are not included in cost-per-serving unless the operator finds the hidden **Extra fixed cost** field under **More options**. Operators need an optional, visible way to add per-serving garnish costs so suggested prices reflect real drink economics.

Reference prior pricing-helper work in **`agents2/tasks/done/`** (#209, #213, #232, #233) and backend **`back/app/pricing_service.py`** / **`back/app/pricing_routes.py`** (`extra_fixed_cents` already exists in the math).

## High-level instructions for coder

- Add a **Garnishes** (or equivalent) section in **`front/src/app/products/pricing-helper.component.ts`**: optional per-serving costs for ice, lemon, and/or a small set of similar extras (keep UI compact; match existing modal/form patterns and **field-hint** styling from #232).
- Sum garnish costs into the effective cost basis **before** pour-cost / margin / markup calculation — reuse or extend **`extra_fixed_cents`** on the API if that is the smallest path; avoid new DB tables/migrations unless unavoidable.
- Wire request/response through **`front/src/app/products/pricing.service.ts`** and existing pricing API routes; preserve recipe + simulate modes and advanced fields under **More options**.
- Add **`PRICING.*`** i18n keys in **all** **`front/public/i18n/*.json`** locale files (labels + hints).
- Extend **`back/tests/test_pricing_service.py`** for garnish/extra cost in cost-per-serving; smoke: Products → **Calculate ideal price** → preview updates when garnish fields change; **Use this price** still applies suggested price to the product form.
- After edits: confirm **`docker logs --since 10m pos-front`** shows no Angular/TS build errors.

## Implementation notes

- Added visible **Garnishes** section in `pricing-helper.component.ts` with optional per-serving fields: ice, lemon, other garnish.
- Garnish amounts are summed with the existing **Extra fixed cost** (More options) into `extra_fixed_cents` for both recipe and simulate API calls — no backend or DB changes.
- i18n: `PRICING.SECTION_GARNISHES`, `GARNISHES_HINT`, `GARNISH_ICE`, `GARNISH_ICE_HINT`, `GARNISH_LEMON`, `GARNISH_LEMON_HINT`, `GARNISH_OTHER`, `GARNISH_OTHER_HINT` in all locale files.
- Backend: `test_garnish_costs_summed_via_extra_fixed` in `back/tests/test_pricing_service.py`.

## Testing instructions

1. **Backend unit tests** (with stack up):
   ```bash
   docker compose -f docker-compose.yml -f docker-compose.dev.yml exec back python3 -m pytest tests/test_pricing_service.py -q
   ```
   Expect all tests pass, including `test_garnish_costs_summed_via_extra_fixed`.

2. **Frontend build**: after starting the stack, confirm no TS/Angular errors:
   ```bash
   docker logs --since 10m pos-front 2>&1 | grep -iE 'error|TS[0-9]+|failed'
   ```
   Should return nothing (or only unrelated warnings).

3. **Smoke — pricing helper UI** (logged in as staff with product edit access):
   - Open **Products** → edit or create a beverage product → **Calculate ideal price**.
   - Confirm a **Garnishes** section appears with Ice, Lemon, and Other garnish fields (above Pricing strategy).
   - In **Container simulator** mode (or recipe mode with cost basis): note **Suggested price** and **Cost per serving**.
   - Enter e.g. ice `0.05`, lemon `0.10` → preview should update (higher cost per serving and suggested price).
   - Click **Use this price** → modal closes and product price field updates to the suggested value.
   - Open **More options** → **Extra fixed cost** still works; combined with garnishes (e.g. garnish 0.15 + extra 0.05 → 0.20 added to cost basis).

4. **Quick landing smoke** (optional):
   ```bash
   cd front && BASE_URL=http://127.0.0.1:4202 npm run test:landing-version
   ```

---

## Test report

1. **Date/time (UTC):** 2026-06-19T10:03:00Z – 2026-06-19T10:08:00Z (log window ~10:03–10:08 UTC).

2. **Environment:** `docker-compose.yml` + `docker-compose.dev.yml`; `BASE_URL=http://127.0.0.1:4202`; branch `development` @ `5a4c0ec2`. Docker daemon was initially down; started Docker Desktop, stack came up on port 4202. Local owner login: `ralf@roeber.de` (repo `.env` `DEMO_LOGIN_*` returned 401 — password stale; set temporary local test password for verification only, not committed).

3. **What was tested:** Backend pricing unit tests; frontend build logs; pricing helper Garnishes UI (simulate mode, preview update, Use this price, extra fixed + garnishes); optional landing/sidebar smoke.

4. **Results:**
   - **Backend pytest `test_pricing_service.py`:** **PASS** — `10 passed in 0.06s`, including `test_garnish_costs_summed_via_extra_fixed`.
   - **Frontend build (no TS/Angular errors):** **PASS** — `docker logs --since 10m pos-front | grep -iE 'error|TS[0-9]+|failed'` returned no matches; bundle completed at 2026-06-19T10:04:46Z.
   - **Garnishes section visible (Ice, Lemon, Other):** **PASS** — `#ph-garnish-ice`, `#ph-garnish-lemon`, `#ph-garnish-other` present above pricing strategy.
   - **Garnish inputs update preview:** **PASS** — ice 0.05 + lemon 0.10 raised cost per serving 0.50→0.65 and suggested price 1.50→2.00 (container simulator).
   - **Use this price applies to product form:** **PASS** — dialog closed; product price field set to 2.00 (matched suggested).
   - **Extra fixed cost + garnishes combined:** **PASS** — garnish 0.15 + extra 0.05 → combined cost per serving 0.70 vs baseline 0.50.
   - **Landing smoke (optional):** **PASS** — `npm run test:landing-version` with valid tenant-1 owner credentials: landing version OK, login OK, 16 sidebar + 5 inventory links OK.

5. **Overall:** **PASS**

6. **Product owner feedback:** The Garnishes block is visible and compact, and per-serving ice/lemon/other costs flow into suggested pricing without exposing backend details. Combined with the existing Extra fixed cost under More options, operators can model full drink economics in one place. Ready to ship.

7. **URLs tested:**
   1. http://127.0.0.1:4202/
   2. http://127.0.0.1:4202/login?tenant=1
   3. http://127.0.0.1:4202/dashboard
   4. http://127.0.0.1:4202/products
   5. http://127.0.0.1:4202/my-shift
   6. http://127.0.0.1:4202/staff/orders
   7. http://127.0.0.1:4202/reservations
   8. http://127.0.0.1:4202/guest-feedback
   9. http://127.0.0.1:4202/tables
   10. http://127.0.0.1:4202/kitchen
   11. http://127.0.0.1:4202/bar
   12. http://127.0.0.1:4202/customers
   13. http://127.0.0.1:4202/catalog
   14. http://127.0.0.1:4202/reports
   15. http://127.0.0.1:4202/working-plan
   16. http://127.0.0.1:4202/users
   17. http://127.0.0.1:4202/contracts
   18. http://127.0.0.1:4202/settings
   19. http://127.0.0.1:4202/inventory/items
   20. http://127.0.0.1:4202/inventory/suppliers
   21. http://127.0.0.1:4202/inventory/purchase-orders
   22. http://127.0.0.1:4202/inventory/stock
   23. http://127.0.0.1:4202/inventory/reports

8. **Relevant log excerpts:**
   ```
   # pos-front (2026-06-19T10:04:46Z)
   Application bundle generation complete. [8.919 seconds] - 2026-06-19T10:04:46.094Z
   Watch mode enabled. Watching for file changes...

   # pos-back — pricing API during UI smoke
   INFO: POST /pricing/simulate HTTP/1.1" 200 OK
   INFO: GET /pricing/product/878/suggest?target_pour_cost_pct=30&rounding_step_cents=50 HTTP/1.1" 200 OK
   ```
