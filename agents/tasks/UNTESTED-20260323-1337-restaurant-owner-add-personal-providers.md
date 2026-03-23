# Make restaurant owner add personal providers

## GitHub
- **Issue:** https://github.com/satisfecho/pos/issues/25

## Problem / goal
A restaurant may use a supplier not present in the global/provider catalog. Owners need to **add their own providers** and **link them to products**, including non-menu items (e.g. toilet paper) that are not “on sale” in the usual sense.

## High-level instructions for coder
- Review existing provider catalog, `ProviderProduct`, and owner vs provider roles in `docs/` and code.
- Specify permissions: tenant-scoped custom providers vs platform providers; avoid breaking provider portal assumptions.
- Allow creating/linking tenant-specific provider records and attaching products (including internal or non-sale inventory use cases if applicable).
- Cover listing, edit, and product linkage in API + owner UI; add tests for authorization and data isolation between tenants.

## Coder notes (2026-03-23)
- **Already in repo:** `GET/POST /providers`, `GET/POST /providers/{id}/products` for personal providers (`Provider.tenant_id`); Settings → Providers tab (add provider, add product with optional category / “on sale” = `availability`).
- **This pass:** `PATCH /providers/{id}` for **personal** providers only (`PersonalProviderUpdate` in `models.py`); global providers **403** from this route. Settings UI: **Edit provider** modal (name, URL, phone, email, active). Tests: **`back/tests/test_personal_providers_api.py`** (cross-tenant 404/403, duplicate name 409, global patch 403).

---

## Testing instructions

### What to verify
- Owners/admins can **edit** a personal provider from **Settings → Providers** and changes persist after reload.
- **PATCH** rejects editing catalog (global) providers from the restaurant API; other tenants cannot read, patch, list products, or add products on another tenant’s personal provider.

### How to test
- **Backend (Docker):**  
  `docker compose -f docker-compose.yml -f docker-compose.dev.yml exec -T back python3 -m pytest tests/test_personal_providers_api.py -v`
- **Frontend smoke:** App up on HAProxy (e.g. `http://127.0.0.1:4202`).  
  `BASE_URL=http://127.0.0.1:4202 npm run test:settings-providers --prefix front`  
  (requires `.env` with `DEMO_LOGIN_EMAIL` / `DEMO_LOGIN_PASSWORD` or `LOGIN_*` for tenant 1). Optionally open Settings → Providers and use **Edit provider** on a personal row.
- **General regression:**  
  `BASE_URL=http://127.0.0.1:4202 npm run test:landing-version --prefix front`

### Pass/fail criteria
- All **6** tests in `test_personal_providers_api.py` pass.
- **test:settings-providers** passes; manual check: **Edit provider** opens, save succeeds, list refreshes.
- **test:landing-version** passes; `docker compose … logs --tail=80 front` shows no Angular/TS build errors after changes.
