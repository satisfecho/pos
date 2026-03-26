# Add field for OpenStreet maps link

## GitHub
- **Issue:** https://github.com/satisfecho/pos/issues/102

## Problem / goal
Tenant settings (“información de contacto”) need an optional OpenStreetMap URL. When set, surface a map link after relevant flows (e.g. post-submit) and include it in reservation emails. Reservation emails should also retain or add the guest link to change/manage the reservation (align with existing confirmation/reminder patterns in `docs/` if present).

## High-level instructions for coder
- Add persisted tenant field for the map link (API + model/migration as needed); validate URL shape safely.
- Wire the field into staff Settings → contact section with copy consistent with other locale keys.
- Show the link in the appropriate customer-facing flow when the field is filled (per product intent in the issue).
- Extend reservation email templates (backend) to include the map link when configured and the reservation change link as specified.
- Add or extend i18n strings for any new UI; run a focused smoke path (e.g. settings save, sample email or template preview if available).

## Implementation summary (coder)

- **DB:** `public_openstreetmap_url` on `tenant` (migration `20260326104500_tenant_public_openstreetmap_url.sql`).
- **API:** `Tenant`, `TenantUpdate`, `TenantSummary`, `GET /public/tenants/{id}` JSON; `PUT /tenant/settings` normalizes with existing `_normalize_public_http_url` (http/https only, max 2048).
- **Emails:** New placeholders `google_maps_link_block_html` and `openstreetmap_link_block_html` in `reservation_email_template.py` (included in default body); reminder email appends the same map blocks when tenant is passed.
- **Front:** Settings → Contact (after Google Maps field); book / reservation view / feedback public pages show an “Open in OpenStreetMap” button when set; `TenantSummary` / `TenantSettings` typings updated. All `public/i18n/*.json` keys + reservation email body hint updated.

## Testing instructions

1. **Migrate:** `docker compose -f docker-compose.yml -f docker-compose.dev.yml exec back python -m app.migrate`
2. **Backend:** `docker compose -f docker-compose.yml -f docker-compose.dev.yml exec back python3 -m pytest tests/test_reservation_email_template.py tests/test_reservation_reminder_email.py tests/test_guest_feedback.py -q`
3. **Staff UI:** Log in → Settings → Contact → set **OpenStreetMap link** (valid `https://www.openstreetmap.org/...` share URL), Save; confirm reload keeps value.
4. **Public book:** Open `/book/1` (or your tenant); after a successful booking (or in header if address/maps section visible), confirm **Open in OpenStreetMap** appears and opens the URL.
5. **Reservation email:** Create a reservation with customer email and tenant SMTP (or dev mail capture); confirm confirmation email contains map link paragraphs when URLs are set, and still includes **View or change your reservation online** when a token/view URL exists.
6. **Front smoke:** `cd front && BASE_URL=http://127.0.0.1:4202 npm run test:landing-version` (with stack up).

---

## Test report

1. **Date/time (UTC) and log window:** 2026-03-26 ~10:55Z–10:58Z (verification run); Docker `front` / `back` logs reviewed for the same window.

2. **Environment:** `docker-compose.yml` + `docker-compose.dev.yml`; **`BASE_URL`** `http://127.0.0.1:4202` (HAProxy); branch **`development`** @ `82065c8`.

3. **What was tested:** Task testing instructions §1–6 (migrate, targeted pytest, staff Settings Contact OSM field save/reload, public book map link, reservation email content via tests, landing smoke).

4. **Results**
   - **Migrate (instruction 1):** **PASS** — `python -m app.migrate` reports schema version **20260326104500** and “Database is up to date”.
   - **Backend pytest (instruction 2):** **PASS** — `16 passed in 0.96s` for `tests/test_reservation_email_template.py`, `tests/test_reservation_reminder_email.py`, `tests/test_guest_feedback.py`.
   - **Staff UI (instruction 3):** **PASS** — After login, **Settings → Contact** (`data-testid="settings-contact-tab"`): `#public_openstreetmap_url` present; **Save** then full page **reload**; field value matched the saved test URL (Puppeteer; credentials from repo `.env`).
   - **Public book (instruction 4):** **PASS** — With tenant 1 `public_openstreetmap_url` set, **GET `/api/public/tenants/1`** returned the URL; a11y snapshot on **`/book/1`** showed link **“Open in OpenStreetMap”** with correct `href` to `openstreetmap.org`. (Header/maps block; full booking flow not required for link visibility.)
   - **Reservation email (instruction 5):** **PASS** (automated substitute for live SMTP) — Same pytest files assert HTML/text include **openstreetmap.org** / **Open in OpenStreetMap** and confirmation inner HTML includes **“View or change”** (`tests/test_reservation_email_template.py`); reminder tests cover OSM blocks when tenant URL set (`tests/test_reservation_reminder_email.py`). **Note:** No live outbound SMTP capture in this run.
   - **Front smoke (instruction 6):** **PASS** — `npm run test:landing-version` exited **0**; **`docker compose … logs --tail=80 front`** shows **Application bundle generation complete** with no TS/Angular errors in the tail.

5. **Overall:** **PASS** (all criteria met for this verification).

6. **Product owner feedback:** Tenants can store a public OpenStreetMap link next to other contact fields; guests see a clear **Open in OpenStreetMap** control on the book page when it is set, and reservation-related emails keep the manage-reservation messaging while optionally including map blocks. Live inbox proof remains optional if you already trust the template tests.

7. **URLs tested**
   1. `http://127.0.0.1:4202/login?tenant=1` (staff login, Puppeteer)
   2. `http://127.0.0.1:4202/settings` (staff Settings)
   3. `http://127.0.0.1:4202/book/1` (public book; OSM link in header)
   4. `http://127.0.0.1:4202/api/public/tenants/1` (JSON field `public_openstreetmap_url`)

8. **Relevant log excerpts**
   - **back:** `PUT /tenant/settings HTTP/1.1" 200 OK` and `GET /tenant/settings HTTP/1.1" 200 OK` (settings load/save during staff check).
   - **front:** `Application bundle generation complete. [0.934 seconds] - 2026-03-26T10:52:08.029Z` (successful rebuild in reviewed window).
   - **pytest:** `16 passed in 0.96s`.

**GitHub:** Comment posted on **#102** at verification start. Label **`agent:testing`** is **not** defined on the repo (`gh issue edit` failed); **`agent:wip`** removal may be partial — labels should be adjusted manually to match `docs/agent-loop.md` if desired.

**Data note:** Tenant **id=1** `public_openstreetmap_url` was temporarily set for UI checks, then saved via UI and finally restored to a stable share URL (`https://www.openstreetmap.org/?mlat=41.48&mlon=2.32#map=18/41.48/2.32`).
