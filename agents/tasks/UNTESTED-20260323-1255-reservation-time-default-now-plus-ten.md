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

## Implementation summary (coder)

- **`front/src/app/book/book.component.ts`:** Replaced fixed **`20:00`** with **`earliestQuarterHHmmAfterLeadMinutes(10, tz)`** (constructor uses browser TZ until tenant loads). **`seedPublicBookInitialTime()`** sets the first **`bookableTimeOptions()`** slot after tenant load (respects opening hours + 10 min lead for “today”), then **`onDateChange`** still refines via **`GET /reservations/next-available`** (default **`min_lead_minutes=10`**). **`roundTimeToQuarter`** empty fallback uses the same 10‑minute rule.
- **`front/src/app/reservations/reservations.component.ts`:** **New reservation** defaults to **`staffNowPlusTenDateAndTime()`** (local calendar date + **`now + 10`** HH:mm). If “today” is selected but **now+10** falls on the **next calendar day**, the form date rolls forward and **`onFormDateChange`** is re-run. For **non-today** dates, time still comes from **next-available** (`min_lead_minutes=0`). **List filter** and **openCreate** use **local** YYYY-MM-DD instead of **`toISOString().slice(0,10)`** (UTC).
- **`CHANGELOG.md`** `[Unreleased]` updated.

## Testing instructions

1. Stack up: **`docker compose -f docker-compose.yml -f docker-compose.dev.yml`** (or **`./run.sh`**); app on **`http://127.0.0.1:4202`** (or HAProxy port from **`docker compose ps`**).
2. **Public book:** Open **`/book/1`** (or any tenant). After load, confirm the **time** select is the **first quarter-hour ≥ now+10** in tenant TZ (or first slot inside opening hours), not a fixed **20:00** (unless the next-available API returns that). Change party size / date and confirm no console errors.
3. **Staff:** Log in, **Reservations → New**. **Date** should match the local calendar day for **now+10**; **time** ≈ current time + 10 minutes. Pick a **future** date: time should match **suggested / next-available** behaviour. **`Suggested time`** still shows API hint.
4. Automated: **`cd front && BASE_URL=http://127.0.0.1:4202 node scripts/debug-reservations-public.mjs`**; **`BASE_URL=http://127.0.0.1:4202 npm run test:landing-version`** (with demo **`LOGIN_*`** if exercising staff nav).
5. **Front build:** **`docker compose -f docker-compose.yml -f docker-compose.dev.yml logs --tail=80 front`** — no **TS** / **NG** errors after edits.
