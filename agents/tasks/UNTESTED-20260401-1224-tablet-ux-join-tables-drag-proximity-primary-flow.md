# Tablet UX: Join tables via drag + proximity (primary flow)

## GitHub

- **Issue:** https://github.com/satisfecho/pos/issues/141

## Problem / goal

Refine table join (group) UX so that on tablet/touch the primary path is: select or start dragging a table, drag toward another table until a proximity/overlap threshold in **floor canvas** coordinates (stable with zoom/pan), then show a confirmation (“Join table A and table B?”). On confirm, use existing join/group API; on cancel or moving apart, clear pending state without API calls. Keep multi-select + Join button as fallback for desktop/accessibility. Avoid relying on simultaneous two-finger multi-touch on two tables (browser/OS gesture conflicts). Document one threshold approach (e.g. min distance vs overlap ratio). Optional: debounce before opening dialog; subtle visual hint in the “join zone”; surface backend conflict errors (orders/reservations) in dialog or toast. Add i18n for the modal across shipped locales and a short note in docs or CHANGELOG.

## High-level instructions for coder

- Implement touch/drag + proximity on the tables floor canvas using the same coordinate space as the canvas (account for zoom/pan).
- Reuse existing join/group backend flows; add confirmation modal with full i18n keys.
- Keep non-gesture join path working.
- Document gesture and threshold choice briefly for operators/developers.

## Coder notes (implementation)

- **`front/src/app/tables/tables-canvas.component.ts`:** While dragging a table (mouse or touch), proximity uses **inflated axis-aligned bounding boxes** in SVG canvas coordinates (`width`/`height` centered at `x_position`/`y_position`), with a **24** canvas-unit margin on each side. `getSvgPoint` maps screen → SVG so zoom/pan stay consistent. Candidate target is the **closest** overlapping other table (same floor via `tablesOnCurrentFloor()`, both ungrouped). **~160 ms** minimum overlap with the same candidate before release can open the join dialog (reduces accidental joins). Purple stroke on target table (`.join-proximity-hint`). Confirmation uses `app-confirmation-modal` with `TABLES.JOIN_TABLES_CONFIRM_*` keys and `messageParams` for `{{tableA}}` / `{{tableB}}`. Join errors continue to use the existing banner (`error` signal).
- **i18n:** `JOIN_HINT`, `JOIN_TABLES_CONFIRM_TITLE`, `JOIN_TABLES_CONFIRM_MESSAGE` in all shipped `front/public/i18n/*.json`.
- **Docs:** `docs/0051-table-groups-mvp.md` (gesture + threshold); **CHANGELOG** `[Unreleased]`.

## Testing instructions

### What to verify

- Drag-and-release join gesture (touch + mouse) shows **i18n confirmation** only when two ungrouped tables overlap in canvas space for ~160 ms; **Confirm** calls join and refreshes; **Cancel** leaves tables unchanged (no API).
- **Ctrl/Cmd+click** multi-select + header **Join tables** still works.
- Zoom/pan then drag: proximity still behaves in canvas space (overlap detection uses table positions, not screen pixels alone).
- Backend validation errors (e.g. busy tables) appear in the **error banner** as before.

### How to test

- Stack: `docker compose -f docker-compose.yml -f docker-compose.dev.yml` (app on HAProxy port **4202** by default).
- Log in as staff with table layout access; open **`/tables/canvas`**.
- Place two ungrouped tables on the same floor; drag one onto the other until the target shows **purple highlight**; hold overlap briefly; release → **Join tables?** dialog → confirm or cancel.
- Multi-select with Ctrl/Cmd + **Join tables** without using the gesture.

### Pass/fail

- **Pass:** Gesture modal + API only on confirm; banner on API error; multi-select path unchanged; Angular build clean (`docker compose … logs --tail=80 front` without TS errors).
- **Fail:** Join without confirmation, join when not overlapping, or broken Ctrl/Cmd join.
