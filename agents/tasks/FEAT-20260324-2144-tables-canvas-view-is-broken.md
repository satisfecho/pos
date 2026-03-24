# tables > canvas view is broken

## GitHub
- **Issue:** https://github.com/satisfecho/pos/issues/71

## Problem / goal
Visiting `/tables/canvas` (e.g. `http://127.0.0.1:4202/tables/canvas`) redirects to the dashboard instead of showing the floor-plan canvas. Expected: canvas loads; investigate routing, guards, and any redirect rules.

See **`docs/testing.md`** — `test:tables-canvas-view-options` / `front/scripts/test-tables-canvas-view-options.mjs` for the intended Floor plan ↔ Tiles ↔ Table navigation around `/tables/canvas`.

## High-level instructions for coder
- Reproduce locally (Docker HAProxy port, logged-in staff with table access).
- Trace Angular route config and guards for `tables/canvas` vs dashboard default redirect.
- Fix the minimal cause (route order, guard, lazy load failure, or bad link) so `/tables/canvas` renders the canvas component without bouncing to dashboard.
- Run or extend the Puppeteer tables-canvas test if behaviour changes; confirm no regression on `/tables` list/tiles views.
