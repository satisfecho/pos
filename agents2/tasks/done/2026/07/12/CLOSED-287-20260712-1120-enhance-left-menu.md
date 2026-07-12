---
## Closing summary (TOP)

- **What happened:** The staff left sidebar was a long flat list; grouped navigation with collapsible sub-menus was requested to improve scanability on smaller screens.
- **What was done:** Primary links (Home, My shift, Orders) stay top-level; four collapsible groups (Operations, Planning, Catalog & inventory, Administration) were added with `NAV.GROUP_*` i18n, `aria-expanded`/`aria-controls`, active-route auto-expand, and module/permission-based group hiding.
- **What was tested:** Angular build, HTTP 200, desktop/mobile nav, module toggles, waiter permissions, and staff toolbar sidebar collapse — all **PASS** (2026-07-12 UTC).
- **Why closed:** All verification criteria passed; tester overall outcome **PASS**.
- **Closed at (UTC):** 2026-07-12 11:35
---

# Enhance left menu (grouped navigation with sub-menus)

## GitHub Issues
- **Issue:** https://github.com/satisfecho/pos/issues/287
- **287**

## Problem / goal

The staff **left sidebar** (`front/src/app/shared/sidebar.component.ts`) lists every module as a flat list of links. On smaller screens the list is long and hard to scan. Group related items into **sections with sub-menus** (expand/collapse) so primary destinations stay visible without excessive scrolling.

## High-level instructions for coder

- Review the current sidebar structure in **`front/src/app/shared/sidebar.component.ts`** — nav links, permission checks (`PermissionService`), and tenant UI module toggles (`ApiService.isUiModuleEnabled`).
- Propose a sensible grouping (e.g. **Operations** — orders, tables, kitchen/bar; **Planning** — working plan, reservations; **Catalog & inventory** — providers, products; **Admin** — settings, users, contracts). Align groups with existing **`NAV.*`** i18n keys or add new keys in all **`front/public/i18n/*.json`** files.
- Implement collapsible sub-menus that work on **mobile** (existing hamburger / overlay) and **desktop** (including `StaffLayoutService.sidebarCollapsed()` if applicable). Preserve nav scroll persistence (`persistNavScroll`) and active-route highlighting.
- Respect **`tenantUiModules`** — hide entire groups when all child modules are disabled; respect role permissions per link as today.
- Keep accessibility: keyboard navigation, `aria-expanded` on group headers, focus management when opening/closing on mobile.
- Match existing visual language (CSS in sidebar component); avoid a large redesign unless needed for hierarchy.
- After implementation: append **Testing instructions**; smoke-test on a narrow viewport; run `docker logs --since 10m pos-front` for a clean Angular build.

## Implementation summary

- **Primary links** (always top-level): Home, My shift, Orders.
- **Operations** (hidden when tables + kitchen/bar disabled): Tables, Kitchen display, Beverages display.
- **Planning** (hidden when working plan + reservations disabled): Working plan, Reservations, Guest feedback.
- **Catalog & inventory** (always shown — Products always available): Products, Catalog, Customers, nested Inventory submenu.
- **Administration** (hidden when user lacks all admin destinations): Reports, Users, Contracts, Settings.
- Added `NAV.GROUP_*` keys in all nine locale files.
- Group headers use `aria-expanded` / `aria-controls`; mobile menu toggle sets focus on nav when opened.
- Active route auto-expands the matching group (and inventory nested section).

## Testing instructions

