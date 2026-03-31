# Improve reservations UI at `/reservations`

## GitHub

- **Issue:** https://github.com/satisfecho/pos/issues/125

## Problem / goal

Staff and customers need a clearer **weekly booking calendar** on the reservations experience (`/reservations`): strict **7-column Mon–Sun grid** with visible thin borders per day; **single-letter weekday headers** (locale-appropriate where applicable); distinct **visual states** for days — **selected** (solid dark background, light text), **full** (medium grey when max capacity for that service/slot is reached for the current party size), **closed** (light grey, strikethrough or faded, non-clickable), **available** (clean white/light cell). Add a **legend** (e.g. filled dot selected, filled dot full, hollow closed) and ensure the grid **reacts when “number of guests” and service type (e.g. lunch/dinner)** change so a day becomes “full” if remaining capacity is below the selected party size. Below the calendar, show a concise **summary** (guests, service, date, time-slot control). Align with existing reservation/week-slot APIs and tenant capacity settings; see issue on GitHub for the reference mockup image.

## High-level instructions for coder

- Refine **`/reservations`** (staff modal and any shared week-grid component) to match the layout and state model above without breaking existing create/edit and capacity rules.
- Wire **closed**, **full**, and **available** cells to backend or existing `book-week-slots` / capacity data; keep **multi-tenant** and timezone behavior consistent with public `/book` where components are shared.
- Ensure **accessibility** (contrast, keyboard where applicable) and **i18n** for weekday letters and legend labels.
- Update or extend **Puppeteer** reservation scripts if selectors or flows change; run relevant smoke/tests per `AGENTS.md`.

## Implementation summary (coder)

- **`ReservationWeekSlotGridComponent`** (`front/src/app/shared/reservation-week-slot-grid.component.{ts,html,scss}`): Mon–Sun grid with vertical borders between day columns; **narrow** weekday letter + day-of-month in headers; cell styles — **available** (white), **full** (medium grey), **closed/past/etc.** (pale grey; closed-day slightly more faded); **selected** available slot (dark fill). **Dot legend** (available / selected / full / closed). **Summary panel**: party size, translated service label, formatted date, and **time-slot `<select>`** for the current week’s times (options disabled when not available). Existing `effect` still reloads `book-week-slots` when `partySize` or `serviceType` changes. **i18n**: new `BOOK.*` keys for legend, `TIME_SLOT`, updated `WEEK_GRID_HINT` / `PICK_SLOT` / `SLOT_UNAVAILABLE`; all locale files under `front/public/i18n/` updated. **Puppeteer**: `debug-reservations*.mjs` still use `.ws-available` / `.book-week-grid` — unchanged.

## Testing instructions

1. **Stack:** `docker compose -f docker-compose.yml -f docker-compose.dev.yml` (or `./run.sh`); app on `http://127.0.0.1:4202` (or HAProxy port from `docker compose ps`).
2. **Frontend build:** `docker compose -f docker-compose.yml -f docker-compose.dev.yml logs --tail=80 front` — no `TS`/`NG` errors after edits.
3. **Smoke:** `cd front && BASE_URL=http://127.0.0.1:4202 npm run test:landing-version` (passes; touches `/reservations`).
4. **Manual / staff:** Log in → **Reservations** → **New reservation** (or **Edit**): confirm week grid (7 columns, single-letter headers, borders, legend, summary + time dropdown), change **party size** and **service** (if meal split) and confirm grid reloads and slots show full/available correctly.
5. **Public `/book/{tenant}`:** Same grid — confirm booking flow still works and translations match.
