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
