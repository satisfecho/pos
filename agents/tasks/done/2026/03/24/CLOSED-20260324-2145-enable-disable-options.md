---
## Closing summary (TOP)

- **What happened:** Issue #72 asked for tenant-configurable visibility of major UI areas (tables, working plan, providers, etc.) so unused modules disappear from the dashboard and sidebar.
- **What was done:** Shipped `tenant.ui_modules` (JSONB, disabled keys only), full boolean map on `GET`/`PUT` `/tenant/settings`, Settings → Navigation toggles, `uiModuleGuard` redirect for disabled deep links, and en/es/de strings; backend helper + migration and focused pytest coverage.
- **What was tested:** Tester reported **PASS**: `tests/test_tenant_ui_modules.py`, clean Angular build, `test:landing-version`, and Puppeteer/manual toggle and redirect checks on port 4202.
- **Why closed:** Test report overall **PASS**; product goal and testing instructions satisfied.
- **Closed at (UTC):** 2026-03-24 22:45
---

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

---

## Test report

1. **Date/time (UTC) and log window:** Started **2026-03-24 22:15 UTC**; finished **2026-03-24 22:21 UTC**. Evidence gathered from container logs and commands in that window.

2. **Environment:** `docker compose -f docker-compose.yml -f docker-compose.dev.yml`; **`BASE_URL`** `http://127.0.0.1:4202` (HAProxy); git branch **`development`**.

3. **What was tested:** Per **Testing instructions**: persistence/API resolution (pytest + authenticated `GET /api/tenant/settings`); Settings → Navigation save; sidebar and dashboard hide `/tables` when module off; direct `/tables` → `/dashboard`; re-enable restores `/tables`; smoke with all modules on (`test:landing-version`).

4. **Results:**
   - **Pytest `tests/test_tenant_ui_modules.py`:** **PASS** — `5 passed in 0.01s`.
   - **Angular build (front container):** **PASS** — last lines show `Application bundle generation complete` with no TS/NG errors in `--tail=80 front`.
   - **Smoke `npm run test:landing-version` (default modules on):** **PASS** — exit 0; demo login + sidebar nav OK.
   - **Manual/automation (Puppeteer, tenant 1 admin, repo `.env` creds):** **PASS** — toggle off **Tables** → save → no `a.nav-link` to `/tables`; no any `a[href]` to `/tables` on `/dashboard`; navigate to `/tables` ends on `/dashboard`; `fetch('/api/tenant/settings')` returns all six `ui_modules` keys as booleans with `tables: false`; re-enable → save → `/tables` loads.
   - **DB migrations:** **PASS** (implicit) — API and UI accepted `ui_modules` read/write; no migration errors observed.

5. **Overall:** **PASS** (no failed criteria).

6. **Product owner feedback:** Owners can hide unused areas from **Settings → Navigation**; the sidebar and dashboard stay consistent with those choices, and bookmarked routes to disabled modules safely land on the dashboard. The API always exposes a full boolean map so clients do not need to guess defaults.

7. **URLs tested:**
   1. `http://127.0.0.1:4202/`
   2. `http://127.0.0.1:4202/login?tenant=1`
   3. `http://127.0.0.1:4202/dashboard`
   4. `http://127.0.0.1:4202/settings` (Navigation tab)
   5. `http://127.0.0.1:4202/tables` (redirect when disabled; loads when enabled)
   6. Relative `GET /api/tenant/settings` (same origin, session cookie)

8. **Relevant log excerpts (last section):**

```
pos-back | "GET /tenant/settings HTTP/1.1" 200 OK
pos-back | "PUT /tenant/settings HTTP/1.1" 200 OK
pos-back | "GET /tables HTTP/1.1" 200 OK
```

```
pos-front | Application bundle generation complete. [0.519 seconds] - 2026-03-24T22:00:40.923Z
pos-front | Page reload sent to client(s).
```

**GitHub:** Comment posted on **#72** at start and on **PASS**; `gh issue edit --add-label agent:testing` failed (**label not defined** in repo).
