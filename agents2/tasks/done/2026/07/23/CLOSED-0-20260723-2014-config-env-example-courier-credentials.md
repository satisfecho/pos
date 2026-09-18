---
## Closing summary (TOP)

- **What happened:** Docs gap — courier portal test credentials were missing from `config.env.example` and `AGENTS.md` while provider/platform credentials were documented.
- **What was done:** Added commented `COURIER_EMAIL` / `COURIER_PASSWORD` to `config.env.example`, a Courier portal manual-testing note in `AGENTS.md`, and a one-liner in `docs/testing.md`; defaults aligned with smoke script and demo seed.
- **What was tested:** Docs-only `rg` verification — courier env present in both files, commented examples, defaults match `test-courier-actions.mjs`; overall **PASS**.
- **Why closed:** All pass/fail criteria met; no product code required.
- **Closed at (UTC):** 2026-07-25 23:30
---

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

## Implementation notes (coder)

- Added commented `COURIER_EMAIL` / `COURIER_PASSWORD` to `config.env.example` next to platform-operator test credentials (defaults match smoke + `seed_demo_courier_user`).
- Added **Courier portal (manual testing)** paragraph in `AGENTS.md` parallel to Provider portal (`/courier/login`).
- One-liner on `test:courier-actions` env in `docs/testing.md` quick-reference table; left `docs/0053` unchanged (already documents the same defaults).
- Sibling seed task already CLOSED; naming aligned (`COURIER_EMAIL` / `COURIER_PASSWORD`).

## Testing instructions

### What to verify

- `config.env.example` documents commented courier credentials with the smoke/seed defaults.
- `AGENTS.md` has a Courier portal manual-testing note pointing at `/courier/login` and the same env names.
- Defaults match `front/scripts/test-courier-actions.mjs` (`courier-test-phase1@amvara.de` / `secret`).
- No product/runtime code changes; no live secrets committed.

### How to test

From repo root:

```bash
rg -n 'COURIER_EMAIL' config.env.example AGENTS.md
rg -n 'COURIER_PASSWORD|courier-test-phase1@amvara.de' config.env.example AGENTS.md front/scripts/test-courier-actions.mjs
# Optional discoverability check:
rg -n 'COURIER_EMAIL' docs/testing.md
```

No Docker / Puppeteer required for this docs-only change.

### Pass/fail criteria

- **Pass:** `rg COURIER_EMAIL config.env.example AGENTS.md` hits both files; values match smoke script defaults; `config.env.example` lines remain commented examples.
- **Fail:** Missing from either file, mismatched defaults, or accidental uncommented production secrets.

## Test report

1. **Date/time (UTC):** 2026-07-25T23:30:16Z – 2026-07-25T23:30:16Z. Log window: N/A (docs-only; no Docker/Puppeteer).
2. **Environment:** Local git tree on branch `development` @ `6b4dce51`. Compose/BASE_URL unused (docs verification only).
3. **What was tested:** Courier credential discoverability in `config.env.example` + `AGENTS.md`; defaults aligned with `front/scripts/test-courier-actions.mjs`; optional `docs/testing.md` mention; no uncommented live secrets.
4. **Results:**
   - `rg COURIER_EMAIL` hits `config.env.example` and `AGENTS.md` — **PASS** (`config.env.example:131`, `AGENTS.md:131`).
   - Commented example lines for courier email and password in `config.env.example` — **PASS** (no uncommented `COURIER_=` assignments).
   - `AGENTS.md` Courier portal note with `/courier/login` and same env names — **PASS** (line 131, parallel to Provider portal).
   - Defaults match smoke script (`courier-test-phase1@amvara.de` / `secret`) — **PASS** (`test-courier-actions.mjs` lines 129–130; seed defaults match).
   - Optional `docs/testing.md` discoverability — **PASS** (`test:courier-actions` row + demo courier seed note).
   - No product/runtime secrets committed — **PASS** (commented examples only; demo defaults, not production secrets).
5. **Overall:** **PASS**
6. **Product owner feedback:** Courier login env is now findable next to provider/platform credentials, so contributors no longer have to dig through Puppeteer headers. Defaults stay aligned with the smoke script and demo seed. Docs-only change is sufficient for this discoverability gap.
7. **URLs tested:** N/A — no browser
8. **Relevant log excerpts:** N/A — no containers used for this verification.
