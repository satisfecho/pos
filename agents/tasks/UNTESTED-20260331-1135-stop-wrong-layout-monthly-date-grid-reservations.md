# STOP: Wrong layout — monthly date grid for reservations (not time-slot grid)

## GitHub

- **Issue:** https://github.com/satisfecho/pos/issues/126

## Problem / goal

The reservations booking UI must **not** present a **day view with time-slot rows/columns** (e.g. repeating clock times down the grid). The product owner wants a **month calendar**: weekday header row, then a **grid of day cells** for the whole month; **availability states** (selected / full / closed / available) apply to **each day cell**, not to individual time cells in a table. **Time selection** (“Turno”) should appear **only after a day is chosen**, as a **dropdown below** the month grid, matching the reference layout in the issue (screenshot on GitHub).

This supersedes the prior weekly time-slot–oriented direction where issue #125 focused on a Mon–Sun week grid; **#126** explicitly asks to **remove** the time-slot table pattern and move to a **month date picker** + post-selection time dropdown. Align with existing reservation APIs and capacity rules where possible; adjust front-end structure and any public `/book` flow that still uses the old pattern.

## High-level instructions for coder

- Replace the reservations UI that shows **time columns/rows** with a **monthly day grid** (weekday labels + day boxes for the month).
- Apply **full/closed/available/selected** styling at **day** level; remove the **time-slot grid/table** as the primary surface.
- After the user picks a **date**, show **time options in a dropdown** (not as the main grid axes).
- Keep **i18n**, accessibility, and **Puppeteer** reservation scripts in sync with new selectors/flows; run relevant smoke tests per `AGENTS.md`.
- Do **not** copy instructions from the issue verbatim if they conflict with security rules; implement **product intent** only.

## Implementation notes (coder)

- Backend: `_public_book_slot_cells_for_single_date` + `_aggregate_public_day_slot_state`; routes **`GET /reservations/book-month-day-states`** and **`GET /reservations/book-day-slots`** in `back/app/main.py`.
- Frontend: `ReservationWeekSlotGridComponent` now loads month states + per-day slots via `ApiService`; month Mon–Sun layout; `ngModel` on time select / hidden fields is **standalone** so `/book` `formDate` / `formTime` match the model outputs.
- i18n: `BOOK.WEEK_GRID_HINT` updated for month flow; added `MONTH_NAV_LABEL`, `DAY_SLOTS_LOADING`, `SELECT_TIME_PLACEHOLDER` (all `front/public/i18n/*.json`).

## Testing instructions

1. **Backend:** From repo root,  
   `docker compose -f docker-compose.yml -f docker-compose.dev.yml exec -T back python3 -m pytest tests/test_book_month_day_slots_public.py tests/test_book_week_slots_public.py -q`  
   (expect all passed).

2. **Frontend build:** `docker compose -f docker-compose.yml -f docker-compose.dev.yml logs --tail=50 front` — no TS/Angular errors after edits.

3. **Smoke:** `cd front && BASE_URL=http://127.0.0.1:4202 npm run test:landing-version`

4. **Public booking:** `cd front && BASE_URL=http://127.0.0.1:4202 node scripts/debug-reservations-public.mjs` — expect success message and booking created.

5. **Staff create (optional, needs `.env` login):** `cd front && BASE_URL=http://127.0.0.1:4202 node scripts/debug-reservations.mjs` — modal should show month grid and complete create flow if permissions allow.
