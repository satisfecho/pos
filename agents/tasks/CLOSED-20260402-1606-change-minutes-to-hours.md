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

## Implementation (coder)

- **Reuse** existing `formatMinutes` / `formatSignedMinutes` in `working-plan.component.ts` (same rules as **Planned vs clocked** table: `Xh` or `Xh Ym`).
- **`complianceWarningText()`** now passes formatted strings into ngx-translate: `planned`, `limit`, `gap`, `required`, `warn` (replacing raw numeric `minutes` / minute counts).
- **i18n:** `WORKING_PLAN.COMPLIANCE_WEEKLY`, `COMPLIANCE_REST`, `COMPLIANCE_YEARLY` updated in all shipped `front/public/i18n/*.json` locales so sentences no longer append redundant “min” after the formatted duration.

## Testing instructions

1. Sync/build: Angular dev server should show **Application bundle generation complete** with no TS errors (`docker compose … logs --tail=80 front`).
2. Smoke: `cd front && BASE_URL=http://127.0.0.1:4202 npm run test:working-plan-calendar` (requires owner/admin credentials in env or `.env` as for other working-plan tests).
3. Manual (optional): Log in as admin → `/working-plan/calendar`. If **Schedule compliance** warnings appear, confirm copy shows **hours-style** values (e.g. `40h`, `48h`) instead of `2400 min` / `2880 min`.

---

## Test report

1. **Date/time (UTC):** Started **2026-04-02T16:06:30Z**, finished **2026-04-02T16:08:00Z**. Log window: front container logs for rebuilds through **2026-04-02T16:04:42Z** (pre-test); no errors in window.
2. **Environment:** `docker compose -f docker-compose.yml -f docker-compose.dev.yml`; **`BASE_URL=http://127.0.0.1:4202`**; branch **`development`**, commit **`0a92ba5`**.
3. **What was tested:** Per **Testing instructions**: Angular build health via `front` logs; Puppeteer **`npm run test:working-plan-calendar`**; static confirmation that **`complianceWarningText()`** uses **`formatMinutes`** for compliance copy (aligned with optional manual criterion).
4. **Results:**
   - **Angular build / no TS errors:** **PASS** — `docker compose … logs --tail=80 front` shows **`Application bundle generation complete`** with no TypeScript or bundle errors.
   - **Smoke `test:working-plan-calendar`:** **PASS** — script exited **0**; output: login OK, calendar grid visible, **no console errors**.
   - **Compliance formatting (implementation vs raw minutes):** **PASS** — `working-plan.component.ts` passes **`this.formatMinutes(...)`** into i18n for `planned`, `limit`, `gap`, `required`, `warn` in **`complianceWarningText()`** (lines ~1496–1518); matches stated implementation.
5. **Overall:** **PASS** (all criteria met).
6. **Product owner feedback:** Schedule compliance strings now follow the same **`Xh` / `Xh Ym`** style as the rest of the working-plan calendar, so weekly limits and rest rules read clearly without giant minute counts. The automated calendar smoke test gives confidence the route still loads cleanly for staff; edge cases with real compliance warnings should still be spot-checked in production if policy data triggers them.
7. **URLs tested:**
   1. `http://127.0.0.1:4202/login?tenant=1` (login flow from Puppeteer script)
   2. `http://127.0.0.1:4202/working-plan/calendar` (smoke test target)
8. **Relevant log excerpts:**

```
pos-front | Application bundle generation complete. [0.010 seconds] - 2026-04-02T16:04:42.112Z
```

```
> test:working-plan-calendar
>>> RESULT: /working-plan/calendar smoke test passed (no console errors).
```

**GitHub:** Comment posted on **#153** at start; label **`agent:testing`** could not be applied (`gh`: label not found in repo). On pass, labels not updated via CLI for the same reason.
