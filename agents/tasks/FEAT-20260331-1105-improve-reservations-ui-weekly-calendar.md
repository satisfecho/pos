# Improve reservations UI at `/reservations`

## GitHub

- **Issue:** https://github.com/satisfecho/pos/issues/125

## Problem / goal

Staff and customers need a clearer **weekly booking calendar** on the reservations experience (`/reservations`): strict **7-column Mon–Sun grid** with visible thin borders per day; **single-letter weekday headers** (locale-appropriate where applicable); distinct **visual states** for days — **selected** (solid dark background, light text), **full** (medium grey when max capacity for that service/slot is reached for the current party size), **closed** (light grey, strikethrough or faded, non-clickable), **available** (clean white/light cell). Add a **legend** (e.g. filled dot selected, filled dot full, hollow closed) and ensure the grid **reacts when “number of guests” and service type (e.g. lunch/dinner)** change so a day becomes “full” if remaining capacity is below the selected party size. Below the calendar, show a concise **summary** (guests, service, date, time-slot control). Align with existing reservation/week-slot APIs and tenant capacity settings; see issue on GitHub for the reference mockup image.

## High-level instructions for coder

- Refine **`/reservations`** (staff modal and any shared week-grid component) to match the layout and state model above without breaking existing create/edit and capacity rules.
- Wire **closed**, **full**, and **available** cells to backend or existing `book-week-slots` / capacity data; keep **multi-tenant** and timezone behavior consistent with public `/book` where components are shared.
- Ensure **accessibility** (contrast, keyboard where applicable) and **i18n** for weekday letters and legend labels.
- Update or extend **Puppeteer** reservation scripts if selectors or flows change; run relevant smoke/tests per `AGENTS.md`.
