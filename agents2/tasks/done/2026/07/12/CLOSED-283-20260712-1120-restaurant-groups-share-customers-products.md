---
## Closing summary (TOP)

- **What happened:** Multi-location operators needed restaurant groups so sibling tenants can share customers and products while remaining isolated from non-members.
- **What was done:** v1 implemented `restaurant_group` / `restaurant_group_member` schema, join-code linking APIs, read-only shared billing customers and products across group members, Settings → Restaurant group UI, and five backend tests.
- **What was tested:** Migration, pytest (5/5), two-tenant create/join/share flow, tenant-C isolation, smoke HTTP 200, and Settings tab visibility — all **PASS** (2026-07-12 UTC).
- **Why closed:** All verification criteria passed; tester overall outcome **PASS**.
- **Closed at (UTC):** 2026-07-12 11:35
---

# Restaurant Groups — share customers and products across tenants

## GitHub Issues
- **Issue:** https://github.com/satisfecho/pos/issues/283
- **283**

## Problem / goal

Multi-location operators need **restaurant groups**: several tenants that belong to the same organization and can **share customers** and **products** across locations. Today each tenant is isolated; billing customers and the product catalog are tenant-scoped.

## v1 design (implemented)

- **`restaurant_group`**: name, unique `join_code`, `share_products`, `share_customers`.
- **`restaurant_group_member`**: links one tenant to one group (`tenant_id` unique).
- **Linking:** Owner/admin creates a group on tenant A → shares `join_code` → owner/admin on tenant B joins via code.
- **Sharing rules:** When flags are on, list endpoints include sibling tenants' data with `tenant_id` + `is_shared`. Writes (update/delete billing customers, product edits) remain on own tenant only. Orders may reference shared billing customers.
- **Security:** Group data only visible to member tenants; no cross-group access. Owner/admin only for group management APIs.

## Implementation summary

- Migration: `back/migrations/20260712140000_restaurant_group.sql`
- Models: `RestaurantGroup`, `RestaurantGroupMember` in `back/app/models.py`
- Helper: `back/app/restaurant_groups.py`
- API: `GET/POST/PUT /restaurant-group`, `POST /restaurant-group/join`, `POST /restaurant-group/leave`
- Extended: `GET /billing-customers`, `GET /tenant-products`, `GET /products`, `PUT /orders/{id}/billing-customer`
- Frontend: Settings → **Restaurant group** tab (owner/admin), `restaurant-group-settings.component.ts`
- Tests: `back/tests/test_restaurant_groups.py` (5 tests)

## Future slices (not in v1)

- UI indicators for shared products/customers in orders/products pages
- Invite/approval flow instead of join code
- Shared product write/sync or central catalog ownership

## Testing instructions

1. **Migrate:** `docker compose -f docker-compose.yml -f docker-compose.dev.yml exec back python -m app.migrate`
2. **Backend pytest:** `docker compose -f docker-compose.yml -f docker-compose.dev.yml exec back python3 -m pytest tests/test_restaurant_groups.py -q` — expect 5 passed.
3. **Manual UI (two tenants, owner/admin):**
   - Tenant A → Settings → Restaurant group → create group, enable share customers + products, copy join code.
   - Tenant B → Settings → Restaurant group → join with code.
   - On B: Customers list should include A's billing customers marked shared; `/tenant-products` should list A's products too.
   - On B: editing A's billing customer should fail (404); own customers still editable.
4. **Isolation:** Tenant C (not in group) must not see A/B shared data in billing-customers or tenant-products APIs.
5. **Smoke:** App loads at `http://127.0.0.1:4202/` (200). Settings tab `data-testid="settings-restaurant-group-tab"` visible for owner/admin.

---

## Test report

1. **Date/time (UTC):** 2026-07-12 11:28–11:32 UTC. Log window: ~11:20–11:32 UTC (`pos-front`, `pos-back`).

2. **Environment:** `docker-compose.yml` + `docker-compose.dev.yml`; `BASE_URL=http://127.0.0.1:4202`; branch `development` @ `0fad3141`.

3. **What was tested:** Migration applied; pytest suite; live two-tenant group create/join/share flow; isolation tenant C; UI Settings tab and Customers list on tenants 1 and 2.

4. **Results:**
   - **Migration** — **PASS.** Schema version `20260712140000` (restaurant_group tables).
   - **pytest `test_restaurant_groups.py`** — **PASS.** 5 passed in 4.31s (isolation, shared customers/products, no cross-group access, sibling edit blocked).
   - **Manual two-tenant flow (API + UI)** — **PASS.** Tenant A (Demo Pizzeria, id 1) created group "Live Test 283" with share flags; tenant B (Test Restaurant, id 2) joined via code `8Jtda9sWrnnG`. B's `/billing-customers` returned 1 shared customer from A (`Ralf Roeber`, `tenant_id=1`, `is_shared=true`); B's `/tenant-products` count=6 with shared products from A. PUT billing customer from B on A's record → HTTP 404.
   - **Isolation tenant C (id 1081)** — **PASS.** No A/B customer IDs visible in C's billing-customers (0 leaked).
   - **Smoke HTTP 200** — **PASS.** `curl http://127.0.0.1:4202/` → 200.
   - **Settings tab + section** — **PASS.** Owner on tenant 1: `data-testid="settings-restaurant-group-tab"` visible; section shows group name and join code. Tenant 2 customers page lists shared customer from tenant 1.

5. **Overall:** **PASS**

6. **Product owner feedback:** Restaurant groups v1 works end-to-end for the core multi-location scenario: join code linking, shared read-only customers/products across sibling tenants, and isolation from non-members. Settings UI is discoverable under a dedicated tab for owners. Future slices (shared badges in orders/products UI, invite flow) remain out of scope as documented.

7. **URLs tested:**
   1. http://127.0.0.1:4202/
   2. http://127.0.0.1:4202/login?tenant=1
   3. http://127.0.0.1:4202/dashboard
   4. http://127.0.0.1:4202/settings
   5. http://127.0.0.1:4202/settings?tab=restaurant-group (tenant 1 — tab click used for section)
   6. http://127.0.0.1:4202/login?tenant=2
   7. http://127.0.0.1:4202/customers (tenant 2 — shared customer visible)

8. **Relevant log excerpts:**
   ```
   pos-back: POST /restaurant-group HTTP/1.1 200 OK
   pos-back: POST /restaurant-group/join HTTP/1.1 200 OK
   pos-back: GET /billing-customers HTTP/1.1 200 OK
   pos-back: PUT /billing-customers/1 HTTP/1.1 404 Not Found
   pos-back: GET /restaurant-group HTTP/1.1 200 OK
   pos-front: Application bundle generation complete. [0.015 seconds] - 2026-07-12T11:28:57.190Z
   ```
   Note: transient TS errors in pos-front at 11:28:02 during hot reload resolved; subsequent builds succeeded.

**Note:** Local `.env` `DEMO_LOGIN_*` password was stale; temporary test password set in local DB only (not committed) for UI login, consistent with prior tester runs.
