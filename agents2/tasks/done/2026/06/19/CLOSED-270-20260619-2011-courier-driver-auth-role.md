---
## Closing summary (TOP)

- **What happened:** Issue #270 requested Phase 1 courier/driver auth — a tenant-scoped role, dedicated login and session, minimal courier home, and a secured `courier/me` API on top of existing POS auth (no delivery flows yet).
- **What was done:** Added `courier` to `UserRole` with migration; backend `POST /token?scope=courier` and `GET /courier/me`; frontend `/courier/login`, `/courier` placeholder home, `courierGuard`, and role-aware guards/interceptor/redirects; Courier role in Users for owner/admin provisioning; i18n keys in all locales.
- **What was tested:** All nine testing instructions **PASS** — migration, enum pytest, courier API and 403 for non-courier, frontend login/home/footer links, guard isolation, clean Angular build, HTTP smoke.
- **Why closed:** Test report overall **PASS**; Phase 1 foundation complete and ready for Phase 2 delivery-list work.
- **Closed at (UTC):** 2026-06-19 20:19
---

# Phase 1 — Courier driver auth and role (foundation for delivery app)

## GitHub Issues
- **Issue:** https://github.com/satisfecho/pos/issues/270
- **270**

## Problem / goal

Introduce a **courier/driver** role and dedicated login + session on top of the existing POS multi-tenant auth. After login, show a minimal courier home screen (placeholder is fine). Expose a secured **`courier/me`** API. **Do not** implement order lists or step-by-step delivery flows yet — that is Phase 2/3.

Reuse existing `User` / JWT / tenant patterns (see staff `/login` and provider `/provider/login`); do **not** build a separate auth stack.

## High-level instructions for coder

- Add **`courier`** (or equivalent) to `UserRole` in `back/app/models.py` and ensure DB enum migration handles the new value (follow existing `user_role` / migrate patterns).
- Courier users are **tenant-scoped** (`tenant_id` set, like staff) — not provider-style (`provider_id`). Owners/admins create courier accounts via existing user-management flows or a minimal extension; document the chosen path in testing notes.
- **Backend:** Reuse `/api/token` (OAuth2 password) with role checks where needed. Add **`GET /api/courier/me`** (or `/courier/me` behind API prefix) returning the authenticated courier’s profile + tenant context; reject non-courier roles with 403. Mirror authorization style of `GET /provider/me`.
- **Frontend:** Add **`/courier/login`** route and component (pattern: `provider-login.component.ts`). After successful login, route couriers to a minimal **`/courier`** home (placeholder text + logout is sufficient for Phase 1). Ensure `auth.interceptor` and guards do not send couriers to staff routes or vice versa.
- **i18n:** Add keys for courier login/home in all `front/public/i18n/*.json` locales per project rules.
- **Security:** Preserve tenant scoping on every courier endpoint; no cross-tenant reads. Do not copy secrets or tokens from the issue into code.
- **Out of scope:** Order assignment, delivery step UI, maps, push notifications — defer to later phases/issues.
- **Docs:** Skim `docs/0031-order-customizations-plan.md` and `docs/0032-github-issues-roadmap.md` for delivery roadmap context; no large new doc unless behaviour is non-obvious.
- **Verification:** `docker logs --since 10m pos-front` — no Angular compile errors; smoke login as courier if a test user exists; append **Testing instructions** when implementation is complete.

## Implementation summary

- Added `courier` to `UserRole` + migration `20260619120000_add_courier_role.sql`.
- Backend: `scope=courier` on `POST /token`; `GET /courier/me` via `get_current_courier_user` (403 for non-courier).
- Frontend: `/courier/login`, `/courier` home placeholder, `courierGuard`, role-aware `authGuard` / `auth.interceptor` / login redirects.
- Owners/admins can assign **Courier** role in **Users** (`/users`).

## Testing instructions

1. **Migrate:** `docker compose -f docker-compose.yml -f docker-compose.dev.yml exec back python -m app.migrate` (applies `20260619120000_add_courier_role.sql`).
2. **Backend enum test:** `docker compose -f docker-compose.yml -f docker-compose.dev.yml exec back python3 -m pytest tests/test_user_role_pg_enum.py -q` → expect **1 passed**.
3. **Create courier user (owner/admin):** Log in as tenant owner → **Users** → **Add user** → role **Courier** → save.  
   Or seed for tenant 1:  
   `docker compose exec back python3 -c "..."` (see commit) / use email `courier-test-phase1@amvara.de` password `secret` if seeded in dev.
