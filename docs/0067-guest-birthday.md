# Guest birthday capture (reservations)

**Issue:** [#324](https://github.com/satisfecho/pos/issues/324)  
**Related:** billing-customer `birth_date` ([`docs/0017-billing-customers-factura.md`](0017-billing-customers-factura.md)); loyalty birthday rewards deferred ([`docs/0066-club-loyalty.md`](0066-club-loyalty.md) / #327); outbound campaigns deferred (#54).

## Goal

Capture optional **month/day** birthdays for reservation guests (not only Factura CRM customers), show them to staff, and keep **marketing use** behind an explicit tenant setting + consent. No automated email/SMS in this MVP.

## Data model

### `reservation`

| Column | Type | Notes |
|--------|------|--------|
| `guest_birthday_month` | smallint nullable | 1-12 |
| `guest_birthday_day` | smallint nullable | 1-31; pair with month (both null or both set) |
| `guest_birthday_marketing_consent` | boolean | default false; only meaningful when tenant marketing is enabled |

Year of birth is **not** stored (privacy).

### `tenant` settings

| Column | Default | Notes |
|--------|---------|--------|
| `guest_birthday_capture_enabled` | `true` | Show optional field on public `/book` |
| `guest_birthday_marketing_enabled` | `false` | Capture-only until enabled |
| `guest_birthday_consent_text` | null | GDPR copy next to public consent checkbox |

Staff can always set birthday on create/edit regardless of capture toggle. Public POSTs ignore birthday fields when capture is disabled. Marketing consent is forced `false` when marketing is off.

## API

- Reservation create/update/list/get include the birthday fields.
- `GET /public/tenants/{id}` exposes capture/marketing flags and consent text for the book UI.
- `PUT /tenant/settings` accepts the three tenant birthday settings.

## UI

- **Public book:** optional month + day; consent checkbox when marketing is enabled.
- **Staff reservations:** show birthday on cards; month/day on create/edit modal.
- **Settings → Reservations:** toggles + consent text.

## Out of scope

- Automated reminders/campaigns
- Birthday promos / loyalty rewards (#322 / #327)
- Walk-in waiting-list birthday (can reuse the same pattern later)
