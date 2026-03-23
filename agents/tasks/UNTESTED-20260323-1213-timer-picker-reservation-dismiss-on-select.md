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
