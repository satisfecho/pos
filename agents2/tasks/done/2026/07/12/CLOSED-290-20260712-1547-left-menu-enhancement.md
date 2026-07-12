---
## Closing summary (TOP)

- **What happened:** Issue #290 requested moving the Customer invoice sidebar entry from Planning/Catalog into Operations.
- **What was done:** Moved `NAV.CUSTOMERS` (`/customers`) to the Operations submenu in `sidebar.component.ts`, updated `showOperationsGroup()` to include `canViewCustomers()`, and adjusted route sync so Operations auto-expands on `/customers`.
- **What was tested:** Angular build, app HTTP 200, owner sidebar placement, direct `/customers` auto-expand, and kitchen-role permission hiding — all **PASS** (2026-07-12 UTC).
- **Why closed:** All acceptance criteria and tester verification passed.
- **Closed at (UTC):** 2026-07-12 15:53
---

# Left menu enhancement

## GitHub Issues
- **Issue:** https://github.com/satisfecho/pos/issues/290
- **290**

## Problem / goal

Move the **Customer invoice** staff sidebar entry from **Planificación / Planning** into **Operacions / Operations**, so billing-customer management sits with day-to-day operational tools instead of planning.

The reporter’s labels use Catalan UI group names (`Operacions`, `Planificacion`). In the current tree, the link is **`NAV.CUSTOMERS`** (“Customers (Invoice)”, route **`/customers`**) in `front/src/app/shared/sidebar.component.ts` — verify its present group on **`development`** and relocate it to the **Operations** collapsible section (`nav-group-operations`).

## High-level instructions for coder

- Open **`front/src/app/shared/sidebar.component.ts`** and locate the **`/customers`** nav link (`canViewCustomers()`, **`NAV.CUSTOMERS`**).
- Remove it from its current sidebar group (Planning per issue; Catalog in current code) and add it under the **Operations** submenu alongside Tables / Kitchen / Bar, keeping the same permission guard (`canViewCustomers()`) and route.
- Ensure **`showOperationsGroup()`** still makes sense when only customers is visible (group should appear if customers is the sole operations sub-item).
- Confirm auto-expand logic (`expandNavGroupForUrl` / route matching) opens **Operations** when visiting **`/customers`**.
- No i18n key renames required unless copy should change; keep existing **`NAV.CUSTOMERS`** translations.
- After change: check **`docker logs --since 10m pos-front`** for Angular build errors; smoke-test logged-in sidebar navigation to **`/customers`**.

## Implementation notes

- Moved **`NAV.CUSTOMERS`** (`/customers`) from Catalog submenu to Operations submenu in **`front/src/app/shared/sidebar.component.ts`**.
- **`showOperationsGroup()`** now includes **`canViewCustomers()`** so Operations appears when customers is the only visible sub-item.
- **`syncGroupOpenFromRoute()`** expands Operations (not Catalog) when the route is **`/customers`**.

## Testing instructions

1. **Build:** `docker logs --since 10m pos-front` — confirm no TypeScript/Angular errors (warnings in unrelated files are OK).
2. **App up:** `curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:4202/` → `200`.
3. **Sidebar placement:** Log in as a user with customer-invoice access (e.g. owner/admin with `/customers` permission). Open the staff sidebar:
   - **Operations** group should be visible and expandable.
   - **Customers (Invoice)** / **`NAV.CUSTOMERS`** link should appear under **Operations** (with Tables / Kitchen / Bar when enabled), **not** under Catalog.
4. **Auto-expand:** Navigate directly to **`/customers`** (URL bar or bookmark). Operations section should auto-expand and the customers sub-link should be active.
5. **Permissions:** User without **`canViewCustomers()`** should not see the link; Operations group may still show if other operations items are visible.
6. **Smoke (optional):** `BASE_URL=http://127.0.0.1:4202 LOGIN_EMAIL=… LOGIN_PASSWORD=… node front/scripts/test-settings-logo-upload.mjs` exercises all sidebar routes including **`/customers`**.

---

## Test report

1. **Date/time (UTC):** 2026-07-12 15:49–15:52 UTC. Log window: ~15:45–15:52 UTC (`pos-front`, `pos-back`).

2. **Environment:** `docker-compose.yml` + `docker-compose.dev.yml`; `BASE_URL=http://127.0.0.1:4202`; branch `development` @ `b2ac1267`.

3. **What was tested:** Angular build; landing HTTP 200; owner sidebar placement (Customers under Operations, not Catalog); direct `/customers` auto-expand + active link; kitchen-role permission hiding of Customers link while Operations remains for kitchen/bar.

4. **Results:**
   - **Angular build** — **PASS.** `Application bundle generation complete` at 15:49:12Z; only unrelated `NG8107` warnings in `menu.component.html`.
   - **App HTTP 200** — **PASS.** `curl http://127.0.0.1:4202/` → `200`.
   - **Sidebar placement (owner `ralf@roeber.de`)** — **PASS.** Operations group visible; `#nav-group-operations` contains `/customers` link; `#nav-group-catalog` has no `/customers` link.
   - **Auto-expand on `/customers`** — **PASS.** Direct navigation to `/customers`: Operations `aria-expanded=true`, customers sub-link has `.active`.
   - **Permissions (kitchen `delete-all-kitchen-test@local.test`)** — **PASS.** Operations group still visible (Kitchen display + Beverages display); no Customers link in Operations or Catalog.

5. **Overall:** **PASS**

6. **Product owner feedback:** Customer invoice billing now sits logically under Operations alongside tables and kitchen/bar displays, matching the issue’s Catalan grouping intent. Auto-expand on `/customers` keeps wayfinding clear when staff land via bookmark or deep link. No copy or permission regressions observed.

7. **URLs tested:**
   1. http://127.0.0.1:4202/
   2. http://127.0.0.1:4202/login?tenant=1
   3. http://127.0.0.1:4202/dashboard
   4. http://127.0.0.1:4202/customers
   5. http://127.0.0.1:4202/dashboard (kitchen user)

8. **Relevant log excerpts:**
   ```
   pos-front: Application bundle generation complete. [2.299 seconds] - 2026-07-12T15:49:12.245Z
   pos-back: POST /token?tenant_id=1 HTTP/1.1 200 OK (owner login)
   ```

**Note:** Local test passwords set temporarily via `app.seeds.set_user_password` for owner/kitchen login (not committed).
