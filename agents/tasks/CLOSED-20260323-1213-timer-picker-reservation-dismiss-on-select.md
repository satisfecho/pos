# Timer picker: dismiss on select, open on input focus (reservations)

## GitHub
- **Issue:** https://github.com/satisfecho/pos/issues/60

## Problem / goal
On **Create reservation**, the time picker stays open after selecting a time; it only appears when clicking the clock icon. Expected: time picker opens when focusing the time input; it closes on blur and when the user confirms/selects a time (consistent with typical datetime UX). See issue screenshot.

## High-level instructions for coder
- Locate reservation create/edit time controls (staff reservations flow); align behavior with Angular Material (or current) time/datetime picker patterns.
- Ensure picker opens on input focus/interaction, not only via icon; close on selection and on focus loss without breaking keyboard/accessibility.
- Manually verify create-reservation flow; add or extend a Puppeteer/smoke path only if one already exists for reservations (`docs/testing.md`).

## Implementation (coder)
- **File:** `front/src/app/reservations/reservations.component.ts` (inline template).
- Staff create/edit uses native `<input type="time">`. Added:
  - `(focus)` → `openNativeTimePicker`: calls `HTMLInputElement.showPicker()` when defined (Chromium/WebKit), try/catch for environments that block programmatic open; keyboard/fallback typing unchanged.
  - `(change)` → `dismissNativeTimePickerAfterCommit`: `blur()` on the input so the native panel closes after the user commits a time (addresses Chromium keeping the popup open).
- Public `/book` flow uses a `<select>` for times — unchanged.

## Testing instructions (tester)
1. Stack up (e.g. HAProxy on `http://127.0.0.1:4202`). Log in as a user with `reservation:write`.
2. Open **Reservations** → **New** (or edit an existing reservation).
3. **Focus time field:** click the time input or Tab to it. In Chromium-based browsers (and others with `showPicker` for `type="time"`), the native time UI should open without relying only on the small clock control.
4. **Pick a time and confirm** (OK / equivalent). The picker should close; slot capacity line should still refresh (`loadSlotCapacity` via `ngModelChange`).
5. **Blur without changing:** focus the time field, then Tab out or click elsewhere — picker should dismiss (browser default + our `change` path only runs on commit).
6. **Regression smoke:** `cd front && BASE_URL=http://127.0.0.1:4202 npm run test:landing-version` (passes with reservations route in nav; coder run: OK).

---

## Test report

1. **Date/time (UTC):** 2026-03-23 ~14:14–14:22 (verification run). **Log window:** `docker compose … logs --since 15m front back` immediately after checks.

2. **Environment:** `docker-compose.yml` + `docker-compose.dev.yml`; **`BASE_URL`** `http://127.0.0.1:4202`; branch **`development`** @ `273c4f0`. Headless Chromium via `puppeteer-core` (host Chrome). Credentials from repo **`.env`** (`LOGIN_*` / `DEMO_LOGIN_*`).

3. **What was tested:** Items 1–6 from **Testing instructions** above; reservation modal time field exercised with automation where possible.

4. **Results**
   - **Stack + login + Reservations → New:** **PASS** — Ephemeral Puppeteer flow opened create modal; user has `reservation:write` (header **New** visible).
   - **Focus time field / `showPicker` support:** **PASS** — In-page `evaluate`: `typeof input.showPicker === 'function'` (Chromium). Programmatic native popup visibility is not asserted in headless; behavior matches coder notes (try/catch if blocked).
   - **Pick time → close + slot capacity:** **PASS** — After `input`+`change` events on `type="time"`, `document.activeElement !==` time input (blur from `dismissNativeTimePickerAfterCommit`); `.slot-capacity` text present, e.g. `Seats left: 8 · Tables left: 2`. Backend: `GET /reservations/slot-capacity?...&time_str=15:45` **200 OK** after prior `15:26` call.
   - **Blur without changing:** **PASS** — `(change)` only blurs on commit (verified in source); focus-away without commit relies on browser default (not separately automated with visible picker this run; no regression observed).
   - **Regression smoke `test:landing-version`:** **PASS** — Exit code 0; `>>> RESULT: Landing version OK; demo login (tenant=1) OK; sidebar nav OK.` (includes `/reservations`).

5. **Overall:** **PASS**

6. **Product owner feedback:** Staff reservation time control now wires native `showPicker` on focus and blurs after a committed time change, which matches the expected desktop Chromium UX and keeps the seats/tables line updating when the time changes. Public booking flow is unchanged. Recommend a quick glance in a normal (non-headless) browser to confirm the native panel opens on focus and closes on Tab away.

7. **URLs tested**
   1. `http://127.0.0.1:4202/login?tenant=1`
   2. `http://127.0.0.1:4202/dashboard` (post-login)
   3. `http://127.0.0.1:4202/reservations`
   4. (Modal) same origin — create reservation dialog with time input

8. **Relevant log excerpts**
   - **pos-back:** `GET /reservations?reservation_date=2026-03-23 HTTP/1.1" 200 OK` … `GET /reservations/slot-capacity?date_str=2026-03-23&time_str=15:26 HTTP/1.1" 200 OK` … `GET /reservations/slot-capacity?date_str=2026-03-23&time_str=15:45 HTTP/1.1" 200 OK`
   - **GitHub:** `gh issue comment 60` failed: `Resource not accessible by personal access token` — labels not updated via CLI this run.

