---
## Closing summary (TOP)

- **What happened:** Issue #136 asked for Working Plan calendar shift rows to open the same edit/delete flow as Week view instead of staying read-only.
- **What was done:** Calendar `shiftLines` now attach the full `Shift` on real rows; interactive buttons call `openEdit` / `confirmDelete` with `schedule:write` gating, overflow `+N more` stays non-editable, and i18n keys were added for accessibility labels.
- **What was tested:** Tester reported PASS: front build clean, `test:working-plan` smoke, Puppeteer verified edit modal and delete confirmation on calendar lines, structural check that overflow has no edit affordance.
- **Why closed:** All acceptance criteria and test-report items passed.
- **Closed at (UTC):** 2026-04-01 09:21
---

# Working Plan calendar — click a shift line to edit or delete

## GitHub

- **Issue:** https://github.com/satisfecho/pos/issues/136

## Problem / goal

Calendar view on the Working Plan page shows shift rows as read-only text. Users who stay in Calendar mode cannot adjust planned hours without switching to Week view. Enable click-to-edit (and optionally delete) on each real shift line using the same modal and API paths as Week view (`openEdit`, `confirmDelete` / `updateShift`, `deleteShift`).

Week view already exposes Edit/Delete per shift card; schedule CRUD exists under `/schedule` via `ApiService`. Calendar builds `shiftLines` with only `{ text, userId }` — no `shift.id`, so rows cannot open the correct shift.

## High-level instructions for coder

- When building `calendarGrid` / `shiftLines`, attach `shiftId` or the full `Shift` for each **real** shift line (not the “+N more” overflow row) so the template can call `openEdit(shift)` with the correct row.
- Make each real shift line interactive (button or clickable row with keyboard support and clear `aria-label`). Click opens the same Add/Edit modal as Week view. Optionally add a small Delete control or overflow menu reusing `confirmDelete(shift)`.
- For the overflow line (`CALENDAR_MORE_SHIFTS` when more than N lines): keep non-editable or handle explicitly (e.g. switch to Week / expand); do not invent fake `shiftId`s.
- Match Week view permissions: show edit/delete only for users who may write the schedule.
- Add i18n keys for any new strings and sync `front/public/i18n/*.json` for all shipped locales per project rules.
- Out of scope unless separately requested: split shifts, new APIs, or changes outside Working Plan calendar UX.

## Implementation notes (coder)

- `calendarGrid` shift lines now carry the full `Shift` on real rows; overflow `+N more` rows use `shift: null`.
- Calendar: primary line is a `<button>` calling `openEdit(shift)`; small trash button calls `confirmDelete(shift)` (same modal/confirm as week). `PermissionService` + `schedule:write` gates interactive controls (read-only users see static chips).
- i18n: `WORKING_PLAN.CALENDAR_SHIFT_EDIT_ARIA`, `WORKING_PLAN.CALENDAR_SHIFT_DELETE_ARIA` in all `front/public/i18n/*.json`.

## Testing instructions

1. Sync/build: `docker compose -f docker-compose.yml -f docker-compose.dev.yml logs --tail=80 front` — no Angular errors after the change.
2. Manual or Puppeteer: log in as a user with schedule write; open **Working plan** → **Calendar**. On a day with shifts, click a colored shift line — **Edit shift** modal should open with that shift’s data. Click the small delete icon — confirmation then delete as in week view. The `+N more` overflow line must stay non-clickable.
3. Smoke: `BASE_URL=http://127.0.0.1:4202 npm run test:working-plan --prefix front` (requires `LOGIN_EMAIL` / `LOGIN_PASSWORD` or `.env` demo credentials).

---

## Test report

1. **Date/time (UTC):** 2026-04-01 — verification run ~09:16–09:25 UTC (log window aligned with `pos-front` rebuild at `2026-04-01T09:15:09.543Z` and subsequent Puppeteer runs).

2. **Environment:** `docker-compose.yml` + `docker-compose.dev.yml`; **`BASE_URL=http://127.0.0.1:4202`** (HAProxy); branch **`development`** (synced via `./scripts/git-sync-development.sh` before edits). Credentials from repo **`.env`** (`DEMO_LOGIN_*` / login user with schedule write).

3. **What was tested:** Items under **Testing instructions**: front build health; Working plan → Calendar interactive shift lines (edit modal, delete confirmation); overflow `+N more` behavior; **`npm run test:working-plan --prefix front`** smoke.

4. **Results**

   | Criterion | Result | Evidence |
   |-----------|--------|----------|
   | Front build: no sustained Angular errors | **PASS** | Latest `pos-front` log ends with `Application bundle generation complete` (no error after successful rebuild). Brief NG8009 appeared during an intermediate rebuild (`track` expression); subsequent build completed clean. |
   | Smoke: `test:working-plan` | **PASS** | Exit code 0; week + calendar grid + export UI checks passed. |
   | Calendar: click shift line → **Edit shift** modal | **PASS** | Puppeteer: first `button.calendar-shift-line--btn` click → modal header text **Edit shift**. |
   | Calendar: delete control → confirmation | **PASS** | After closing edit modal, click `[data-testid="working-plan-calendar-shift-delete"]` → confirmation modal title **Delete shift**. |
   | Overflow `+N more` not an edit affordance | **PASS** | Current month had **0** overflow rows; `document.querySelectorAll('[data-testid="working-plan-calendar-shift-overflow"]')` contained no nested `button.calendar-shift-line--btn` (structural check). |

5. **Overall:** **PASS** (all criteria above).

6. **Product owner feedback:** Calendar mode now matches the week view for editing and deleting shifts: one tap opens the familiar edit form, and the trash control routes through the same delete confirmation as elsewhere. Staff can stay in the monthly view to adjust coverage without hunting for week view. No production deploy was required; verification was local Docker only.

7. **URLs tested (numbered)**

   1. `http://127.0.0.1:4202/login?tenant=1`
   2. `http://127.0.0.1:4202/dashboard` (post-login)
   3. `http://127.0.0.1:4202/working-plan` (with Calendar view selected via UI)

8. **Relevant log excerpts**

   **pos-front (build success):**

   ```
   Application bundle generation complete. [0.517 seconds] - 2026-04-01T09:15:09.543Z
   Page reload sent to client(s).
   ```

   **pos-back (schedule API during calendar load — sample):**

   ```
   "GET /schedule/compliance-summary?from_date=2026-04-01&to_date=2026-04-30 HTTP/1.1" 200 OK
   "GET /schedule/planned-vs-actual?from_date=2026-04-01&to_date=2026-04-30 HTTP/1.1" 200 OK
   ```
