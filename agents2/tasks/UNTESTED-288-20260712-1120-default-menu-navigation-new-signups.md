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
