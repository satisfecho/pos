---
## Closing summary (TOP)

- **What happened:** Staff Tables and Orders navigation was improved so context is preserved, double-click scopes orders to a table, and tablet-style layout controls (sidebar hide, fullscreen) are available.
- **What was done:** Implementation used `TablesAreaPreferenceService` for last sub-view, `StaffPosToolbarComponent` Orders|Tables segment, order table scoping and focus handling, canvas/tiles double-click to `/staff/orders`, and sidebar collapse plus fullscreen toggle with i18n.
- **What was tested:** Tester executed all Testing instructions plus `test:landing-version`, `test:tables-canvas-view-options`, `test:tables-canvas-open-orders`, and `test:tables-page`; overall **PASS**.
- **Why closed:** All criteria in the test report passed; no regressions called out for this scope.
- **Closed at (UTC):** 2026-03-31 10:40
---

# Tables default view

## GitHub

- **Issue:** https://github.com/satisfecho/pos/issues/124

## Problem / goal

Improve the Tables area so navigation preserves context and works better on tablets:

- Remember the last Tables sub-view (e.g. canvas vs list). If the user was on `/tables/canvas`, returning from Orders should land on canvas again, not reset.
- Provide a clear top control to switch between Orders and Tables (copy should follow i18n, e.g. “Pedidos” / “Orders” per language).
- On double-click of a table, scope the UI so the user sees only that table’s order (not a generic mixed view).
- Add a control to hide/show the main sidebar navigation (useful for tablet “fullscreen” style use).
- Add a fullscreen toggle using an icon only (no text on the button); place it where it fits the existing layout.

## High-level instructions for coder

- Persist or restore the last Tables view mode across route changes (Orders ↔ Tables) using existing Angular routing/state patterns; avoid breaking deep links.
- Add the Orders/Tables switcher in the shell/header for this flow and wire translations.
- Define double-click behavior on table entities so order scope filters to that table; align with current order/table models and APIs.
- Implement sidebar visibility toggle and fullscreen toggle (e.g. Fullscreen API or layout-only fullscreen) with accessible icon buttons and mobile/tablet testing.

## Implementation summary

- **`TablesAreaPreferenceService`:** `localStorage` key `pos.tables.area` (`canvas` | `list`); **`entryPath`** drives sidebar Tables link and toolbar “Tables” link. Set on **`/tables`** → list, **`/tables/canvas`** → canvas.
- **`StaffLayoutService`:** `sidebarCollapsed` + **`StaffLayoutService` / `sidebar.component`:** class **`layout--nav-collapsed`** (tablet portrait and up) hides sidebar; main content full width.
- **`StaffPosToolbarComponent`:** Segment **Orders | Tables**, icon-only **sidebar** + **fullscreen** (with `aria-label` / `title` from i18n). Used on orders + both tables views.
- **Orders:** Query **`table`** persists scope; **`tableScopeId`** filters active / not paid / history; banner + **Show all orders**; **`focusTableId` / `focusOrder`** handling keeps **`table`** when appropriate; focus resolution uses **unfiltered** order lists.
- **Double-click:** Canvas SVG table group + tiles **`table-card`** → `/staff/orders?focusTableId=&table=` (same as panel links with `table`).

## Testing instructions

1. With app on **`http://127.0.0.1:4202`** (or your HAProxy port), log in as staff with **Orders** and **Tables** modules.
2. **Last sub-view:** Open **Tables → floor plan** (`/tables/canvas`). Go to **Orders** via toolbar, then **Tables** again → should return to **floor plan** (not only `/tables`). Repeat with **list** (`/tables`) and confirm return to list.
3. **Switcher:** On **Orders** and **Tables** pages, use **Orders | Tables** segment; URLs and highlights should match.
4. **Double-click:** On **floor plan**, double-click a table → **Staff Orders** with banner “Showing orders for …” when `?table=` applies; **Show all orders** clears filter. Repeat on **tiles** view on `/tables`.
5. **Sidebar / fullscreen:** From Orders or Tables (viewport ≥ ~600px), use **hide nav** icon → main sidebar hides; **show nav** restores. Use **fullscreen** icon → document fullscreen; exit again.

