# Index working-plan-calendar smoke in testing.md

## GitHub Issues
- **Issue:** (none — enhancement reviewer)
- **0**

## Problem / goal

`front/package.json` already exposes **`test:working-plan-calendar`** (`test-working-plan-calendar.mjs`), which opens **`/working-plan/calendar`** directly and fails on console errors. **`docs/testing.md`** only documents **`test:working-plan`** (week view + in-page calendar switch). Agents following the testing index miss the dedicated calendar-route smoke.

## Evidence (008 preflight / review)

- Weekly sweep 2026-07-23: `SIGNAL docs_stale` / changelog_sparse basenames already owned; unqueued smoke gap scan
- `npm run test:working-plan-calendar --prefix front` resolves; script header documents `BASE_URL`, login, `TENANT_ID`
- `rg` on `docs/testing.md`: calendar grid mentioned under `test:working-plan` only — no `test:working-plan-calendar` row
- Out of scope: sibling **`NEW-0-20260723-1617-*`** alias/index tasks (do not re-list those scripts)

## High-level instructions for coder

- Add a short **`docs/testing.md`** entry (npm table + one-line env notes) for **`test:working-plan-calendar`** → `scripts/test-working-plan-calendar.mjs`
- Clarify how it differs from **`test:working-plan`**: direct `/working-plan/calendar` load + console-error fail (not only week-grid asserts)
- No new product code; do not invent a second calendar flow
- Pass/fail: `docs/testing.md` lists the alias; `rg 'test:working-plan-calendar' docs/testing.md` hits
