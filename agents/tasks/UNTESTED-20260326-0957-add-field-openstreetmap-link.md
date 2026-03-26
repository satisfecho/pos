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
