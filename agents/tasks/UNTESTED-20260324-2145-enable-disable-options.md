# Enable + Disable Options

## GitHub
- **Issue:** https://github.com/satisfecho/pos/issues/72

## Problem / goal
Tenants want a cleaner dashboard and sidebar by **hiding modules they do not use** (e.g. tables, shift/working plan, providers). Settings should let an owner toggle which areas are enabled; disabled areas disappear from **dashboard** and **sidebar** navigation (and likely route access / deep links behaviour should be defined—e.g. redirect or 404).

## High-level instructions for coder
- Define a clear product model: which features are toggleable (tables, working plan, providers, …) and defaults for new/existing tenants.
- Persist toggles (likely tenant settings / JSON field or columns); expose via existing `GET/PUT /tenant/settings` or dedicated API as appropriate.
- Frontend: settings UI to enable/disable each option; centralise nav + dashboard tile generation so hidden items are not rendered; decide guard behaviour for direct URLs to disabled features.
- Add or extend i18n for new settings labels; smoke-test main roles after toggles change.
- Coordinate with **`docs/`** if behaviour is user-facing (navigation contract).

## Coder implementation notes (2026-03-24 UTC)

- **Persistence:** `tenant.ui_modules` JSONB — only **disabled** module keys are stored; omitted keys mean **enabled**. Keys: `tables`, `working_plan`, `providers`, `reservations`, `kitchen_bar`, `inventory`. Migration `back/migrations/20260324220000_tenant_ui_modules.sql`; helper `back/app/tenant_ui_modules.py`.
- **API:** `GET`/`PUT` `/tenant/settings` includes a fully resolved `ui_modules` map (all keys booleans) for the client; `TenantUpdate.ui_modules` accepts a partial patch on save.
- **Frontend:** Settings tab **Navigation** with toggles; `uiModuleGuard` sends users to `/dashboard` when a disabled route is opened directly; sidebar and dashboard tiles use `ApiService.isUiModuleEnabled`; kitchen-stations and providers settings tabs are hidden when `kitchen_bar` / `providers` is off. i18n: **en**, **es**, **de** (`SETTINGS.UI_MODULE_*`, `SETTINGS.NAVIGATION_UI_TAB`).

### Testing instructions

- **What to verify:** Saving toggles updates DB and UI; disabled modules are absent from sidebar and dashboard; visiting a disabled path (e.g. `/tables`) redirects to `/dashboard`; re-enabling restores access; `GET /tenant/settings` always returns all six `ui_modules` keys.
- **How to test:** Apply migrations (`python -m app.migrate` in `back`). Backend: `docker compose -f docker-compose.yml -f docker-compose.dev.yml exec -T back python3 -m pytest tests/test_tenant_ui_modules.py -q`. Frontend: with app on **4202**, log in as tenant admin, open **Settings → Navigation**, turn off e.g. **Tables & floor plan**, save, confirm no Tables link and `/tables` → dashboard; turn back on and confirm `/tables` loads. Smoke (all modules default on): `BASE_URL=http://127.0.0.1:4202 npm run test:landing-version --prefix front`.
- **Pass / fail:** Pytest green; Angular build clean (`docker compose … logs --tail=80 front`); manual toggle flow behaves as above; smoke test passes with default tenant (all modules enabled).
