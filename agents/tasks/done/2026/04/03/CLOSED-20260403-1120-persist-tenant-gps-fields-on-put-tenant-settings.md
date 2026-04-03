---
## Closing summary (TOP)

- **What happened:** Tenant venue GPS fields were not persisted on `PUT /tenant/settings`, so clock flows requiring venue coordinates failed even after owners saved location in settings.
- **What was done:** `update_tenant_settings` in `back/app/main.py` now applies `latitude`, `longitude`, `location_radius_meters`, and `location_check_enabled` with validation (lat/lon bounds, non-negative radius, HTTP 400 on invalid input); three new tests were added in `back/tests/test_work_session.py`.
- **What was tested:** Full `tests/test_work_session.py` via Docker Compose back container — **6 passed** in ~3.5s; optional manual UI path was N/A per tester.
- **Why closed:** Tester **Overall: PASS**; implementation and automated criteria met.
- **Closed at (UTC):** 2026-04-03 11:23
---

# Persist tenant GPS fields on PUT /tenant/settings

## GitHub Issues
- [github.com/satisfecho/pos/issues](https://github.com/satisfecho/pos/issues)
- `gh issue list --repo satisfecho/pos --state open --limit 40`
- Optional: `--json number,title,labels,updatedAt,url`
- **Issue:** https://github.com/satisfecho/pos/issues/158

## Problem / goal
Owner settings for venue location (latitude, longitude, radius, location check toggle) are not persisted on `PUT /tenant/settings`: `update_tenant_settings` in `back/app/main.py` effectively saves only `clock_qr_location_verify` (and related fields), so `Tenant` GPS columns stay NULL. Staff clock flows that require GPS then fail with a message like venue coordinates must be set. The fix should apply `TenantUpdate` fields `latitude`, `longitude`, `location_radius_meters`, and `location_check_enabled` using the same optional-field pattern as other settings (update only when present; validate latitude/longitude ranges and non-negative radius). See `AGENTS.md` / work-session docs for clock-in GPS behavior.

## High-level instructions for coder
- Inspect `update_tenant_settings` (and `TenantUpdate` / `Tenant` models) and extend persistence so GPS-related fields from the request are written to the tenant row when provided.
- Validate inputs: sensible lat/lon bounds, non-negative radius; reject or 422 invalid combinations per existing API style.
- Add or extend tests (e.g. `tests/test_work_session.py` or tenant settings tests): a settings update persists coordinates; with `clock_qr_location_verify` and coords set, clock-in path that needs venue GPS succeeds (or equivalent API-level assertion).
- Run targeted pytest and any relevant smoke path; do not log secrets or full env in commits.

## Implementation summary
- **`back/app/main.py` — `update_tenant_settings`:** Applies `latitude`, `longitude`, `location_radius_meters`, and `location_check_enabled` when each field is non-null in the request body; validates finite lat ∈ [-90, 90], lon ∈ [-180, 180], radius ≥ 0 (HTTP **400** on violation).
- **`back/tests/test_work_session.py`:** `test_put_tenant_settings_persists_gps_fields`, `test_put_tenant_settings_rejects_invalid_gps`, `test_clock_in_succeeds_when_gps_required_and_venue_coords_set_via_settings`.

## Testing instructions
1. From repo root, with dev stack DB reachable:  
   `docker compose -f docker-compose.yml -f docker-compose.dev.yml exec -T back python3 -m pytest tests/test_work_session.py -q`  
   Expect **6 passed** (includes three new tests).
2. Optional manual: as owner/admin, **Settings** → set venue coordinates and radius, enable **Require GPS at venue** for clock QR if applicable; staff **clock in** with QR + location should no longer fail with “Venue coordinates must be set” when coords were saved.

---

## Test report

1. **Date/time (UTC) and log window:** 2026-04-03 11:22 UTC; verification run ~11:21–11:22 UTC (pytest completed in ~3.5s).

2. **Environment:** `docker-compose.yml` + `docker-compose.dev.yml`; services `back`, `db`, etc. up; pytest via `docker compose … exec -T back`. Branch `development`, commit `7cbb70a`.

3. **What was tested:** Task **Testing instructions** §1 — `tests/test_work_session.py` full module (includes GPS persistence, invalid GPS rejection, clock-in with venue coords via settings).

4. **Results:**
   - **Pytest `tests/test_work_session.py` — 6 tests, all green:** **PASS** — command exit 0; output `6 passed in 3.51s`.
   - **Optional manual UI / clock flow:** **N/A** — not required by §1; skipped to stay within stated instructions.

5. **Overall:** **PASS**

6. **Product owner feedback:** Automated coverage confirms tenant settings now persist GPS fields and that clock-in succeeds when QR location verify is on and coordinates were set through the settings API. Owners can rely on saved venue coordinates for staff clock flows without a separate data fix. Optional end-to-end UI check remains a good sanity pass before release if policies change.

7. **URLs tested:** **N/A — no browser** (API-level pytest only).

8. **Relevant log excerpts:** Pytest (primary evidence):
   ```
   ......                                                                   [100%]
   6 passed in 3.51s
   ```
   `pos-back` access log during the window showed only unrelated `GET /docs` from HAProxy; pytest ran in-process and did not add distinguishing lines there.