4. **Courier login API:**  
   `curl -c /tmp/cj -b /tmp/cj -X POST 'http://127.0.0.1:4202/api/token?scope=courier' -H 'Content-Type: application/x-www-form-urlencoded' -d 'username=courier-test-phase1@amvara.de&password=secret'`  
   then `curl -b /tmp/cj http://127.0.0.1:4202/api/courier/me` → JSON with `role: courier`, `tenant_id`, `tenant_name`.
5. **Non-courier rejected:** Log in as staff, call `GET /api/courier/me` → **403** (or **401** if session invalid).
6. **Frontend:** Open `http://127.0.0.1:4202/courier/login` → sign in as courier → lands on `/courier` placeholder with logout. Footer links on `/` and `/login` include **Courier login**.
7. **Guard isolation:** While logged in as courier, navigate to `/dashboard` → redirected to `/courier`. Staff user cannot access `/courier` (redirect to `/courier/login`).
8. **Build:** `docker logs --since 10m pos-front | grep -iE 'error|failed'` → no TS/NG compile errors; expect `Application bundle generation complete`.
9. **Smoke:** `curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:4202/` → **200**; `curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:4202/courier/login` → **200**.

---

## Test report

1. **Date/time (UTC):** 2026-06-19 20:11–20:19 UTC (log window for container evidence).
2. **Environment:** `docker-compose.yml` + `docker-compose.dev.yml`; `BASE_URL=http://127.0.0.1:4202`; branch `development` @ `f193cd82`.
3. **What was tested:** All nine **Testing instructions** (migration, enum pytest, courier user provisioning, courier API, non-courier 403, frontend login/home/footer links, guard isolation, Angular build, HTTP smoke).

### Results

| # | Criterion | Result | Evidence |
|---|-----------|--------|----------|
| 1 | DB migration applies courier role | **PASS** | `python -m app.migrate` → schema version **20260619120000** (already applied). |
| 2 | `test_user_role_pg_enum.py` | **PASS** | `1 passed in 2.27s`. |
| 3 | Courier user creatable / exists | **PASS** | User `courier-test-phase1@amvara.de` (id 1859, tenant 1) listed on `/users` as **Courier**; **Add User** role dropdown includes **Courier**. |
| 4 | Courier login API + `/courier/me` | **PASS** | `POST /api/token?scope=courier` → 200; `GET /api/courier/me` → `{"role":"courier","tenant_id":1,"tenant_name":"Cobalto",…}`. |
| 5 | Non-courier rejected on `/courier/me` | **PASS** | Waiter JWT (`ralf.roeber@amvara.de`) → **403** `Courier account required`; unauthenticated → **401**. |
| 6 | Frontend courier login + footer links | **PASS** | Browser: `/courier/login` → sign-in → `/courier` shows **Log out**, profile, placeholder; `/` and `/login?tenant=1` footers include **Courier login**. |
| 7 | Guard isolation | **PASS** | Courier session: `/dashboard` → `/courier`. Owner session: `/courier` → `/courier/login`. |
| 8 | Angular build clean | **PASS** | Transient TS2741 (`permission.service` missing `courier`) at ~20:14 UTC during incremental rebuild; resolved by ~20:14:31; subsequent logs show **Application bundle generation complete** with no TS/NG errors in the final window. |
| 9 | HTTP smoke 200 | **PASS** | `/` → 200; `/courier/login` → 200; landing Puppeteer smoke OK. |

**Overall: PASS**

**Product owner feedback:** Phase 1 courier auth is in good shape for local dev: dedicated login, tenant-scoped session, secured profile API, and route guards keep couriers off staff pages (and vice versa). The Users screen already exposes the Courier role for owner/admin provisioning. Ready for Phase 2 delivery-list work; no production/amvara9 deploy was in scope for this task.

### URLs tested

1. http://127.0.0.1:4202/
2. http://127.0.0.1:4202/login?tenant=1
3. http://127.0.0.1:4202/courier/login
4. http://127.0.0.1:4202/courier
5. http://127.0.0.1:4202/dashboard
6. http://127.0.0.1:4202/users

### Relevant log excerpts

**pos-back (courier API):**
```
INFO: "POST /token?scope=courier HTTP/1.1" 200 OK
INFO: "GET /courier/me HTTP/1.1" 200 OK
INFO: "GET /courier/me HTTP/1.1" 403 Forbidden
```

**pos-front (build):**
```
Application bundle generation complete. [0.305 seconds] - 2026-06-19T20:14:31.042Z
Application bundle generation complete. [0.320 seconds] - 2026-06-19T20:14:33.726Z
```
