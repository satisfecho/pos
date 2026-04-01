# Technical requirement: syncing reservation seating with floor plan sections

## GitHub

- **Issue:** https://github.com/satisfecho/pos/issues/139

## Problem / goal

Reservation “Seating” choices (e.g. no preference, indoor, terrace/outdoor) must align with the tenant’s floor model (floor tabs in Tables / canvas) so bookings and table assignment stay consistent with physical zones. Today seating is not validated against floors; slot capacity and table availability are effectively tenant-wide without floor/zone partitioning. The issue asks to classify floors (e.g. indoor vs outdoor), filter availability and assignment by that classification, and sync UI defaults (e.g. when the user is on an indoor floor tab, open the reservation modal with matching seating when sensible). Confirm whether public `/book` and staff flows share the same seating UX. Implementation notes in the issue: `Floor` (not `FloorPlan`) drives tabs; `Table` has `floor_id`; staff UI lives in `ReservationsComponent`; consider extending `Floor` rather than a separate section model unless product requires it.

## High-level instructions for coder

- Model: add or reuse a floor-level classification for seating zones (indoor / outdoor / any) and keep it consistent in API and admin/settings where floors are named or edited.
- Availability: when a seating preference is selected, limit slots and assignable tables to matching floors; define clear behavior for “no preference” (e.g. all active floors).
- UI: keep floor tabs and seating controls in sync—default seating from active floor context where appropriate; optional highlight or auto-switch floor context per product decision.
- Verify staff and public booking paths; extend tests or Puppeteer flows as needed for multi-zone tenants.
