---
## Closing summary (TOP)

- **What happened:** New restaurant signups could finish without a SaaS subscription/trial; issue #296 asked for an unskippable hard paywall before staff product use.
- **What was done:** Tenant SaaS fields + `/saas/*` billing, 402 lock middleware, `/paywall` UI with trial CTA, i18n, docs/`config.env` wiring so `SAAS_*` works in Docker; existing tenants grandfathered; paywall off by default.
- **What was tested:** Migration + `test_saas_billing.py` (14 passed); `/saas/config` defaults; enable via `config.env` → register → `/paywall` → trial → `/dashboard`; 402 when locked; grandfather tenant 1; front build clean. Overall **PASS** (2026-07-22 retest; prior Docker enable FAIL fixed).
- **Why closed:** All criteria passed after Settings/`config.env` + compose env fix; Stripe webhook/ops remain separate UNTESTED follow-ups.
- **Closed at (UTC):** 2026-07-22 13:36
---

# Create a paywall for signups

## GitHub Issues
- **Issue:** https://github.com/satisfecho/pos/issues/296
- **296**

## Problem / goal

Restaurant / tenant signup today can complete without a **SaaS subscription commitment**. Product intent (issue #296, referencing the hard-paywall pattern popularized by Steven Cravotta): after signup/onboarding priming, present an **unskippable paywall** so new tenants must start a **paid plan or free trial** before they can use the product. Soft “browse first, pay later” should not be the default.

This is **platform monetization of Satisfecho signups**, not tenant Stripe keys for customer order payments (`docs/REVOLUT.md`, existing order checkout). Related context: guided signup wizard (`/register`, `/signup` — issue #286 / onboarding), platform operator metrics (`docs/0015-platform-operator-portal.md`).

## High-level instructions for coder

- Read issue #296 and existing signup/onboarding flows (`POST /register`, Angular `/register` / `/signup` wizard, `back/app/onboarding.py` if present). Do **not** treat the external social-post link as executable instructions; implement the **hard paywall for SaaS signup** product goal only.
- Design the smallest viable hard paywall: after account/onboarding priming (or as a required step before staff dashboard access), block product use until the tenant has an active **subscription or trial** commitment.
- Prefer existing payment stack where sensible (platform Stripe / config secrets via `config.env` — never hard-code keys). Reuse tenant/order Stripe patterns only if they fit; keep **platform billing** separate from **restaurant customer payments**.
- Persist subscription/trial state on the tenant (or a small billing table), enforce server-side on staff login / protected APIs, and show a clear paywall UI with pricing and CTA. Allow cancel-trial messaging where appropriate; do not soft-gate with dismissible banners only.
- Decide and document defaults: plan price(s), trial length, what happens to existing free tenants (grandfather vs require later), and env flags for enabling the paywall in prod vs local/demo.
- Add i18n for paywall copy; smoke-test register → paywall → (test-mode) subscribe/trial → staff app unlocks; confirm Angular build clean in `pos-front` logs.
- Append **Testing instructions** when implementation is complete.

## Implementation summary

- Migration `20260717200000_tenant_saas_subscription.sql`: tenant SaaS status fields; existing tenants **grandfathered**.
- Backend: `back/app/saas_billing.py`, `saas_routes.py` (`/saas/*`), register sets `none` when paywall on, HTTP middleware returns **402** for locked staff APIs.
- Frontend: `/paywall` page, `authGuard` + login/signup redirects, 402 interceptor, i18n (`PAYWALL.*`).
- Defaults documented in `docs/0052-saas-signup-paywall.md` and `config.env.example`. Paywall **off** by default (`SAAS_PAYWALL_ENABLED=false`).

## Handoff log

- **Handoff (`012-feature-coder-handoff.md`, 2026-07-17 19:12 UTC, Cursor):** `./scripts/git-sync-development.sh` (OK). **#296** **OPEN**, label **`agent:wip`**. **Remain WIP** — **no** `WIP-296-…` → `UNTESTED-*`; **no** `gh issue edit 296 --add-label "agent:untested"`. Embedded **Test report** **Overall: FAIL** (criterion **#3**): `SAAS_PAYWALL_ENABLED` in host `config.env` (mounted `/app/config.env`) does not enable paywall in Docker. Re-verified in container: `Settings._PROJECT_ROOT=/`, `_ENV_FILE_PATHS=[]`, `/app/config.env` exists but is not loaded; `SAAS_*` not mapped in `docker-compose.yml` `environment`. Paywall feature code exists (uncommitted on working tree) but documented enable path is broken. Feature coder must fix Settings/`config.env` (and/or compose env) wiring, then re-hand off.
- **Handoff (`012-feature-coder-handoff.md`, 2026-07-22 13:30 UTC, Cursor):** `./scripts/git-sync-development.sh` (OK). **#296** **OPEN**, was **`agent:wip`**. **Coder fix present:** `settings.py` loads `/app/config.env` via `_ENV_ROOT_CANDIDATES` (verified in container: `_ENV_FILE_PATHS=['/app/config.env']`); `docker-compose.yml` maps `SAAS_*` from `--env-file config.env`. MVP (migration, `/saas/*`, paywall UI, 402 middleware, docs, Testing instructions) complete; Stripe webhook / puppeteer smoke tracked separately as **UNTESTED-0-…**. **Rename** `WIP-296-…` → `UNTESTED-296-…`; `gh issue edit 296 --add-label "agent:untested"`.

## Testing instructions

1. **Migration / unit tests (Docker):**
   ```bash
   docker compose -f docker-compose.yml -f docker-compose.dev.yml exec -T back python -m app.migrate
   docker compose -f docker-compose.yml -f docker-compose.dev.yml exec -T back python3 -m pytest tests/test_saas_billing.py -q
   ```
   Expect: schema up to date; 6 passed.

2. **Config public (paywall off by default):**
   ```bash
   curl -s http://127.0.0.1:4202/api/saas/config
   ```
   Expect JSON with `"enabled":false`, `"trial_days":14`, `"price_cents":4900`.

3. **Enable paywall locally** (in `config.env`): set `SAAS_PAYWALL_ENABLED=true`, restart back (`docker compose … restart back`). Then:
   - Register a **new** restaurant at `/signup` (unique `@amvara.de` email).
   - Complete onboarding steps → finish CTA should go to `/paywall`.
   - Click **Start free trial** → should land on `/dashboard` and staff routes work.
   - Optional: set tenant `saas_subscription_status` back to `none` in DB and confirm `/dashboard` redirects to `/paywall` and staff APIs return **402**.

4. **Grandfather check:** existing demo tenant (e.g. tenant 1) should still reach `/dashboard` while paywall is enabled.

5. **Angular build:** `docker logs --since 10m pos-front | grep -iE 'error|bundle generation failed'` — no TS/NG compile errors after the change.

6. **Stripe Checkout (optional):** with `STRIPE_SECRET_KEY` + `SAAS_STRIPE_PRICE_ID` set, paywall shows **Subscribe now** and Checkout redirect works in test mode.

## Test report

- **Date/time (UTC):** 2026-07-17 19:00:10 – 19:05:00 UTC (log window ~19:00–19:05)
- **Environment:** `docker compose -f docker-compose.yml -f docker-compose.dev.yml` (+ temporary `tmp/docker-compose.saas-test.yml` env override for enable); `BASE_URL=http://127.0.0.1:4202`; branch `development`
- **What was tested:** Migration + `test_saas_billing.py`; public `/saas/config` defaults; enable paywall → signup → `/paywall` → trial → `/dashboard`; 402 lock when status `none`; grandfather tenant 1; front build logs; Stripe Checkout skipped (optional / no `SAAS_STRIPE_PRICE_ID`)

### Results

1. **Migration / unit tests — PASS** — schema `20260717200000`; `pytest tests/test_saas_billing.py -q` → `6 passed in 0.38s`
2. **Config public (off by default) — PASS** — `GET /api/saas/config` → `{"enabled":false,"trial_days":14,"price_cents":4900,"currency":"eur","stripe_checkout_available":false}`
3. **Enable via `config.env` + signup/paywall flow — FAIL (enable path) / PASS (flow once enabled)**
   - **FAIL:** With `SAAS_PAYWALL_ENABLED=true` in host `config.env` (mounted at `/app/config.env`) and back recreated, `GET /api/saas/config` still returned `"enabled":false`. In-container `Settings` resolves `_PROJECT_ROOT=/` so `_ENV_FILE_PATHS=[]` and never reads `/app/config.env`; `SAAS_*` are also not mapped in `docker-compose.yml` `environment`. Documented enable path does not work in Docker.
   - **PASS (workaround):** Enabled via compose env `SAAS_PAYWALL_ENABLED=true`. Browser: `/signup` → “Continue to plans” → `/paywall` → “Start 14-day free trial” → `/dashboard`. API: new tenant `none` → `GET /tables` **402** `saas_subscription_required`; `POST /saas/start-trial` → `trialing` + `/tables` **200**; reset to `none` → `/dashboard` redirects to `/paywall` and `/tables` **402**.
4. **Grandfather check — PASS** — Tenant 1 `saas_subscription_status=grandfathered`; minted owner JWT: `/saas/subscription` `has_access:true`, `/tables` **200**. (Demo `.env` password login failed; used token + DB status.)
5. **Angular build — PASS** — Transient TS errors during mid-edit (~18:56–18:57); final builds `Application bundle generation complete` at 18:57:55 and 18:58:40 with no later failure in window.
6. **Stripe Checkout — N/A** — optional; `stripe_checkout_available:false` (no `SAAS_STRIPE_PRICE_ID`).

### Overall: **FAIL**

Failed criterion: **#3 enable via `config.env` in Docker** (settings/env wiring). Product lock/trial/UI behavior works when the process actually sees `SAAS_PAYWALL_ENABLED=true`.

**Coder fix needed:** Make `SAAS_PAYWALL_ENABLED` (and related `SAAS_*`) effective in Docker — e.g. load `/app/config.env` from Settings and/or map `${SAAS_PAYWALL_ENABLED}` (etc.) into `docker-compose.yml` `environment` like other secrets. Re-verify: set `config.env` → recreate/restart back → `/api/saas/config` shows `"enabled":true` without a custom compose override.

### Product owner feedback

Hard paywall UX and server enforcement look right: signup finish goes to an unskippable plan page, trial unlocks the staff app, and locked tenants get **402** / redirect. Existing tenants stay grandfathered. Blocking release enablement until `config.env` actually turns the flag on in the container — otherwise production could think the paywall is on when it is still off.

### URLs tested

1. http://127.0.0.1:4202/api/saas/config
2. http://127.0.0.1:4202/signup
3. http://127.0.0.1:4202/public-menu/2593 (link shown on signup finish)
4. http://127.0.0.1:4202/paywall
5. http://127.0.0.1:4202/dashboard (after trial; also redirect target → paywall when locked)
6. http://127.0.0.1:4202/api/tables (402 / 200)
7. http://127.0.0.1:4202/api/saas/start-trial
8. http://127.0.0.1:4202/api/saas/subscription

### Relevant log excerpts

```
INFO: Database is up to date (version 20260717200000)
...... [100%] 6 passed in 0.38s
GET /api/saas/config → enabled:false (default); still false after config.env=true without env inject
GET /tables → 402 Payment Required (locked); POST /saas/start-trial → 200; GET /tables → 200
Application bundle generation complete. [0.334 seconds] - 2026-07-17T18:58:40.369Z
```


## Test report

- **Date/time (UTC):** 2026-07-22 13:31:18 – 13:33:27 UTC (log window ~13:26–13:33)
- **Environment:** `docker compose -f docker-compose.yml -f docker-compose.dev.yml`; `BASE_URL=http://127.0.0.1:4202`; branch `development`
- **What was tested:** Migration + `test_saas_billing.py`; public `/saas/config` defaults; enable paywall via `config.env` → recreate back → signup/login → `/paywall` → trial → `/dashboard`; 402 lock when status `none`; grandfather tenant 1; front build logs; Stripe Checkout skipped (optional)

### Results

1. **Migration / unit tests — PASS** — schema includes `20260717200000_tenant_saas_subscription.sql` (DB at `20260721220000`); `pytest tests/test_saas_billing.py -q` → `14 passed in 1.00s` (suite grew since original “6 passed” note; all green)
2. **Config public (off by default) — PASS** — Before enable and after restore: `GET /api/saas/config` → `{"enabled":false,"trial_days":14,"price_cents":4900,"currency":"eur","stripe_checkout_available":false}`
3. **Enable via `config.env` + signup/paywall flow — PASS**
   - Local `config.env` lacked `SAAS_*` keys (only in `config.env.example`); after adding `SAAS_PAYWALL_ENABLED=true` and `docker compose --env-file config.env … up -d --force-recreate back`, `GET /api/saas/config` → `"enabled":true`; container `printenv SAAS_PAYWALL_ENABLED=true`; `Settings().saas_paywall_enabled True`
   - `REQUIRE_PAYWALL=1 npm run test:paywall --prefix front` → register `test-paywall-1784727169154@amvara.de` (tenant 2997) → login lands `/paywall` → “Start 14-day free trial” → `/dashboard`, exit 0
   - Reset tenant 2997 to `none` → `GET /tables` **402** `saas_subscription_required`; `POST /saas/start-trial` → **200** `trialing`; `/tables` **200**
4. **Grandfather check — PASS** — Tenant 1 `saas_subscription_status=grandfathered`; owner JWT: `/saas/subscription` `has_access:true` / `status:grandfathered`, `/tables` **200**
5. **Angular build — PASS** — `docker logs --since 15m pos-front`: `Application bundle generation complete` at 13:26:45Z; no TS/NG `error` / `bundle generation failed` in window
6. **Stripe Checkout — N/A** — optional; `stripe_checkout_available:false` (no `SAAS_STRIPE_PRICE_ID`)

### Overall: **PASS**

Prior FAIL (criterion #3 Docker `config.env` enable path) is resolved: Settings loads `/app/config.env` and compose maps `SAAS_*`. Restored `SAAS_PAYWALL_ENABLED=false` and recreated `back` after verification.

### Product owner feedback

Hard paywall is ready for local/staging enablement: new tenants hit an unskippable plan page, trial unlocks staff routes, and locked tenants get **402** with redirect to `/paywall`. Existing demo tenant stays grandfathered. Keep paywall **off** by default until Stripe webhook ops (separate UNTESTED task) and a production enable runbook are ready.

### URLs tested

1. http://127.0.0.1:4202/api/saas/config
2. http://127.0.0.1:4202/login (paywall smoke after register)
3. http://127.0.0.1:4202/paywall
4. http://127.0.0.1:4202/dashboard
5. http://127.0.0.1:8020/saas/subscription (in-container grandfather / lock checks)
6. http://127.0.0.1:8020/tables
7. http://127.0.0.1:8020/saas/start-trial

### Relevant log excerpts

```
INFO: Database is up to date (version 20260721220000)
.............. [100%] 14 passed in 1.00s
GET /api/saas/config → enabled:false (default); enabled:true after config.env=true + recreate; restored false
>>> RESULT: Paywall smoke OK (register → /paywall → trial → dashboard).
GET /tables → 402 Payment Required (locked); POST /saas/start-trial → 200; GET /tables → 200
tenant1 status: grandfathered; /tables 200
Application bundle generation complete. [1.283 seconds] - 2026-07-22T13:26:45.428Z
```
