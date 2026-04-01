# Floor plan — auto-save layout

## GitHub

- **Issue:** https://github.com/satisfecho/pos/issues/144

## Problem / goal

Staff lose floor-plan work when they forget to click **Save layout**. The UI shows **Unsaved changes** but relies on a manual save. Move toward **debounced auto-save** after meaningful edits so state persists without spamming the API or racing concurrent saves. Keep tenant scoping and existing save/update APIs unless a new contract is truly required.

## High-level instructions for coder

- After meaningful edits (table drag end, join/unjoin, add/delete table, switching floor while dirty, sidebar edits that change layout), schedule a **debounced** save (roughly 300–800 ms after the last change; tune as needed).
- **Deduplicate in-flight work:** if another change arrives while a save is scheduled or in flight, cancel or supersede the older scheduled save so only the **latest** state is persisted.
- Keep **Unsaved changes** (or equivalent) accurate: hide when fully saved; show while debounce is pending or a request is in flight.
- On **navigate away** from the floor-plan route (and optionally `beforeunload` if debounced work is still pending), either **flush** pending saves or **warn**—pick the pattern that matches how this Angular app handles route guards and dirty forms elsewhere.
- Reuse current backend endpoints for layout persistence; do not add new APIs unless unavoidable.
- On save **failure**, show a clear error and retain dirty state so the user can retry.

## Implementation notes (for tester)

- **Auto-save:** Triggered on each **position change while dragging** (debounce resets per move; fires ~550 ms after drag stops). Manual **Save layout** still calls the same flush path.
- **Flush before:** Floor tab change, Join / Unjoin, delete table, join-from-proximity modal confirm, reassign-and-delete.
- **Navigation:** `canDeactivate` on `/tables/canvas` attempts save; if save fails, browser `confirm` with `TABLES.LEAVE_UNSAVED_LAYOUT`. `beforeunload` warning when dirty.
- **Files:** `front/src/app/tables/tables-canvas.component.ts`, `front/src/app/tables/tables-canvas-deactivate.guard.ts`, `front/src/app/app.routes.ts`, `front/public/i18n/*.json` (`TABLES.LEAVE_UNSAVED_LAYOUT`).

## Testing instructions

1. **Stack:** App on e.g. `http://127.0.0.1:4202` (HAProxy dev); staff user with table access (e.g. owner/admin).
2. **Auto-save:** Open **Tables → Floor plan**. Drag a table; within ~1 s after releasing, **Unsaved changes** should clear without clicking **Save layout** (network tab: multiple `PUT /tables/{id}` for tables on the current floor). Drag again during a save: final positions should match the last drag (no stale overwrite).
3. **Floor switch:** Drag a table (dirty), click another **floor** tab: layout should save first, then the floor switches; no stuck state.
4. **Join / Unjoin:** With dirty positions, use **Join** or **Unjoin**: operations should run only after a successful save (or remain blocked if save fails with error banner).
5. **Navigation:** With dirty layout, click **List view** or another sidebar route: save should run; if API errors, confirm dialog should appear; cancel keeps you on canvas.
6. **Regression:** **Save layout** button still works; add table via palette still works (already persisted via API).
7. **i18n:** Optional: switch language and trigger failed-save + leave confirm path; `TABLES.LEAVE_UNSAVED_LAYOUT` should appear localized.
