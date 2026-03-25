---
## Closing summary (TOP)

- **What happened:** GitHub issue #75 asked for minimal navigation from the tables floor-plan canvas to that table’s staff orders context (one click instead of hunting the list).
- **What was done:** Selected-table panel on the canvas links to `/staff/orders` with `focusOrder` or `focusTableId`; orders page applies focus (tab, scroll, or history modal) and strips query params via `replaceUrl`; i18n keys added; new Puppeteer `test:tables-canvas-open-orders` and `docs/testing.md` updates.
- **What was tested:** `test:tables-canvas-open-orders` and `test:tables-canvas-view-options` **PASS**; manual check confirmed clean `/staff/orders` URL after focus; no-order-role shortcut hidden per code review (no second test user in env).
- **Why closed:** Tester **Test report** overall **PASS**; criteria met.
- **Closed at (UTC):** 2026-03-24 23:22
---

# Table view > canvas

## GitHub
- **Issue:** https://github.com/satisfecho/pos/issues/75

## Problem / goal
On the tables floor-plan canvas, staff should reach **that table’s order(s)** with **one click** (minimal navigation), instead of hunting through the list or multiple steps.

Related prior work: canvas routing for `/tables/canvas` was fixed under **#71**; this issue is **UX/navigation** from canvas to orders. See **`docs/testing.md`** for `test:tables-canvas-view-options` / `front/scripts/test-tables-canvas-view-options.mjs` if behaviour around canvas changes.

## High-level instructions for coder
- Reproduce: logged-in staff with table access, open `/tables/canvas`, pick a table on the floor plan.
- Design a clear one-click (or single obvious control) path from a **selected / hovered table** on the canvas to the **active order view** for that table (or table’s orders list if multiple).
- Align with existing tables UX (tiles/list/canvas toggles, routing, guards); avoid breaking canvas rendering or `/tables` list.
- Extend or add a focused Puppeteer check if the flow is automatable; smoke the tables area after changes.

## Implementation (coder)
- **Canvas** (`tables-canvas.component.ts`): When a table is selected, the properties panel shows a primary link to `/staff/orders` for users allowed by the same roles as `orderAccessGuard`. If `active_order_id` is set → `?focusOrder=…` (“Open order”); otherwise → `?focusTableId=…` (“Orders for this table”).
- **Orders** (`orders.component.ts`): After each `loadOrders()`, read `focusOrder` / `focusTableId` from the URL; switch to the appropriate tab (active / not paid / history), scroll to the order card when it exists, or open the edit modal for history-only orders; then strip query params with `replaceUrl`.
- **i18n:** `TABLES.OPEN_STAFF_ORDER`, `TABLES.VIEW_TABLE_ORDERS`, `ORDERS.FOCUS_TABLE_NO_ORDERS` (en + de).
- **Puppeteer:** `front/scripts/test-tables-canvas-open-orders.mjs`, npm script `test:tables-canvas-open-orders`; documented in `docs/testing.md`.

## Testing instructions
1. Stack up (e.g. Docker HAProxy on 4202). `.env` with `DEMO_LOGIN_EMAIL` / `DEMO_LOGIN_PASSWORD` (or `LOGIN_*`), tenant **1**, demo tables seeded.
2. `npm run test:tables-canvas-open-orders --prefix front` (optional: `BASE_URL=http://127.0.0.1:4202 HEADLESS=1`).
3. `npm run test:tables-canvas-view-options --prefix front` (regression: view toggles).
4. Manual: `/tables/canvas` → click a table → use **Open order** / **Orders for this table** → confirm `/staff/orders` opens, correct tab, scroll or edit modal; URL should not keep `focusOrder` / `focusTableId` after load.
5. Role without `/staff/orders` access: floor-plan panel must **not** show the orders shortcut.

---

## Test report

1. **Date/time (UTC):** 2026-03-24 23:12–23:20 UTC (verification window). Log window: same (compose services up; `pos-front` / `pos-back` traffic during Puppeteer runs).

2. **Environment:** `docker-compose.yml` + `docker-compose.dev.yml`; `BASE_URL=http://127.0.0.1:4202`; `HEADLESS=1`; credentials from repo `.env` (`LOGIN_*` / `DEMO_*`); branch **development**, commit **13f455f**; tenant **1**; demo tables present (canvas `g.table-group` clickable).

3. **What was tested:** Task **Testing instructions** §1–5 (stack, both npm Puppeteer scripts, manual navigation + URL strip, restricted-role behaviour).

4. **Results**
   - §1 Stack + seeded data: **PASS** — HAProxy 4202, services healthy; login and canvas tests succeeded.
   - §2 `test:tables-canvas-open-orders`: **PASS** — exit 0; link `href` contained `staff/orders` and `focusTableId=9` for selected table.
   - §3 `test:tables-canvas-view-options`: **PASS** — exit 0; Floor plan ↔ Tiles ↔ Table flow OK.
   - §4 Manual navigation + URL cleanup: **PASS** — one-off Puppeteer flow: login → `/tables/canvas` → select table → click orders shortcut → final URL `http://127.0.0.1:4202/staff/orders` with **no** `focusOrder` / `focusTableId` query string.
   - §5 No shortcut without order access: **PASS (implementation review)** — E2E not run: no second account in env without order-capable role; `/tables/canvas` uses `adminGuard` (owner/admin). Template wraps shortcuts in `@if (canOpenStaffOrders())`; `STAFF_ORDERS_ROLES` matches `orderAccessGuard` roles (`owner`, `admin`, `kitchen`, `bartender`, `waiter`, `receptionist`). Evidence: `tables-canvas.component.ts` lines 21–29, 486–506, 1585–1588.

5. **Overall:** **PASS** (all criteria satisfied; §5 by code alignment + note on E2E gap).

6. **Product owner feedback:** Staff can jump from the floor plan to the right staff orders context in one click, and the address bar returns to a clean `/staff/orders` URL after focus handling. Automated tests cover the link and view toggles; consider a dedicated non-order test user if you want a hard E2E proof of the hidden shortcut.

7. **URLs tested**
   1. `http://127.0.0.1:4202/login?tenant=1`
   2. `http://127.0.0.1:4202/tables/canvas`
   3. `http://127.0.0.1:4202/staff/orders?focusTableId=9` (transient, before strip)
   4. `http://127.0.0.1:4202/staff/orders` (final after load)

8. **Relevant log excerpts**
   - `pos-front` (build healthy during run): `Application bundle generation complete. [0.717 seconds] - 2026-03-24T23:15:12.818Z`
   - `pos-back` (sample during session): `GET /tables/with-status HTTP/1.1" 200 OK`, `GET /users/me HTTP/1.1" 200 OK`
   - Puppeteer stdout: `OK: Canvas table selection exposes staff orders link: /staff/orders?focusTableId=9`; view-options script ended `>>> RESULT: Tables canvas view-options test passed (...)`; inline navigation check: `PASS: no focus* query params in URL`.
