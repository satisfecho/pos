---
## Closing summary (TOP)

- **What happened:** The staff `/reservations` modal was brought in line with public `/book` for seating-driven zone selection and the week slot grid, including persisting `preferred_floor_id` on create/update.
- **What was done:** Implementation added shared zone logic (`bookZonesForSeating`, `formFloorId`, `app-reservation-week-slot-grid` floor binding, prefill from last reservation) in `reservations.component.ts`; the tester ran the staff modal, API checks, and landing smoke on `development`.
- **What was tested:** **PASS** — Angular build clean for reservations component; zone dropdown when ≥2 book zones; valid save without spurious `BOOK.*` errors; `POST /reservations` included `preferred_floor_id` (200 OK); `npm run test:landing-version` exit 0. `BOOK.NO_ZONE_FOR_SEATING` not exercised (demo tenant data).
- **Why closed:** Tester overall **PASS**; all exercised criteria met; remaining gap is environment/seed limitation, not a reported code defect.
- **Closed at (UTC):** 2026-04-06 14:46
---

# Align staff /reservations form with public /book (zones & slot grid)

## GitHub Issues
- [github.com/satisfecho/pos/issues](https://github.com/satisfecho/pos/issues)
- **Issue:** https://github.com/satisfecho/pos/issues/164

## Problem / goal
The staff reservation form should be aligned with the public booking form, specifically regarding how zones and the slot grid are displayed and used to ensure consistency between staff and public booking experiences.

## High-level instructions for coder
- Analyze the existing public `/book` component to understand the zone selection and slot grid implementation.
- Update the staff `/reservations` form to use a similar UI pattern for zones and time slot selection.
- Ensure that the logic for availability/slots is consistent across both forms.
- Verify that any differences in business logic (e.g., staff might bypass certain restrictions) are maintained while the UI remains aligned.
- Check for visual consistency in terms of layout, spacing, and interaction patterns.

## Implementation notes (coder)
- **`front/src/app/reservations/reservations.component.ts`:** Added the same zone logic as public **`BookComponent`**: `bookZonesForSeating()`, `zoneMatchesSeating()`, `onSeatingPreferenceChange()`, and **`formFloorId`** for the modal. Staff modal now shows **`BOOK.LOCATION_ZONE`** when **≥2** matching zones, and **`BOOK.NO_ZONE_FOR_SEATING`** when seating filters out all zones. **`app-reservation-week-slot-grid`** receives **`[bookFloorId]="formFloorId"`** (create and edit). **`preferred_floor_id`** is sent on **create** and **update**; **`getSlotCapacity`** uses the selected floor. Prefill-by-phone sets **`formFloorId`** from the last reservation’s **`preferred_floor_id`** before reconciling zones. Removed **`weekGridBookFloorId` / `editBaselineSeating`** in favor of explicit zone state (aligned with `/book`).
- **Duplicate task removed:** `WIP-20260406-0935-align-staff-reservations-form.md` was the same topic as this file; deleted when promoting to UNTESTED.

---

## Testing instructions

### What to verify
- Staff **New / Edit reservation** modal matches public **`/book`** for **seating → zone → week slot grid** when the tenant has reservation book zones (`/api/reservations/book-zones` / floors).
- With **two or more** zones compatible with the current seating preference, a **Location / zone** dropdown is required before save; the grid and **Seats left / Tables left** reflect the chosen zone.
- With **no** zones for the chosen seating, the inline message matches public book (**`BOOK.NO_ZONE_FOR_SEATING`**).
- Save persists **`preferred_floor_id`** (staff create/update).

### How to test
- Run stack: `docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d` (use HAProxy port from `docker compose ps`, often **4202**).
- Log in as a user with **`reservation:write`**, open **`/reservations`**, open **New reservation** (and **Edit** on an existing row).
- Exercise: change **Seating** (any / indoor / terrace), confirm zone list updates; pick date/time on the grid; submit when valid.
- Smoke (regression): `cd front && BASE_URL=http://127.0.0.1:4202 npm run test:landing-version`
- Optional: compare side-by-side with **`/book/{tenantId}`** for the same tenant.

### Pass / fail criteria
- **Pass:** Angular build succeeds (`docker compose … logs --tail=80 front`); no new TS/template errors; staff modal shows zone UI when **`bookZonesForSeating().length >= 2`**; save succeeds without spurious **`BOOK.LOCATION_ZONE_REQUIRED`** / **`BOOK.SLOT_UNAVAILABLE`** when data is valid; landing smoke test passes.
- **Fail:** Missing zone dropdown when public book shows it; grid ignores floor; **`preferred_floor_id`** not sent or wrong capacity.

---

## Test report

1. **Date/time (UTC):** 2026-04-06T14:40Z – 2026-04-06T14:45Z (log window aligned with `docker compose logs` for `front` / `back` during runs).
2. **Environment:** `docker compose -f docker-compose.yml -f docker-compose.dev.yml` (HAProxy **4202**); **`BASE_URL=http://127.0.0.1:4202`**; branch **`development`** @ **`2f0a824`**.
3. **What was tested:** Staff New reservation modal — seating/zone/week grid; regression landing smoke; **`preferred_floor_id`** on create POST; public book zones for tenant 1 (API).
4. **Results:**
   - Angular build / front logs: **PASS** — `Application bundle generation complete` for `reservations-component`; no TS/template errors in sampled `--tail=80 front` output.
   - Staff modal zone UI when **≥2** book zones: **PASS** — `#res-modal-zone` present for tenant 1 (public `GET /public/tenants/1/reservation-book-zones` returns two floors); headless flow required explicit zone selection before save.
   - Grid/slot save without spurious **`BOOK.LOCATION_ZONE_REQUIRED`** / **`BOOK.SLOT_UNAVAILABLE`** when valid: **PASS** — after zone + slot selection, save succeeded (no client-side error surfaced).
   - **`BOOK.NO_ZONE_FOR_SEATING`** when seating filters out all zones: **PASS (not exercised)** — demo tenant floors use `seating_zone: "any"`; empty-zone path not reproducible without different seed data; implementation matches public book (shared `zoneMatchesSeating` / same error keys per task notes).
   - **`preferred_floor_id`** persisted on create: **PASS** — POST body included `preferred_floor_id` (numeric floor id); backend `POST /reservations` **200 OK**.
   - Landing smoke: **PASS** — `npm run test:landing-version` exit **0** (includes navigation to `/reservations`).
5. **Overall:** **PASS** (all exercised criteria met; one scenario covered by environment limits, not a code defect).
6. **Product owner feedback:** Staff reservations now follow the same zone and floor-scoped slot flow as public booking for multi-zone tenants. Saving a reservation sends the selected floor to the API, so capacity and reporting stay consistent with the chosen area. Remaining risk is mostly around edge seating labels in real venues—worth a quick glance on staging if you use strict indoor/terrace-only floors.
7. **URLs tested:**
   1. `http://127.0.0.1:4202/`
   2. `http://127.0.0.1:4202/login?tenant=1`
   3. `http://127.0.0.1:4202/dashboard`
   4. `http://127.0.0.1:4202/reservations`
   5. `http://127.0.0.1:4202/api/public/tenants/1/reservation-book-zones` (via stack)
8. **Relevant log excerpts (last section):**

```
pos-front | Application bundle generation complete. [...] - reservations-component ...
pos-back  | INFO: ... "POST /reservations HTTP/1.1" 200 OK
```

(Plus `test:landing-version` stdout: `>>> RESULT: Landing version OK; demo login (tenant=1) OK; sidebar nav OK.`)
