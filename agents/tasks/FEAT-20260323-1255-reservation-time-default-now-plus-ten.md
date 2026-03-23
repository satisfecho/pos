# Feedback / Time in reservation have to be the time now + 10 minutes

## GitHub
- **Issue:** https://github.com/satisfecho/pos/issues/62

## Problem / goal
When choosing a reservation time, the default should reflect **“now + 10 minutes”** (or equivalent minimum lead time), instead of a static or confusing default. Optionally, the product direction may evolve toward a richer calendar with only **available** days/hours (may overlap with issue #64).

## High-level instructions for coder
- Find where reservation date/time defaults are set (public book flow and staff reservation UI); confirm tenant or global rules for minimum notice and slot granularity.
- Set the initial picker value to **current time + 10 minutes** (or reuse tenant-configurable lead time if it already exists—prefer one source of truth).
- Ensure validation rejects times in the past or inside the blocked window; keep behaviour consistent across locales and timezones.
- Coordinate with any parallel work on issue **#64** so defaults and calendar UX stay coherent.
- Document user-visible change in **`CHANGELOG.md`** **`[Unreleased]`**; smoke-test **`front/scripts/debug-reservations-public.mjs`** and/or staff reservation script as appropriate.
