# Dynamic booking system with advanced filters and calendar logic

## GitHub

- **Issue:** https://github.com/satisfecho/pos/issues/119

## Problem / goal

Evolve the restaurant **reservations / booking** flow (staff-facing **Reservations** area) toward a richer UI: configurable guest and service controls, allergy capture, indoor vs terrace preference, and a **weekly calendar grid** (Mon–Sun) that reflects slot capacity and closed days. Backend must enforce **per-slot guest capacity** (configurable per tenant/restaurant, not hardcoded) and support **editing existing bookings** so totals recalc and slots become “full” when capacity is reached.

Align with existing reservation models, public book flow, and `docs/` where the product already describes reservations.

## High-level instructions for coder

- Add or extend **tenant-configurable** max guests per time slot (and any related settings) in backend + admin/settings UI as appropriate.
- Implement the **top section** before the calendar: guest count selector, service type (e.g. lunch/dinner) with i18n keys, allergies yes/no with conditional detail text, indoor/terrace preference.
- Build the **7-column weekly grid** with states: selected, full (at capacity), closed/unavailable; ensure legend and styling match product intent.
- Wire **calendar refresh** when guest count or service changes so availability/full states update.
- Ensure **edit booking** paths call APIs that revalidate capacity and update slot occupancy atomically where needed.
- Add or extend tests (Puppeteer/API) for the booking flow if the repo pattern supports it.
