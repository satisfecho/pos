# Scheduled / planned business hours changes

## GitHub Issues

- **Issue:** https://github.com/satisfecho/pos/issues/194
- **194**

## Problem / goal

Business configuration today supports a **single static** weekly opening-hours pattern (`Tenant.opening_hours`), edited in staff Settings and consumed by public booking and reservation validation. The product needs **planned changes over time**: pick future dates or ranges, apply **temporary overrides** (holidays, special events) without rewriting the baseline week, **schedule a new permanent weekly pattern** that takes effect automatically from a chosen start date, and give staff a **dashboard** (list or calendar) of upcoming scheduled changes. All flows that depend on “open now / open on date D” (Settings, public book, slot APIs, reservation rules) must use a single definition of **effective hours per calendar date**.

## High-level instructions for coder

- Trace the current model end-to-end: JSON shape of `opening_hours`, Settings UI (`SETTINGS.OPENING_HOURS`), public tenant/book endpoints, and backend helpers that parse hours and reject invalid reservation times.
- Design data structures and migrations for overrides, effective-dated baseline changes, and optional audit metadata; keep defaults so existing tenants behave as today until they create schedules.
- Implement a **resolution rule**: given tenant + local calendar date (and tenant timezone), compute effective segments (and closed days); centralize this for API and UI so staff book, public book, and validation stay aligned.
- Build staff UX: create/edit/cancel planned entries; optional preview of impact on a sample date; list or calendar of future (and recent) changes.
- Cover edge cases: overlapping overrides, transition day when a new baseline starts, reservation lead times, split lunch/dinner where already supported.
- Add automated tests and/or smoke coverage appropriate to scope; extend `docs/` only if behaviour warrants operator-facing notes.
