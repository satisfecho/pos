---
## Closing summary (TOP)

- **What happened:** Enhancement task to add a durable Puppeteer smoke for the SaaS signup paywall path (supports #296).
- **What was done:** Added `front/scripts/test-paywall.mjs` + `test:paywall`, documented in `docs/testing.md` / `docs/0052`, and wired `SAAS_*` env so paywall flags apply in Docker.
- **What was tested:** Skip path (paywall off) and full register → `/paywall` → free trial → `/dashboard` with `REQUIRE_PAYWALL=1`; both EXIT=0; paywall restored off. Overall PASS.
- **Why closed:** All tester criteria passed.
- **Closed at (UTC):** 2026-07-22 14:03
---

# Add Puppeteer smoke for SaaS signup paywall

## GitHub Issues
- **Issue:** (none — enhancement reviewer; supports #296)
- **0**

## Problem / goal

Paywall implementation (**WIP-296**) and **`docs/0052-saas-signup-paywall.md`** describe register → `/paywall` → trial/Checkout → staff unlock, but there is **no** `front/scripts/test-*-paywall*.mjs` (or `npm` alias) and **`docs/testing.md`** does not list a paywall smoke. Agents and humans cannot regression-check the hard-paywall path the way they do for courier/delivery/reservations. Before enabling **`SAAS_PAYWALL_ENABLED`** anywhere non-local, a durable headless smoke is needed.

## Evidence (008 preflight / review)

- Weekly improvement sweep; open **WIP-296** paywall + `back/tests/test_saas_billing.py` API coverage only
- `rg` on `front/scripts` / `front/package.json`: no paywall/saas Puppeteer script or `test:paywall` script
- Open **NEW-0-20260722-1142-index-courier-delivery-smokes-in-testing-doc.md** covers courier/delivery index only — not paywall
- Do **not** expand WIP-296 product scope here; add smoke + testing index once `/paywall` exists on the branch

## High-level instructions for coder

- Add `front/scripts/test-paywall.mjs` (or similar) that, with paywall enabled in the test env (compose override or documented env), exercises: register or login of a **non-grandfathered** tenant → lands on `/paywall` → Start free trial (or mocked confirm) → staff route unlocks
- Prefer env flags already in `config.env.example` (`SAAS_PAYWALL_ENABLED`, trial defaults); never commit secrets; skip gracefully with a clear message if paywall cannot be enabled in that environment
- Register `test:paywall` in `front/package.json`; document under Test scripts in **`docs/testing.md`** (may land in the same PR as the courier/delivery testing index if that NEW is still open — avoid duplicate subsections)
- i18n: assert visible copy or absence of raw `PAYWALL.*` keys if the script checks UI strings
- Pass criteria: script exits 0 on local HAProxy URL when paywall test mode is available; `docs/testing.md` has a copy-paste command
- Append **Testing instructions** when implementation is complete

## Implementation notes (010)

- Added `front/scripts/test-paywall.mjs` + `npm run test:paywall`
- Documented in `docs/testing.md` and noted in `docs/0052-saas-signup-paywall.md`
- Wired `SAAS_*` into `docker-compose.yml` `back` environment; fixed `back/app/settings.py` to load `/app/config.env` in Docker so paywall flags from `config.env` actually apply
- Verified full path with paywall on (exit 0) and skip path with paywall off (exit 0); local `config.env` left with paywall **off**

## Testing instructions

1. App up on HAProxy (e.g. `http://127.0.0.1:4202`).
2. Default (paywall off) — expect SKIP, exit 0:
   ```bash
   BASE_URL=http://127.0.0.1:4202 npm run test:paywall --prefix front
   ```
3. Full hard-paywall path:
   - Set `SAAS_PAYWALL_ENABLED=true` in `config.env`
   - `docker compose --env-file config.env -f docker-compose.yml -f docker-compose.dev.yml up -d back`
   - Wait until `curl -s http://127.0.0.1:4202/api/saas/config` shows `"enabled":true`
   - Run:
     ```bash
     BASE_URL=http://127.0.0.1:4202 REQUIRE_PAYWALL=1 npm run test:paywall --prefix front
     ```
   - Expect: register → `/paywall` → Start free trial → `/dashboard`, exit 0
   - Restore `SAAS_PAYWALL_ENABLED=false` and recreate `back` so local/demo stays unlocked
4. Confirm `docs/testing.md` lists `test:paywall` in the npm scripts table and has the SaaS signup paywall subsection.

## Test report

- **Date/time (UTC):** 2026-07-22 14:01:40 – 14:02:19 UTC (log window ~14:01–14:02)
- **Environment:** `docker-compose.yml` + `docker-compose.dev.yml`; `BASE_URL=http://127.0.0.1:4202`; branch `development`. Temporarily set `SAAS_PAYWALL_ENABLED=true` in `config.env`, recreated `back`, then restored `false` and recreated `back` again (local/demo unlocked).
- **What was tested:** Puppeteer skip path (paywall off), full hard-paywall path with `REQUIRE_PAYWALL=1`, docs/npm index for `test:paywall`, restore to paywall off.

### Results

| Criterion | Result | Evidence |
|-----------|--------|----------|
| App up on HAProxy | PASS | `curl` home → 200 |
| Default skip (paywall off) exit 0 | PASS | `npm run test:paywall` → `SKIP: SAAS_PAYWALL_ENABLED is false`, EXIT=0 |
| Full path: register → `/paywall` → trial → `/dashboard` | PASS | `REQUIRE_PAYWALL=1`: tenant_id 3018, email `test-paywall-1784728921362@amvara.de`; after login `…/paywall`; copy `Start 14-day free trial` (no raw `PAYWALL.*`); after trial `…/dashboard`; `>>> RESULT: Paywall smoke OK`, EXIT=0 |
| `docs/testing.md` lists `test:paywall` + SaaS subsection | PASS | npm scripts table L425; coverage row; `### SaaS signup paywall` L540 with copy-paste commands |
| `front/package.json` has `test:paywall` | PASS | `"test:paywall": "node scripts/test-paywall.mjs"` |
| Restore paywall off | PASS | After restore, `/api/saas/config` → `"enabled":false`; skip path again EXIT=0 |

- **Overall:** **PASS**
- **Product owner feedback:** The paywall smoke is ready for agents and humans: it skips cleanly when the flag is off and exercises register → paywall → free trial → dashboard when enabled. Docs include a copy-paste command. Safe to use before turning `SAAS_PAYWALL_ENABLED` on outside local.
- **URLs tested:**
  1. http://127.0.0.1:4202/
  2. http://127.0.0.1:4202/api/saas/config
  3. http://127.0.0.1:4202/login
  4. http://127.0.0.1:4202/paywall
  5. http://127.0.0.1:4202/dashboard

### Relevant log excerpts

Puppeteer (full path, EXIT=0):

```
GET /api/saas/config: {"enabled":true,...}
Registered tenant_id: 3018
URL after login: http://127.0.0.1:4202/paywall
Paywall copy OK: Start 14-day free trial
URL after trial: http://127.0.0.1:4202/dashboard
>>> RESULT: Paywall smoke OK (register → /paywall → trial → dashboard).
```

Skip path after restore:

```
GET /api/saas/config: {"enabled":false,...}
SKIP: SAAS_PAYWALL_ENABLED is false. ...
EXIT=0
```

`pos-back` after restore recreate (prior instance logs rotated on recreate):

```
INFO: ... "GET /saas/config HTTP/1.1" 200 OK
```

`pos-front`: no build failures in window; only pre-existing NG8107 optional-chain warnings.
