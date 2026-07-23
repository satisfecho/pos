# Document courier test credentials in config.env.example / AGENTS

## GitHub Issues
- **Issue:** (none — enhancement reviewer)
- **0**

## Problem / goal

Courier portal smokes and demos need login env (`COURIER_EMAIL` / `COURIER_PASSWORD`, defaults in `test-courier-actions.mjs`), but **`config.env.example`** and **`AGENTS.md`** only document **`PROVIDER_TEST_*`** (and commented **`PLATFORM_OPERATOR_*`**). Contributors and the upcoming demo-courier seed rediscover credentials from script headers instead of the shared env template.

## Evidence (008 preflight / review)

- Weekly sweep 2026-07-23T20:14Z: SIGNAL docs/changelog owned; demo OK; NEW backlog deep — small discoverability gap after **2.1.30** Delivery seed + open courier-user seed
- `rg COURIER_EMAIL|PROVIDER_TEST config.env.example` → no courier; provider/platform present
- `AGENTS.md` Provider portal paragraph documents `PROVIDER_TEST_*` only; no courier equivalent
- Sibling **`NEW-0-20260723-2004-seed-demo-courier-user-tenant-1`** owns creating the user — this task owns **env/docs discoverability** only (align names with smoke defaults: `COURIER_EMAIL` / `COURIER_PASSWORD`)

## High-level instructions for coder

- Add commented (or example) **`COURIER_EMAIL`** / **`COURIER_PASSWORD`** to **`config.env.example`** next to provider/platform test credentials; use the same non-secret defaults already in `front/scripts/test-courier-actions.mjs` (or point to them)
- Add a short **Courier portal (manual testing)** bullet in **`AGENTS.md`** parallel to the Provider portal note (`/courier/login`)
- Optional one-liner in **`docs/0053`** or **`docs/testing.md`** courier smoke env table — do not rewrite 0053
- Coordinate naming with the demo-courier seed NEW so seed and smokes share one env pair; no live production secrets
- Pass/fail: `rg COURIER_EMAIL config.env.example AGENTS.md` hits; defaults match smoke script; no product code required
