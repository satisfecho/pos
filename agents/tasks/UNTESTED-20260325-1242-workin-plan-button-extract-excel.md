# Workin plan button extract excel

## GitHub

- **Issue:** https://github.com/satisfecho/pos/issues/89

## Problem / goal

Add a control to **export the working-plan calendar for a month** (e.g. March when current month is March) as **Excel**. The export must be scoped by **worker**: a **dropdown of workers**; choosing e.g. **waiter Sara** exports **Sara’s** schedule for that month only.

## High-level instructions for coder

- Locate working-plan UI and existing export/report patterns (if any) in `front/` and `back/`.
- Add **worker selector** + **export** action; define file format (columns, timezone, locale) consistent with the rest of the app.
- Implement server-side or client-side generation as appropriate (prefer existing Excel/CSV utilities in the repo).
- Cover auth/tenant scoping so staff only export workers they may see; add a minimal API or component test if the project has equivalents.

## Coder notes (implementation)

- **Backend:** `GET /schedule/export` in `back/app/main.py` (registered **before** `/schedule/{shift_id}`). Query: `user_id`, `year`, `month` (1–12), optional `lang`. Requires `SCHEDULE_READ`. Target user must belong to the tenant and have a schedulable role (same set as shift creation). Excel built with openpyxl; columns: date, start, end, label, employee name, role (localized headers via `back/app/schedule_export_i18n.py`).
- **Frontend:** `working-plan.component.ts` — worker `<select>` + “Export Excel”; month scope from **calendar** = `calendarMonth`, from **week** = month of `weekRange().from` (Monday of displayed week). `ApiService.getScheduleExport` uses `LanguageService` for `lang`. i18n: `WORKING_PLAN.EXPORT_*` in all `public/i18n/*.json`.
- **Tests:** `back/tests/test_schedule_export.py`; `front/scripts/test-working-plan.mjs` asserts `[data-testid="working-plan-export-worker"]` and `working-plan-export-excel`.

---

## Testing instructions

### What to verify

- Export UI appears on Working plan when schedulable users exist; chosen worker + month matches the current view rules; downloaded `.xlsx` opens and lists that worker’s shifts for that calendar month only; API rejects `user_id` from another tenant.

### How to test

1. **Backend (Docker):** from repo root, with stack up:
   `docker compose -f docker-compose.yml -f docker-compose.dev.yml exec -T back python3 -m pytest tests/test_schedule_export.py -q`
2. **Frontend smoke:** app on HAProxy (e.g. `http://127.0.0.1:4202`), credentials with schedule access:
   `cd front && BASE_URL=http://127.0.0.1:4202 npm run test:working-plan`
3. **Manual:** Log in → Working plan → pick worker → Export Excel; open file and confirm rows match **Schedule** for that worker in calendar/week view for the month shown in the hint.

### Pass / fail criteria

- **Pass:** All three pytest tests pass; Puppeteer working-plan test passes; manual export matches visible schedule for the selected worker/month.
- **Fail:** 403/400 on valid tenant worker, wrong user’s shifts in file, missing export controls when users exist, or Angular/build errors in `docker compose … logs front`.
