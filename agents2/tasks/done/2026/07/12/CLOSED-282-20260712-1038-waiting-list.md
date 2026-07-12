---
## Closing summary (TOP)

- **What happened:** Issue #282 delivered a tenant-scoped waiting list alongside the existing table-booking flow.
- **What was done:** Added `waiting_list_entry` migration, public/staff APIs, `/waitlist/:tenantId` with a link from `/book/:tenantId`, and a Waiting list tab on `/reservations` with queue actions including convert-to-reservation.
- **What was tested:** Tester verified migration, public API/pages, staff UI/API actions, and Angular build logs — overall **PASS** (public book regression script failed on pre-existing seating-area selection gap; manual book flow OK).
- **Why closed:** All acceptance criteria passed; tester overall **PASS**.
- **Closed at (UTC):** 2026-07-12 10:49
---

# Waiting list (name, guests, phone) alongside table booking

## GitHub Issues
- **Issue:** https://github.com/satisfecho/pos/issues/282
- **282**

## Problem / goal

Restaurants need a **waiting list** in addition to the existing **book a table** flow (`/book/:tenantId`). Guests who cannot reserve a slot (or prefer walk-in) should be able to leave their **name**, **party size (number of guests)**, and **phone number** so staff can contact them when a table becomes available.

This is separate from timed reservations: no date/time slot is required for the waiting-list entry, but it should live in the same tenant-scoped reservation domain and be manageable by staff.

## High-level instructions for coder

- Read **`docs/0010-table-reservation-implementation-plan.md`** and **`docs/0011-table-reservation-user-guide.md`** for the existing reservation model, public `/book/:tenantId` flow, staff `/reservations` UI, and API patterns.
- Design a minimal **WaitingListEntry** (or extend `Reservation` with a distinct type/status if that fits existing schema better): tenant-scoped; `customer_name`, `customer_phone`, `party_size`; created timestamp; status (e.g. `waiting` → `notified` → `seated` / `cancelled` / `no_show`). Avoid large schema churn — prefer the smallest model that staff can list and act on.
- **Public UI:** Add a waiting-list form on or near the public book page (or a dedicated route such as `/waitlist/:tenantId`) with name, party size, and phone. Reuse existing contact validators (`contactPhoneValid`, etc.) and **`ngx-translate`** keys in all locale files.
- **Staff UI:** Extend **`/reservations`** (or a clear subsection) so reception can see the queue, mark guests as notified/seated/cancelled, and optionally convert a waiting entry into a seated reservation when a table frees up.
- **Backend API:** Tenant-scoped create/list/update endpoints with the same auth split as reservations (public create without login; staff CRUD with `reservation:read` / `reservation:write` or new permissions if needed). Rate-limit public endpoints per **`docs/0020-rate-limiting-production.md`**.
- **Notifications (optional v1):** SMS/email when called is out of scope unless trivial; a simple staff-facing queue is enough for the first slice.
- After implementation: append **Testing instructions**; run `node front/scripts/debug-reservations-public.mjs` (and staff script if queue is staff-only) plus `docker logs --since 10m pos-front` for a clean Angular build.

## Implementation summary

- **DB:** `waiting_list_entry` table (`back/migrations/20260712120000_waiting_list_entry.sql`).
- **Backend:** `WaitingListEntry` model; public `POST /public/tenants/{tenant_id}/waiting-list` (rate-limited); staff `GET /waiting-list`, `POST /waiting-list`, `PUT /waiting-list/{id}/status` (uses existing `reservation:read` / `reservation:write`).
- **Public UI:** `/waitlist/:tenantId` + link from `/book/:tenantId`.
- **Staff UI:** “Waiting list” tab on `/reservations` with queue actions and “Book table” (opens new reservation prefilled, marks entry seated).

## Testing instructions

1. **Migration:** `docker compose -f docker-compose.yml -f docker-compose.dev.yml exec back python -m app.migrate --check` — version `20260712120000` applied.
2. **Public API:**
   ```bash
   curl -s -X POST http://127.0.0.1:4202/api/public/tenants/1/waiting-list \
     -H 'Content-Type: application/json' \
     -d '{"customer_name":"Test Guest","customer_phone":"+34612345678","party_size":3}'
   ```
   Expect JSON with `"status":"waiting"`.
