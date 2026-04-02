# Change minutes to hours

## GitHub Issues
- [github.com/satisfecho/pos/issues](https://github.com/satisfecho/pos/issues)
- `gh issue list --repo satisfecho/pos --state open --limit 40`
- Optional: `--json number,title,labels,updatedAt,url`
- **Issue:** https://github.com/satisfecho/pos/issues/153

## Problem / goal
On `/working-plan/calendar`, **Schedule compliance (heuristic checks)** shows planned time and weekly limits as raw **minutes** (e.g. 2880 min, 2400 min). Stakeholders want values that read naturally as **hours and minutes** (and/or hours with remainder), e.g. clarifying that 2400 minutes corresponds to **40 h** or similar, everywhere this block presents minute totals.

## High-level instructions for coder
- Locate the working-plan calendar UI that renders **Schedule compliance (heuristic checks)** and the minute-based strings (production: `satisfecho.de/working-plan/calendar`).
- Introduce a consistent formatting helper (or reuse an existing duration formatter in the app) so displayed values use **human-readable** units: e.g. **X h Y min**, or **X h** when whole hours, per product preference—keep i18n in mind if strings are translated.
- Ensure weekly limits and “planned” totals use the **same** formatting rules; avoid ambiguous rounding.
- Add or extend a small test or smoke path if the repo already has `test:working-plan-calendar` or similar; otherwise verify manually on the calendar route.