**Automated:** `cd front && BASE_URL=http://127.0.0.1:4202 npm run test:landing-version` (passes; touches `/staff/orders` and `/tables`).

---

## Test report

**Date/time (UTC):** 2026-03-31 10:36:36 UTC — 2026-03-31 10:42 UTC (approx. log window for `pos-front` / `pos-back` review).

**Environment:** `docker compose -f docker-compose.yml -f docker-compose.dev.yml`; **`BASE_URL`:** `http://127.0.0.1:4202`; branch **`development`**, commit **`9e239cd`** (local tree at test time). Staff login via repo **`.env`** (`DEMO_LOGIN_*`, tenant **1**).

**What was tested:** Per **Testing instructions** (last sub-view, Orders \| Tables switcher, double-click floor + tiles, sidebar + fullscreen), plus automated scripts from **`docs/testing.md`**.

**Results:**

| Criterion | Result | Evidence |
|-----------|--------|----------|
| Last sub-view: canvas → Orders → Tables returns to `/tables/canvas` | **PASS** | Puppeteer: after toolbar Orders then Tables, final URL `http://127.0.0.1:4202/tables/canvas`. |
| Last sub-view: list `/tables` → Orders → Tables stays list (not canvas) | **PASS** | Final URL `http://127.0.0.1:4202/tables` (path `/tables` without `/canvas`). |
| Switcher: segment active on Orders and Tables routes | **PASS** | `[data-testid="staff-flow-orders-link"]` has `.active` on `/staff/orders`; `[data-testid="staff-flow-tables-link"]` has `.active` on `/tables/canvas`. |
| Double-click floor plan table → scoped staff orders (`table=` / `focusTableId`) | **PASS** | After double-click on `g.table-group`, URL included `table=6`; `test:tables-canvas-open-orders` also reported staff orders link with `table=6`. |
| Double-click tiles `.table-card` → scoped orders | **PASS** | Headless navigation: Tiles view → double-click first card → `http://127.0.0.1:4202/staff/orders?table=6`. |
| Sidebar hide/show (viewport wide) | **PASS** | Click `[data-testid="staff-flow-toggle-sidebar"]`: root `.layout` gains `layout--nav-collapsed` (not `body`); second click removes it. |
| Fullscreen control | **PASS** | `[data-testid="staff-flow-toggle-fullscreen"]` clickable; fullscreen API engaged in headless run (`document.fullscreenElement` set). |
| Automated smoke (`test:landing-version`) | **PASS** | Exit 0; version line `2.0.65 59ca9c0`; nav includes `/staff/orders` and `/tables`. |
| `test:tables-canvas-view-options` | **PASS** | Exit 0; Floor plan ↔ Tiles ↔ Table flow. |
| `test:tables-canvas-open-orders` | **PASS** | Exit 0; canvas selection exposes `/staff/orders?…&table=6`. |
| `test:tables-page` | **PASS** | Exit 0; table data view after toggle; persistence note in script output. |

**Overall:** **PASS** (all criteria above satisfied).

**Product owner feedback:** Tables and Orders now share a clear top switcher with correct active states, and returning from Orders respects the last floor-plan vs list preference. Double-click from both canvas and tiles lands on scoped orders with `table=` in the URL. Sidebar collapse applies to the main `.layout` shell as designed; fullscreen toggle works in automation. No regressions observed in the Puppeteer suite run for this area.

**URLs tested (numbered):**

1. `http://127.0.0.1:4202/`
2. `http://127.0.0.1:4202/login?tenant=1`
3. `http://127.0.0.1:4202/dashboard` (post-login)
4. `http://127.0.0.1:4202/staff/orders`
5. `http://127.0.0.1:4202/tables/canvas`
6. `http://127.0.0.1:4202/tables`
7. `http://127.0.0.1:4202/staff/orders?table=6` (and variants with `focusOrder` / `focusTableId` from scripts)

**Relevant log excerpts (last section):**

- **`pos-front`** (compose): `Application bundle generation complete` during the session; no Angular compile errors in the tailed window (rebuilds from prior edits only).
- **Browser console (landing test):** WebSocket `1008` / “Invalid authentication token” appears during sidebar navigation in some routes — pre-existing noise, did not block navigation or tests.

---

_End of test report._
