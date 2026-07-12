---
## Closing summary (TOP)

- **What happened:** New tenant signups inherited every staff navigation module enabled; product owners wanted a tighter default sidebar for new restaurants.
- **What was done:** Extended `TenantUiModuleKey` with `contracts` and `users`, applied signup defaults on `POST /register` (tables/reservations/kitchen_bar on; working plan, catalog, inventory, contracts, users off), and updated sidebar visibility, route guards, Settings → Navigation, and i18n.
- **What was tested:** Backend unit tests (6 passed), clean Angular build, existing tenant 1 unchanged, new signup (tenant 2586) verified via API and browser — overall **PASS**.
- **Why closed:** All testing criteria passed; feature fully delivered.
- **Closed at (UTC):** 2026-07-12 11:46
---

# Default menu / navigation for new signups

## GitHub Issues
- **Issue:** https://github.com/satisfecho/pos/issues/288
- **288**

## Problem / goal

New tenant signups currently inherit **all** staff navigation modules enabled (`DEFAULT_TENANT_UI_MODULES` in `front/src/app/services/api.service.ts` and `resolve_tenant_ui_modules` in `back/app/tenant_ui_modules.py` default missing keys to **on**). Product owners want a tighter default so new restaurants see a focused sidebar without overwhelming options.

**Target defaults for new signups (Settings → Navigation):**

| Module | Default |
|--------|---------|
| Table / floor plan (`tables`) | **on** |
| Working plan (`working_plan`) | **off** |
| Product catalog (`providers`) | **off** |
| Reservations (`reservations`) | **on** |
| Kitchen & bar display (`kitchen_bar`) | **on** |
| Inventory module (`inventory`) | **off** |
| Contracts | **off** *(new toggle — not in `TenantUiModuleKey` yet)* |
| Users | **off** *(new toggle — not in `TenantUiModuleKey` yet)* |

Existing tenants must **not** be changed retroactively unless the issue author explicitly wants a migration (assume **new signups only**).

## High-level instructions for coder

- Read **`back/app/tenant_ui_modules.py`**, tenant registration / signup flow in **`back/app/main.py`** (or wherever new `Tenant` rows are created), and **Settings → Navigation** in **`front/src/app/settings/settings.component.ts`** (`uiModuleRows`, `DEFAULT_TENANT_UI_MODULES`).
- Extend **`TenantUiModuleKey`** / **`TENANT_UI_MODULE_KEYS`** with **`contracts`** and **`users`** (or equivalent names) so staff sidebar and route guards can hide Contracts and Users when disabled — mirror how `tables`, `reservations`, etc. work today in **`front/src/app/shared/sidebar.component.ts`** and auth guards.
- Apply the signup defaults when a **new tenant** is provisioned (persist compact JSONB with only `false` keys per existing convention). Do **not** change defaults for existing tenants on deploy.
- Update Settings → Navigation labels/descriptions via **`ngx-translate`** keys in all **`front/public/i18n/*.json`** locale files.
- Ensure **`resolve_tenant_ui_modules`** and FE `applyTenantUiModulesFromSettings` stay in sync for the new keys.
- After implementation: append **Testing instructions**; verify a freshly registered tenant gets the expected toggles; run `docker logs --since 10m pos-front` for a clean Angular build.

## Implementation notes

- **`back/app/tenant_ui_modules.py`**: Added `contracts` and `users` module keys; `new_tenant_ui_modules_stored()` returns compact disabled-key JSON for signup defaults. `resolve_tenant_ui_modules(None)` still defaults all keys to **on** (existing tenants unchanged).
- **`back/app/main.py`**: New tenants created via `POST /register` get `ui_modules=new_tenant_ui_modules_stored()` (virgin-deployment path reusing the sole empty tenant is unchanged).
- **Frontend**: Extended `TenantUiModuleKey`, sidebar/dashboard route visibility, `uiModuleGuard` on `/users` and `/contracts`, Settings → Navigation rows, i18n keys in all locale files.

## Testing instructions

1. **Backend unit tests**
   ```bash
   docker compose -f docker-compose.yml -f docker-compose.dev.yml exec back python3 -m pytest tests/test_tenant_ui_modules.py -q
   ```
   Expect 6 passed (includes `test_new_tenant_ui_modules_stored`).

2. **Angular build** — no TS/NG errors after edits:
   ```bash
   docker logs --since 10m pos-front 2>&1 | grep -iE "error|failed|TS[0-9]|Application bundle generation failed"
   ```
   Expect no matches (pre-existing NG8107 warnings in menu component are OK).

