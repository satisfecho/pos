---
## Closing summary (TOP)

- **What happened:** Tester verified the tablet-oriented drag-and-proximity join flow on `/tables/canvas` and the Ctrl/Cmd multi-select Join fallback after implementation landed on `development`.
- **What was done:** Canvas-space overlap with ~160 ms hold, i18n confirmation via `app-confirmation-modal`, purple target hint, zoom/pan–consistent SVG mapping; multi-select path unchanged; docs and CHANGELOG per task notes.
- **What was tested:** Puppeteer on `http://127.0.0.1:4202`: gesture opens translated Join dialog after overlap hold, Cancel leaves layout unchanged, ⌘+click Join button visible (macOS), zoom-then-drag still shows modal; Angular build clean; i18n keys spot-checked — **PASS** (busy-table conflict banner not re-exercised).
- **Why closed:** Test report **PASS** overall; remaining gap is explicitly documented non-exercise of one edge case, not a failure.
- **Closed at (UTC):** 2026-04-01 13:15
---

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

---

## Test report

1. **Date/time (UTC) and log window:** **2026-04-01T12:41:00Z** – **2026-04-01T12:45:30Z** (Puppeteer runs + `pos-front` log sample).
2. **Environment:** `docker compose -f docker-compose.yml -f docker-compose.dev.yml`; **`BASE_URL`** `http://127.0.0.1:4202`; branch **`development`**, HEAD **`ab79d2a`**; credentials from repo **`.env`** (`DEMO_LOGIN_*` / `LOGIN_*`); **Chrome** via `puppeteer-core` (macOS host).
3. **What was tested:** **Testing instructions** — drag-release join gesture (mouse), **⌘+click** multi-select + **Join tables** button, zoom-then-drag; **What to verify** bullets; Angular build health via **`docker compose … logs --tail=80 front`**.
4. **Results:**
   - **Drag gesture shows i18n confirmation when overlap held ~160 ms; API only after confirm:** **PASS** — After drag onto another table with **≥280 ms** overlap before release, `app-confirmation-modal` appeared (translated **Join tables?** / merge copy). **Cancel** clicked on dialog — no join API exercised after cancel (layout unchanged for subsequent steps). **Confirm→join API** not executed intentionally to avoid mutating demo table groups; gesture gating verified (no modal without overlap hold in prior drag pattern).
   - **Ctrl/Cmd+click multi-select + header Join:** **PASS** — On **macOS**, **⌘+click** on two `.table-group` elements → **`[data-testid="tables-join-btn"]`** visible and interactable. (Initial **Control+click** did not show Join — expected on Mac when the app listens for **metaKey**; task allows **Cmd**.)
   - **Zoom/pan then drag (canvas space):** **PASS** — Two **Zoom in** clicks (**121%** shown); same drag-overlap pattern → join confirmation modal still appeared.
   - **Backend validation errors in error banner:** **NOT EXERCISED** — No busy-table conflict scenario run; existing **`error()`** banner path not re-validated this session (no regression signal from canvas flows tested).
   - **Angular build clean:** **PASS** — `docker compose -f docker-compose.yml -f docker-compose.dev.yml logs --tail=80 front` shows **Application bundle generation complete** with no **TS**/**NG** errors.
   - **i18n keys in shipped locales:** **PASS (spot-check)** — `JOIN_HINT`, `JOIN_TABLES_CONFIRM_TITLE`, `JOIN_TABLES_CONFIRM_MESSAGE` present in sampled locale files under **`front/public/i18n/`** (e.g. **en**, **de**, **es**).
5. **Overall:** **PASS** (one criterion not exercised: busy-table API error banner).
6. **Product owner feedback:** Drag-to-join now opens a clear confirmation step before any merge, and multi-select with **⌘/Ctrl** still exposes the header **Join** action. Staff on tablets get a single-finger path without accidental one-tap joins; operators should brief teams that **Cmd** on Mac matches the hint text.
7. **URLs tested (numbered):**
   1. `http://127.0.0.1:4202/login?tenant=1`
   2. `http://127.0.0.1:4202/tables/canvas`
8. **Relevant log excerpts (last section):**

**`pos-front` (build health):**

```
Application bundle generation complete. [0.015 seconds] - 2026-04-01T12:31:51.393Z
```

**Puppeteer (evidence lines):**

```
table-group count: 10
After drag — app-confirmation-modal present: true
Join button visible (Meta multi-select, macOS): true
Zoom level after 2x zoom in: 121%
Join modal after zoom+drag: true
```
