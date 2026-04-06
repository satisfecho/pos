# 400 Error on Reservation Update (PUT /api/reservations/{id})

## Source
- **Service:** `pos-haproxy`
- **UTC Window:** 2026-04-05T18:36:37Z (approximate from logs)
- **Representative Error:** `400 304 - - ---- 8/8/0/0/0 0/0 "PUT /api/reservations/1966 HTTP/1.1"`
- **Another instance:** `400 304 - - ---- 8/8/0/0/0 0/0 "PUT /api/reservations/1967/seat HTTP/1.1"`

## High-level instructions for coder
- Investigate why `PUT /api/reservations/{id}` and `PUT /api/reservations/{id}/seat` are returning `400 Bad Request`.
- Check backend logs (if available via `docker logs pos-back`) for the specific validation error or traceback associated with these requests.
- Verify if the payload sent by the frontend matches the expected Pydantic model/SQLModel schema in the backend.
- Check if the `304 Not Modified` status alongside the `400` is a result of specific client/server interaction or if it's just part of the logged response pattern for these failed requests.
- Ensure that reservation updates (including seat assignments) handle edge cases or missing data gracefully without triggering a 400.

## Coder notes (implementation)
- **PUT `/reservations/{id}` — seating vs zone:** Staff edit could change `seating_preference` without updating `preferred_floor_id`. The backend then rejected with localized `reservation_seating_floor_mismatch` (HTTP 400). **Fix:** After applying the update body, if the stored `preferred_floor_id` does not match the current `seating_preference` (or floor is missing/wrong tenant), **clear** `preferred_floor_id` instead of failing. When the client **explicitly** sends `preferred_floor_id`, validate with `_validate_floor_seating_pair_or_raise` before saving (was missing in the assign branch).
- **Staff UI — zone-scoped capacity:** The week grid and `GET /reservations/slot-capacity` were called **without** `floor_id` while saves used zone-scoped capacity when `preferred_floor_id` was set. **Fix:** Pass `bookFloorId` from the reservation’s `preferred_floor_id` while editing **only if** the user has not changed seating from the opened baseline (`editBaselineSeating`); reload slot capacity when seating changes. Aligns availability checks with the backend.
- **HAProxy `400 304`:** The second number is a field in HAProxy’s log format (e.g. response size), **not** HTTP 304 Not Modified.

---

## Testing instructions

### What to verify
- Editing a **booked** reservation that has a **public book zone** (`preferred_floor_id`) and **terrace** (or **indoor**) seating: change seating to another option and save — **no 400**; zone is cleared server-side if it no longer matches.
- Slot capacity line in the staff modal matches **zone-scoped** demand when the edit session still matches the original seating + zone.
- Seating a party at a valid table still succeeds when status is **booked** (unchanged rules: occupied table / capacity still return 400 as before).

### How to test
- Stack: `docker compose -f docker-compose.yml -f docker-compose.dev.yml` (HAProxy e.g. `http://127.0.0.1:4202`).
- **Manual:** Log in as staff → **Reservations** → open a booked reservation that was created from **/book** with a zone + terrace/indoor → **Edit** → change seating preference → **Save** (expect success).
- **Optional automation:** `LOGIN_EMAIL` / `LOGIN_PASSWORD` with `node front/scripts/debug-reservations.mjs` (covers create/cancel; extend or manually hit edit if needed).
- **Backend import check:** `docker compose -f docker-compose.yml -f docker-compose.dev.yml exec back python3 -c "from app.main import app"`.
- **Frontend build:** `docker compose -f docker-compose.yml -f docker-compose.dev.yml logs --tail=80 front` — no TS/Angular errors after save.

### Pass/fail criteria
- **Pass:** PUT `/api/reservations/{id}` returns **200** when changing seating for a reservation that had a zone that no longer matches; staff modal shows no misleading “seats left” vs server rejection for that scenario.
- **Fail:** **400** with seating/floor mismatch on the same flow, or Angular build errors in the front container logs.
