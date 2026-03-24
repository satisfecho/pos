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