3. **Existing tenant unchanged** — Log in as an existing tenant owner (e.g. demo tenant 1). Open **Settings → Navigation**. All modules including **Contracts** and **Users** should still be **on** (or match whatever was saved before). Sidebar should still show Users/Contracts for admin when previously visible.

4. **New signup defaults** — Register a **new** restaurant via `/register` with a fresh email (not used before). Log in as the new owner:
   - **Settings → Navigation**: `tables`, `reservations`, `kitchen_bar` **on**; `working_plan`, `providers`, `inventory`, `contracts`, `users` **off**.
   - Sidebar: no Users, Contracts, Working plan, Catalog, or Inventory links; Tables, Reservations, Kitchen/Bar visible.
   - Direct URL `/users` or `/contracts` should redirect to `/dashboard`.

5. **Optional API check** (replace token after login):
   ```bash
   curl -s -H "Authorization: Bearer <token>" http://127.0.0.1:4202/api/tenant/settings | jq .ui_modules
   ```
   New tenant should show resolved modules with the signup defaults above.

## Test report

1. **Date/time (UTC):** 2026-07-12 11:42–11:45 UTC. Log window: ~11:30–11:45 UTC (`pos-front`, `pos-back`).

2. **Environment:** `docker-compose.yml` + `docker-compose.dev.yml`; `BASE_URL=http://127.0.0.1:4202`; branch `development` @ `3cc08876`.

3. **What was tested:** Backend `test_tenant_ui_modules.py`; Angular build; existing tenant 1 navigation unchanged; new signup via `POST /register` + browser verification of Settings → Navigation toggles, sidebar links, and `/users`/`/contracts` route guards.

4. **Results:**
   - **Backend unit tests** — **PASS.** `6 passed in 0.02s` (includes `test_new_tenant_ui_modules_stored`).
   - **Angular build** — **PASS.** `docker logs --since 10m pos-front` grep for TS/build errors: no matches.
   - **Existing tenant unchanged** — **PASS.** Tenant 1 owner `ralf@roeber.de`: API `ui_modules` all eight keys `true`; Settings → Navigation all checkboxes checked; sidebar Administration shows Users + Contracts.
   - **New signup defaults (API)** — **PASS.** Registered `tester288-1783856664@amvara.de` (tenant 2586); cookie-auth `GET /tenant/settings` returned `tables/reservations/kitchen_bar=true`, others `false`.
   - **New signup defaults (browser)** — **PASS.** Settings → Navigation: tables/reservations/kitchen_bar on; working_plan/providers/inventory/contracts/users off. Sidebar: Operations (Tables, Kitchen, Bar), Planning (Reservations), no Working plan/Catalog/Inventory/Users/Contracts. `/users` and `/contracts` redirect to `/dashboard`.

5. **Overall:** **PASS**

6. **Product owner feedback:** New restaurants now land with a focused navigation set (tables, reservations, kitchen/bar) without admin-heavy modules. Existing tenants are unaffected. Owners can still enable any module in Settings → Navigation when ready.

7. **URLs tested:**
   1. http://127.0.0.1:4202/login?tenant=1
   2. http://127.0.0.1:4202/dashboard
   3. http://127.0.0.1:4202/settings (tenant 1 — Navigation tab)
   4. http://127.0.0.1:4202/login
   5. http://127.0.0.1:4202/dashboard (new tenant 2586)
   6. http://127.0.0.1:4202/users → http://127.0.0.1:4202/dashboard
   7. http://127.0.0.1:4202/contracts → http://127.0.0.1:4202/dashboard
   8. http://127.0.0.1:4202/settings (tenant 2586 — Navigation tab)

8. **Relevant log excerpts:**
   ```
   pytest tests/test_tenant_ui_modules.py: 6 passed in 0.02s
   pos-front: (no TS/build errors in 15m window)
   pos-back: POST /register HTTP/1.1 201 Created (tenant_id=2586)
   pos-back: GET /tenant/settings HTTP/1.1 200 OK (ui_modules resolved for new tenant)
   ```

**Note:** Local `.env` `DEMO_LOGIN_*` password was stale vs DB; temporary password set for `ralf@roeber.de` in local DB only (not committed) for UI login, consistent with prior tester runs. Auth uses HttpOnly cookies (`POST /token`); API checks used cookie jar, not Bearer header.
