---
## Closing summary (TOP)

- **What happened:** Tester completed verification of split-shift behavior in the Working plan **Add Shift** modal for GitHub issue #135.
- **What was done:** The feature adds optional split mode with two time blocks, creates two `/schedule` rows on save, validates ordering and same-day room for block B, and shows two distinct blocks in week/calendar; rollback on partial POST failure is documented.
- **What was tested:** Manual checks (calendar lines, week cards, Planned vs clocked totals, `SPLIT_ERR_NO_ROOM`, constrained block B times) plus `npm run test:working-plan` and `npm run test:working-plan-calendar` — all reported **PASS**.
- **Why closed:** All acceptance criteria in the test report passed with overall **PASS**.
- **Closed at (UTC):** 2026-04-01 09:02
---

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

## Test report

1. **Date/time (UTC)** and log window: **2026-04-01** approx. **09:00–09:02 UTC** (verification run). Log excerpts below are from the same session window.

2. **Environment:** `docker-compose.yml` + `docker-compose.dev.yml`; **`BASE_URL`** `http://127.0.0.1:4202` (HAProxy → front). Branch **`development`** (synced via `./scripts/git-sync-development.sh` before edits). Credentials from repo **`.env`** (owner/admin with `schedule:write`).

3. **What was tested** (from Testing instructions + optional scripts): Add Shift split flow with **Use any hour** (needed for morning blocks when venue hours restrict the default time list), **Split shift**, blocks **09:00–14:00** and **16:00–20:00** on **2026-04-22**; Week + Calendar visibility; **Planned vs clocked** planned total for that user/day; **`SPLIT_ERR_NO_ROOM`** when the first block leaves no same-day room for block B; **`npm run test:working-plan`** and **`npm run test:working-plan-calendar`**.

4. **Results**

| Criterion | Result | Evidence |
|-----------|--------|----------|
| Two entries in Calendar for the same person/day | **PASS** | Automation: **2** `[data-testid="working-plan-calendar-shift-line"]` in the cell for day **22** after save. |
| Two cards in Week view for same date | **PASS** | **2** `.shift-card` rows with `.shift-date` **2026-04-22**. |
| Planned vs clocked sums both blocks (9h = 540 min) | **PASS** | PVA table row for **2026-04-22** shows planned **9h** (export worker scoped to the same user). |
| Validation: no room for block B (`SPLIT_ERR_NO_ROOM`) | **PASS** | Modal shows **`p.form-error`** when block 1 consumes the rest of the day (wording per locale; EN does not contain the substring “room”). |
| Validation: second start not after first end (modal error) | **PASS** (by design) | UI **time options** for block B are constrained to start **after** block A end; overlap is not selectable. **`saveShift`** still enforces **`WORKING_PLAN.SPLIT_ERR_ORDER`** if values were invalid. |
| Optional: `test:working-plan` | **PASS** | Exit **0**: Working plan page, week + calendar + export UI. |
| Optional: `test:working-plan-calendar` | **PASS** | Exit **0**: `/working-plan/calendar` grid, no console errors. |

5. **Overall:** **PASS**

6. **Product owner feedback:** Split shifts behave as intended for scheduling: two planned rows appear in week and calendar, and planned time in **Planned vs clocked** matches the sum of both blocks. Testers should enable **Use any hour** when reproducing morning/evening examples if tenant opening hours would otherwise hide early start times.

7. **URLs tested**

   1. `http://127.0.0.1:4202/login?tenant=1`
   2. `http://127.0.0.1:4202/working-plan`
   3. `http://127.0.0.1:4202/working-plan/calendar` (dedicated smoke script)

8. **Relevant log excerpts**

**`pos-front` (build healthy, lazy chunk for working-plan):**

```
Application bundle generation complete. [0.644 seconds] - 2026-04-01T08:48:32.503Z
Lazy chunk files | working-plan-component | 169.71 kB |
```

**`pos-back` (schedule + PVA during Working plan):**

```
GET /schedule?from_date=2026-04-01&to_date=2026-04-30 HTTP/1.1" 200 OK
GET /schedule/planned-vs-actual?from_date=2026-04-01&to_date=2026-04-30 HTTP/1.1" 200 OK
GET /schedule/compliance-summary?from_date=2026-04-01&to_date=2026-04-30 HTTP/1.1" 200 OK
```
