# Align 0016 reports doc with overbooking summary

## GitHub Issues
- **Issue:** (none — enhancement reviewer)
- **0**

## Problem / goal

`docs/0016-reports.md` describes summary cards (revenue, orders, average payment, reservation count/by source) but omits the **overbooking slots** summary that the Reports UI already shows when `reservations.overbooking_slots_count > 0`. Operators and agents following the doc miss a shipped metric tied to 0025 overbooking.

## Evidence (008 preflight / review)

- Stale feature guide (~128d) outside the preflight top-14 list but same docs-vs-code theme
- UI: `front/src/app/reports/reports.component.html` summary card `overbooking` / `overbooking_slots_count`
- API: `back/app/reports_routes.py` returns `overbooking_slots_count`
- Sibling task marks the **0025 plan** as shipped; this task only patches the **reports user guide**

## High-level instructions for coder

- Edit **only** `docs/0016-reports.md` (and `docs/README.md` blurb only if the one-liner is wrong).
- Add one Features-table row (or short Summary bullet) for **Overbooking slots**: count of overbooked reservation slots in the selected date range; shown when count &gt; 0; sourced from reports reservations payload.
- Optionally one cross-link to `docs/0025-reservation-overbooking-detection.md` / reservations overbooking report — do not duplicate the full 0025 design.
- No product code changes; no chart/export redesign.
- Pass/fail: doc mentions `overbooking_slots_count` (or equivalent plain language) matching the Reports UI card.
