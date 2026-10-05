---
## Closing summary (TOP)

- **What happened:** Production compose never set `PRODUCTION`, so Secure cookies and prod rate limits did not apply.
- **What was done:** Set `PRODUCTION=true` on `back` in `docker-compose.prod.yml` and documented it for operators.
- **What was tested:** Prod overlay env, dev non-production settings, landing `200` and `/api/token` `401` via HAProxy — all PASS.
- **Why closed:** All tester criteria passed.
- **Closed at (UTC):** 2026-10-05 16:09
---

# Set PRODUCTION in docker-compose prod overlay (#420)

## GitHub Issues
- **Issue:** https://github.com/satisfecho/pos/issues/420
- **420**

## Status
- **WIP → UNTESTED:** Implementation complete (2026-10-05T16:02:00Z).

## Problem / goal
`PRODUCTION` is never set in `docker-compose.prod.yml`, so `settings.is_production` stays `False` in production. Auth cookies omit the `Secure` flag, and login/register/payment rate limits stay on relaxed dev values. HAProxy HTTP→HTTPS helps cookies partially, but production should set `PRODUCTION=true` (or the documented env alias). See `docs/SECURITY-REVIEW.md` (cookie flags) and `docs/0004-deployment.md` / `docs/0001-ci-cd-amvara9.md`.

## High-level instructions for coder
- Set `PRODUCTION=true` (or the env name `settings` already reads via `validation_alias`) for the **backend** (and any other service that reads the same flag) in the **prod** compose overlay only — not in the default/dev overlay.
- Verify cookie `secure=` and production rate-limit paths use `settings.is_production` as intended after the env is set.
- Update deploy/docs briefly if operators must also set `PRODUCTION` in `config.env` (prefer compose overlay so amvara9 gets it without a silent miss).
- Confirm local `docker-compose.dev.yml` still runs with `is_production=False`.
- Smoke: inspect prod overlay env; in dev, login still works; no regression on `/api/token` happy path.

## What was done
- Added `back.environment: PRODUCTION=true` to **`docker-compose.prod.yml`** (compose env overrides mounted `config.env`).
- Documented in **`config.env.example`**, **`docs/0004-deployment.md`**, **`docs/0001-ci-cd-amvara9.md`**, **`docs/SECURITY-REVIEW.md`**, **`CHANGELOG.md`**.
- Confirmed: prod `config` shows `PRODUCTION: "true"`; running **dev** back has `is_production=False` and relaxed login limit (100); `/api/token` still responds on HAProxy.

## Testing instructions

1. **Prod overlay env (no need to start prod stack):**
   ```bash
   docker compose -f docker-compose.yml -f docker-compose.prod.yml config | grep -A2 'PRODUCTION'
   ```
   Expect `PRODUCTION: "true"` under the **back** service.

2. **Dev still non-production:**
   ```bash
   docker compose -f docker-compose.yml -f docker-compose.dev.yml exec -T back \
     python -c "from app.settings import settings; print(settings.is_production, settings.rate_limit_login_per_15min)"
   ```
   Expect `False` and a relaxed login limit (e.g. `100`), not the production `5`.

3. **Smoke (dev HAProxy port from `docker compose ps`, often 4202 or 14202):**
   ```bash
   BASE=http://127.0.0.1:14202   # or 4202
   curl -s -o /dev/null -w "%{http_code}\n" "$BASE/"
   curl -s -o /dev/null -w "%{http_code}\n" -X POST "$BASE/api/token" \
     -H 'Content-Type: application/x-www-form-urlencoded' \
     -d 'username=nobody@invalid.local&password=wrong'
   ```
   Expect landing `200` and token `401` (endpoint alive; bad credentials).

4. **Optional after amvara9 recreate:** `docker compose exec back python -c "from app.settings import settings; print(settings.is_production)"` → `True`; successful login `Set-Cookie` includes `Secure`.

## Test report

1. **Date/time (UTC):** 2026-10-05T16:08:18Z → 2026-10-05T16:08:35Z. Log window: last ~5 minutes on `pos-back`.
2. **Environment:** `docker-compose.yml` + `docker-compose.dev.yml` (running); prod check via `docker-compose.yml` + `docker-compose.prod.yml config` only (no prod stack start). `BASE_URL=http://127.0.0.1:14202`. Branch: `development`.
3. **What was tested:** Prod overlay sets `PRODUCTION=true` on `back`; dev keeps `is_production=False` and relaxed login rate limit; landing and `/api/token` smoke via HAProxy.
4. **Results:**
   - Prod overlay `back.PRODUCTION=true`: **PASS** — `docker compose …prod.yml config` → `back.PRODUCTION= true`; `docker-compose.prod.yml` line 9 `- PRODUCTION=true`.
   - Dev non-production / relaxed limit: **PASS** — `False 100` from `settings.is_production` / `rate_limit_login_per_15min`.
   - Landing smoke: **PASS** — `GET http://127.0.0.1:14202/` → `200`.
   - Token endpoint alive: **PASS** — `POST /api/token` bad credentials → `401`; back log `POST /token HTTP/1.1" 401 Unauthorized`.
   - Optional amvara9 recreate: **N/A** — not run (local-only instructions; optional post-deploy).
5. **Overall:** **PASS**
6. **Product owner feedback:** Prod overlay now forces `PRODUCTION=true` on the backend so Secure cookies and prod rate limits can take effect after recreate. Local/dev remains non-production with the relaxed login limit. Optional amvara9 confirmation (live `is_production` + Secure cookie) is still worthwhile after the next prod deploy.
7. **URLs tested:**
   1. http://127.0.0.1:14202/
   2. http://127.0.0.1:14202/api/token (POST)
   3. http://127.0.0.1:14202/api/health
8. **Relevant log excerpts:**
```
INFO:     172.23.0.7:37446 - "POST /token HTTP/1.1" 401 Unauthorized
INFO:     172.23.0.7:37462 - "GET /health HTTP/1.1" 200 OK
```
