# Tablet-optimized interactive floor plan (table management)

## GitHub

- **Issue:** https://github.com/satisfecho/pos/issues/120

## Problem / goal

Deliver an interactive **floor plan** for restaurant table management, **optimized for tablets**: dark theme, grid or free-form canvas, touch-first controls, and clear visual status for each table. Tables should show capacity in a compact label (e.g. `T10 - 2`) instead of per-chair icons. Support **merge** and **unmerge/separate** for combined tables with combined capacity shown, and a **legend** mapping colors to operational states (available, open order, bill issued, occupied, reserved). Multi-area navigation (e.g. room vs terrace) and quick actions (e.g. add table/order) should match a professional POS tablet workflow.

See existing **Tables** / canvas work and `docs/` for floor and table models.

## High-level instructions for coder

- Extend or replace the current tables/floor UI toward the layout and interaction model above (drag, tap, merge/split) without breaking existing tenant data flows.
- Implement the **status color legend** and ensure colors/icons align with backend or local state for orders, bills, and reservations where applicable.
- Keep **large tap targets** and responsive layout for tablet breakpoints; verify on touch devices or emulated viewport.
- Wire merge/split to persistent representation (API/model) if not already present; avoid orphan UI-only merges.
- Add or extend smoke/Puppeteer coverage for the floor view if the repo pattern supports it.
