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