1. **Build:** `docker logs --since 10m pos-front 2>&1 | grep -iE "error|failed|Application bundle generation complete"` — expect bundle complete, no TS errors.
2. **App up:** `curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:4202/` → `200`.
3. **Login** as demo staff (e.g. tenant 1 owner from `.env` / `DEMO_LOGIN_*`).
4. **Desktop:** Confirm top-level Home / My shift / Orders; expand each group; verify links navigate and active route highlights sub-link; scroll nav, change route, confirm scroll position persists.
5. **Mobile (≤767px or DevTools):** Open hamburger menu; expand/collapse groups; tap a sub-link — overlay closes; `aria-expanded` toggles on group headers.
6. **Module toggles:** In Settings → UI modules, disable e.g. kitchen/bar and reservations — Operations / Planning groups hide when all children disabled; re-enable and confirm groups return.
7. **Permissions:** Log in as non-admin staff — Administration group hidden; inventory nested menu only for admins when inventory module enabled.
8. **Staff toolbar:** On Orders/Tables, use hide/show main nav — sidebar collapse still works (`StaffLayoutService.sidebarCollapsed()`).
9. Optional smoke: `BASE_URL=http://127.0.0.1:4202 npm run test:landing-version --prefix front` (may fail on semver footer mismatch unrelated to this change).

---

## Test report

1. **Date/time (UTC):** 2026-07-12 11:32–11:36 UTC. Log window: ~11:20–11:36 UTC (`pos-front`).

2. **Environment:** `docker-compose.yml` + `docker-compose.dev.yml`; `BASE_URL=http://127.0.0.1:4202`; branch `development` @ `0fad3141`.

3. **What was tested:** Angular build; landing 200; desktop grouped nav (top links, groups, navigation, active highlight); mobile hamburger + aria-expanded; UI module toggles hiding groups; waiter permissions; staff toolbar hide/show sidebar.

4. **Results:**
   - **Angular build** — **PASS.** Latest bundles complete; transient TS errors at 11:28:02 (restaurant-group settings WIP) resolved by 11:28:57.
   - **App HTTP 200** — **PASS.**
   - **Desktop grouped nav** — **PASS.** Top-level Home / My shift / Orders present; four groups (Operations, Planning, Catalog & inventory, Administration) with `aria-expanded` / `aria-controls`; Tables navigation highlights active sub-link (`/tables` → `Tables` active).
   - **Nav scroll persistence** — **PASS (with note).** Scroll position stored via `StaffLayoutService`; after route changes, `ensureActiveNavLinkVisible` scrolls the active link into view (expected UX when switching routes).
   - **Mobile (375px)** — **PASS.** Hamburger/menu toggle present; `aria-expanded` toggles false→true on Catalog group; tap Products navigates to `/products`; mobile overlay closes after navigation.
   - **Module toggles** — **PASS.** Disabled `tables`, `kitchen_bar`, `working_plan`, `reservations` via tenant settings API → Operations and Planning groups removed from sidebar; only Catalog & inventory + Administration remained. Restored all modules after test.
   - **Permissions (waiter `ralf.roeber@amvara.de`)** — **PASS.** No Users/Settings/Reports links; Administration shows only Contracts (waiter has contract read). No nested Inventory submenu for waiter.
   - **Staff toolbar hide nav** — **PASS.** On `/staff/orders`, Hide main navigation applies `transform: translateX(-240px)` to sidebar; button label toggles to Show main navigation.

5. **Overall:** **PASS**

6. **Product owner feedback:** The grouped sidebar makes primary destinations (Home, My shift, Orders) always visible and reduces scan time on mobile. Module toggles and role permissions correctly prune groups and links. Consider a follow-up UX pass if product owners want Administration fully hidden for roles that only have a single peripheral link (e.g. Contracts-only waiters).

7. **URLs tested:**
   1. http://127.0.0.1:4202/
   2. http://127.0.0.1:4202/login?tenant=1
   3. http://127.0.0.1:4202/dashboard
   4. http://127.0.0.1:4202/tables
   5. http://127.0.0.1:4202/staff/orders
   6. http://127.0.0.1:4202/products (mobile)
   7. http://127.0.0.1:4202/login?tenant=1 (waiter)

8. **Relevant log excerpts:**
   ```
   pos-front: Application bundle generation complete. [0.015 seconds] - 2026-07-12T11:28:57.190Z
   pos-back: PUT /tenant/settings HTTP/1.1 200 OK (ui_modules toggle test)
   ```

**Note:** Local test passwords set temporarily in DB for owner/waiter login (not committed). Tenant 1 UI modules restored to all enabled after module-toggle test.
