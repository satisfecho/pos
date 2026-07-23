# Index debug:working-plan-calendar in docs/testing.md

## GitHub Issues
- **Issue:** (none — enhancement reviewer)
- **0**

## Problem / goal

`front/package.json` already exposes **`debug:working-plan-calendar`** → `debug-working-plan-calendar.mjs` (inspect red/staffing days on the calendar). **`docs/testing.md`** documents other debug helpers (`debug-reservations`, public book) and will soon index **`test:working-plan-calendar`**, but the calendar **debug** alias is missing from the index — agents debugging staffing-day colouring re-discover the script only via package.json.

## Evidence (008 preflight / review)

- Weekly sweep 2026-07-23T18:33Z: `SIGNAL docs_stale×14` + `changelog_sparse` owned; `demo_tables_check=ok`; unqueued smoke/debug gap
- `npm run debug:working-plan-calendar --prefix front` resolves; script header documents `LOGIN_*` / `BASE_URL`
- `rg` on `docs/testing.md`: no `debug-working-plan-calendar` / `debug:working-plan-calendar`
- Sibling **`NEW-0-20260723-1724-index-working-plan-calendar-smoke-testing-doc`** owns the **test:** alias only — do **not** merge; this task is the **debug:** helper

## High-level instructions for coder

- Add a short **`docs/testing.md`** note (near working-plan / debug-reservations sections) for **`npm run debug:working-plan-calendar --prefix front`** → `scripts/debug-working-plan-calendar.mjs`
- Clarify it is a **debug** inspector (red/staffing days), not a pass/fail smoke; point readers to **`test:working-plan`** / **`test:working-plan-calendar`** for CI-style checks
- Documentation only — do not change the debug script unless the documented command is wrong
- Pass/fail: `rg 'debug:working-plan-calendar|debug-working-plan-calendar' docs/testing.md` hits; a reader can copy-paste a working command from the script header