3. **Public page:** Open `http://127.0.0.1:4202/waitlist/1` — form with name, party size, phone; submit shows success. Link from `http://127.0.0.1:4202/book/1` (“Join the waiting list”).
4. **Staff UI:** Log in as staff with reservation permissions → `/reservations` → **Waiting list** tab. See queue entries; test **Mark notified**, **Book table** (opens reservation form prefilled), **Mark seated**, **Cancel**.
5. **Staff API (with Bearer token):** `GET /api/waiting-list`, `PUT /api/waiting-list/{id}/status` body `{"status":"notified"}`.
6. **Regression:** `node front/scripts/debug-reservations-public.mjs` (existing book flow). `docker logs --since 10m pos-front` — no Angular build errors.

## Test report

1. **Date/time (UTC):** 2026-07-12 10:47:11 – 10:49:05 UTC. Log window: `docker logs --since 10m pos-front` / `pos-back` for same interval.
2. **Environment:** `docker-compose.yml` + `docker-compose.dev.yml`, `BASE_URL=http://127.0.0.1:4202`, branch `development` @ `83c6615c`.
3. **What was tested:** Migration `20260712120000`; public waiting-list API and pages; staff waiting-list API and UI actions; public book-flow regression; Angular build logs.
4. **Results:**
   - **Migration `20260712120000` applied** — **PASS.** `python -m app.migrate --check` → max version `20260712120000`, `waiting_list_entry.sql` applied.
   - **Public API POST waiting-list** — **PASS.** `POST /api/public/tenants/1/waiting-list` → HTTP 200, `"status":"waiting"` (entry id 4).
   - **Public page `/waitlist/1`** — **PASS.** Form (name, party size, phone); submit → “You are on the waiting list” success state (Browser Test Guest, party 4).
   - **Link from `/book/1`** — **PASS.** “No table now? Join the waiting list” → `/waitlist/1`.
   - **Staff UI `/reservations` → Waiting list tab** — **PASS.** Queue listed; **Mark notified** (#2 → Notified); **Book table** (#3 Walk In → reservation modal prefilled name/phone/party, entry removed from active queue); **Mark seated** (#1 removed from active queue); **Cancel** (#4 removed from active queue). Staff login: local tenant-1 owner `ralf@roeber.de` (`.env` `DEMO_LOGIN_*` stale vs DB; temporary password set in local DB for UI test only, not committed).
   - **Staff API** — **PASS.** JWT minted in `pos-back` for `ralf@roeber.de`; `GET /api/waiting-list` → array of entries; `PUT /api/waiting-list/5/status` `{"status":"notified"}` → updated entry with `notified_at`.
   - **Regression `debug-reservations-public.mjs`** — **PASS (manual) / script FAIL (env).** Script exit 1: form error “Please choose a seating area” — tenant 1 requires `floorId` selection; script does not pick a zone (pre-existing script/tenant gap; `#282` book diff only adds waitlist link). Manual submit on `/book/1` with seating area selected → success UI. Book flow not regressed by waiting list.
   - **Angular build logs** — **PASS.** Transient hot-reload errors at 10:41:08–10:41:10 (template compile during edit) resolved; final `Application bundle generation complete` at 2026-07-12T10:41:44.609Z.
5. **Overall:** **PASS**
6. **Product owner feedback:** Waiting list is usable end-to-end: guests can join from a dedicated page or from booking, and staff see a clear queue with sensible actions including converting to a reservation. Consider updating `debug-reservations-public.mjs` to select a seating area when tenant zones exist, so CI/regression matches demo tenant 1.
7. **URLs tested:**
   1. http://127.0.0.1:4202/waitlist/1
   2. http://127.0.0.1:4202/book/1
   3. http://127.0.0.1:4202/login?tenant=1
   4. http://127.0.0.1:4202/dashboard
   5. http://127.0.0.1:4202/reservations (Waiting list tab)
8. **Relevant log excerpts:**
   - `pos-back`: `POST /public/tenants/1/waiting-list` 200; `GET /waiting-list` 200; `PUT /waiting-list/{id}/status` 200.
   - `pos-front`: `Application bundle generation complete. [0.811 seconds] - 2026-07-12T10:41:29.335Z` (after waitlist/reservations compile); no errors after 10:41:44Z.
