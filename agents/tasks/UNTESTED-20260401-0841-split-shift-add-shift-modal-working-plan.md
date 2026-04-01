# Split shift logic for "Add Shift" modal (Working Plan)

## GitHub

- **Issue:** https://github.com/satisfecho/pos/issues/135

## Problem / goal

In **Working plan**, the **Add Shift** modal should support **split shifts** (two time blocks on the same day): optional split mode, a second start/end pair when enabled, validation that the second block starts after the first block ends, correct **total hours** for monthly/yearly views, and the **day timeline** showing **two separate blocks** for the same employee on that day (see issue for UI labels and bilingual checkbox text).

## High-level instructions for coder

- Add a **checkbox** below **Use any hour**, labeled **Split Shift? / ¿Turno partido?** (per issue).
- **Default:** one **Start time** / **End time** pair (first block). **When split is checked:** show a **second** start/end pair; use clear labels for block 1 vs block 2 (e.g. morning/evening or Shift A / Shift B as in the issue).
- **Validation:** second block **start** must be **strictly after** first block **end**; surface clear validation errors in the modal.
- **Totals:** monthly/yearly (and any related reports) must **sum both blocks** for duration.
- **Working Plan visualization:** same-day row shows **two distinct blocks** on the timeline for that shift day, not a single merged span.

## Implementation summary

- **Add Shift** (create only): optional **Split shift?** checkbox below **Use any hour**; **Shift A / Shift B** labels and a second start/end pair. Saving creates **two** `/schedule` rows (same user, date, label) so planned minutes, compliance, Excel export, week list, and calendar lines all reflect **both** blocks without backend schema changes.
- **Edit shift** still edits a **single** row (split UI hidden).
- If the second `POST /schedule` fails after the first succeeds, the first shift is **deleted** to avoid a half-applied split; rare failure if delete also fails is surfaced via `WORKING_PLAN.SPLIT_ROLLBACK_FAILED`.

## Testing instructions

1. With stack up and `schedule:write`, open **Working plan** → **Add shift**.
2. Enable **Split shift?**, set block A (e.g. 09:00–14:00) and block B (e.g. 16:00–20:00); save. Confirm **two** lines for that day in **Calendar** view and **two** cards in **Week** view for the same person.
3. Confirm **Planned vs clocked** planned minutes for that day **sum** both blocks (same user/date row).
4. Try validation: second block start **not** after first end → modal error; first block ending at 23:30 with no room for block B → `SPLIT_ERR_NO_ROOM` / empty second start options.
5. Optional: `cd front && BASE_URL=http://127.0.0.1:4202 LOGIN_EMAIL=… LOGIN_PASSWORD=… npm run test:working-plan` (and/or `test:working-plan-calendar`) when credentials and app are available.
