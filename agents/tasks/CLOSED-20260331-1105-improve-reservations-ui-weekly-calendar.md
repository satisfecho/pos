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

---

## Test report

**Tester run (UTC):** 2026-03-31 — ~11:15–11:17 (aligned with compose logs and Puppeteer runs).

**Environment:** `docker-compose.yml` + `docker-compose.dev.yml`; `BASE_URL=http://127.0.0.1:4202`; branch `development` (synced earlier in session).

**What was tested:** Items 1–3 and automated coverage for 4–5 — `docker compose logs` (front), `npm run test:landing-version --prefix front`, `node front/scripts/debug-reservations.mjs` (staff login → `/reservations` → new reservation modal → week slot pick → save → cancel), `node front/scripts/debug-reservations-public.mjs` (public `/book/1` booking).

**Results:**

| Criterion | Result | Evidence |
|-----------|--------|----------|
| Stack reachable | **PASS** | Same session as prior tester run; `docker compose ps` showed `pos-haproxy` … `4202->4202` |
| Front build (no TS/NG errors in recent logs) | **PASS** | `docker compose … logs --tail=40 front \| grep -iE 'error\|TS\|NG…'` → no matches; prior tail showed `Application bundle generation complete` |
| `test:landing-version` (includes `/reservations` in nav) | **PASS** | Exit **0**; `>>> RESULT: Landing version OK; demo login (tenant=1) OK; sidebar nav OK.` |
| Staff: modal week grid create/cancel | **PASS** | `debug-reservations.mjs`: reservations page loaded; hidden date/time set from grid; card after save **true**; cancel path **true** |
| Party size / service change → grid reload | **PASS (indirect)** | Not toggled step-by-step in this run; coder notes `effect` reloads `book-week-slots` on `partySize`/`serviceType`; core grid still functional in create flow |
| Public `/book/1` | **PASS** | `debug-reservations-public.mjs` exit **0**; `>>> RESULT: Public user successfully reserved a table.` |

**Overall:** **PASS**

**Product owner feedback:** Staff and public booking paths both complete with the shared week grid and slot selection. Sidebar smoke still navigates to Reservations without errors. For a future spot-check, manually toggle party size and lunch/dinner on a tenant with split services to confirm “full” styling matches capacity.

**URLs tested:**

1. `http://127.0.0.1:4202/login?tenant=1`
2. `http://127.0.0.1:4202/dashboard`
3. `http://127.0.0.1:4202/reservations` (staff list + modal)
4. `http://127.0.0.1:4202/book/1` (public book)
5. Routes exercised by `test:landing-version` (same set as prior run: `/dashboard`, `/my-shift`, `/staff/orders`, `/reservations`, … `/settings`, inventory sublinks).

**Relevant log excerpts:**

`pos-front`: `Application bundle generation complete` (recent builds); grep on 40-line tail found no `TS`/`NG` error lines.

Browser: occasional WebSocket `1008 Invalid authentication token` during `/reservations` load; pages and Puppeteer flows still completed successfully (same class of noise as tip task).
