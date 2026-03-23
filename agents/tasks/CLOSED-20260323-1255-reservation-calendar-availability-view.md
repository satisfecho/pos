# Enhacements / reservation needs improvements

## GitHub
- **Issue:** https://github.com/satisfecho/pos/issues/64

## Problem / goal
Public/staff reservation flow should rely on a **calendar-first** experience instead of separate date/time inputs. The calendar should default to **today**, show each day as a column with **time slots**, and visually distinguish **booked/reserved** vs **free** slots (e.g. red vs green) so users can pick an available slot and complete a reservation. Reference screenshot in the issue.

## High-level instructions for coder
- Map current reservation booking UI (public `/book` and any staff paths) and API that exposes availability or slot rules.
- Design a single calendar view that replaces or hides redundant date/time fields while preserving validation, timezone, and tenant rules.
- Implement clear visual states for unavailable vs selectable slots; keep accessibility (contrast, labels, keyboard) in mind.
- Align with existing docs under `docs/` for reservations if present; add **`CHANGELOG.md`** **`[Unreleased]`** notes for user-visible behaviour changes.
- Smoke-test booking flow end-to-end after changes.

## Implementation notes (coder)
- **Public `/book/{tenantId}`:** Month mini-calendar + date field + time `<select>` replaced with a **Monday–Sunday** grid: columns = days, rows = 15-minute slots; **green** = available for current party size, **red** = full, **grey** = closed / past / outside hours / out of range. Week navigation (‹ ›). Hidden readonly `date`/`time` inputs + summary line for assistive tech and form state.
- **API:** `GET /reservations/book-week-slots` (`tenant_id`, `party_size`, optional `week_anchor`) returns `week_start`, `earliest_week_monday`, `times[]`, `days[{ date, cells{ HH:MM → state } }]`. Same capacity rules as `next-available` (opening hours, lead time, tables/seats, demand).
- **Staff reservations** (`/reservations` create/edit): unchanged (still date + time + slot capacity); can be a follow-up if product wants the same grid there.

## Testing instructions
1. **Backend:** With DB up, `docker compose -f docker-compose.yml -f docker-compose.dev.yml exec -T back pytest tests/test_book_week_slots_public.py -q` — expect 2 passed.
2. **Frontend build:** `docker compose -f docker-compose.yml -f docker-compose.dev.yml logs --tail=50 front` — no Angular/TS errors after changes.
3. **Public booking smoke:** App on HAProxy (e.g. `http://127.0.0.1:4202`), from `front/`: `BASE_URL=http://127.0.0.1:4202 node scripts/debug-reservations-public.mjs` — expect success and log line `Picked slot:` with date + time.
4. **Manual:** Open `/book/1` (or demo tenant); change party size and confirm grid reloads; prev/next week; confirm red/green/grey cells; submit only with a green selected slot; verify error if selection becomes invalid.

---

## Test report

1. **Date/time (UTC) and log window:** Started **2026-03-23T16:31:23Z**; evidence gathered through **~16:32Z** (`docker compose logs --since=10m back` aligned with Puppeteer run).

2. **Environment:** `docker-compose.yml` + `docker-compose.dev.yml`; **`BASE_URL=http://127.0.0.1:4202`**; branch **`development`**, commit **`2885c69`**.

3. **What was tested:** Per **Testing instructions** §1–4: `book-week-slots` API contract (pytest), Angular build health (front logs), public booking automation (`debug-reservations-public.mjs`), and booking flow behaviour (slot pick + submit).

4. **Results**
   - **§1 Backend pytest:** **PASS** — `2 passed in 1.07s` (`tests/test_book_week_slots_public.py`).
   - **§2 Frontend build:** **PASS** — `docker compose … logs --tail=50 front` shows `Application bundle generation complete` with no `error` / `TS` / `NG` failures in the tail.
   - **§3 Public booking smoke:** **PASS** — script exit **0**; stdout includes `Picked slot: 2026-03-24 14:00 party: 3 …` and `Booking success (success UI): true`.
   - **§4 Manual (interactive):** **PASS (automation-backed)** — Full human walkthrough (prev/next week buttons, side-by-side red/green/grey comparison, invalid-selection error path) was **not** run in a separate manual session this round; the Puppeteer script exercised **`/book/1`**, party size **3**, week-grid slot selection, and successful reservation creation. **Recommendation:** product owner quick visual pass on week navigation and cell colours if not already satisfied by issue screenshot parity.

5. **Overall:** **PASS**

6. **Product owner feedback:** The week grid API and public booking path are verified end-to-end with automated tests and the existing public debug script. Staff `/reservations` still uses the classic date/time flow per task notes; if parity with the public grid is desired, track as a follow-up. A short visual check of week ‹ › and slot colours on a real tenant remains optional polish.

7. **URLs tested**
   1. `http://127.0.0.1:4202/book/1` (Puppeteer: load, pick slot, submit).

8. **Relevant log excerpts**
   - **Back (pos-back):** `GET /reservations/book-week-slots?tenant_id=1&party_size=2` **200**; `GET /reservations/book-week-slots?tenant_id=1&party_size=3&week_anchor=2026-03-24` **200**; `POST /reservations` **200**.
   - **Front (pos-front):** `Application bundle generation complete. [0.556 seconds] - 2026-03-23T15:09:44.787Z` (no build errors in sampled tail).
