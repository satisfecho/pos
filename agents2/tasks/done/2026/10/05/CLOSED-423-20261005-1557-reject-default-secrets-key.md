---
## Closing summary (TOP)

- **What happened:** Production could boot with the documented placeholder `SECRET_KEY` / `REFRESH_SECRET_KEY`, leaving JWTs and Fernet-backed payment secrets under a world-known key.
- **What was done:** Settings validation rejects placeholder secrets when `is_production` is true; docs/deploy notes updated; unit coverage added; local/dev still allows placeholders.
- **What was tested:** Six pytest cases passed; dev health 200 with placeholders; prod subprocess refuse returned `REJECTED`; deploy script still generates real keys on virgin setup.
- **Why closed:** All tester criteria passed.
- **Closed at (UTC):** 2026-10-05 16:32
---

# Reject default SECRET_KEY placeholder (#423)

## GitHub Issues
- **Issue:** https://github.com/satisfecho/pos/issues/423
- **423**

## Status
- **Implemented:** 2026-10-05T16:07:34Z (UTC)
- Renamed FEAT → WIP → UNTESTED after implementation.

## Problem / goal
Startup does not reject the placeholder `SECRET_KEY` (`CHANGE_THIS_IN_PRODUCTION`). An operator who hand-creates `config.env` and leaves the default can run with a world-known key that signs JWTs and seeds Fernet encryption for stored Stripe/Revolut secrets. Deploy scripts may generate a real key, but that is not a hard guard. See `docs/SECURITY-REVIEW.md` (secrets / sessions) and `config.env.example`.

## High-level instructions for coder
- Add a startup / settings validation that **refuses to boot when production** (or equivalent `is_production`) if `SECRET_KEY` (and related refresh/crypto seeds if they share the same placeholder pattern) still starts with or equals the documented placeholder (`CHANGE_THIS…`).
- Keep local/dev usable: do not break `./run.sh` / docker-compose.dev with a hard fail unless the same production flag is set; document the rule in `config.env.example` or deploy docs if needed.
- Confirm `scripts/deploy-amvara9.sh` / prod overlay still supply a non-placeholder key so amvara9 is unaffected.
- Do not paste real secrets into tasks, commits, or logs; only reject known placeholders.
- Smoke: with `PRODUCTION=true` and placeholder key, process exits/fails clearly; with a non-placeholder key, app starts; existing auth/login smoke still passes in normal dev.

## What was done
- Added `_is_placeholder_secret` + `@model_validator` on `Settings` that raises when `is_production` and `SECRET_KEY` or `REFRESH_SECRET_KEY` still starts with `CHANGE_THIS` (`back/app/settings.py`).
- Dev/local (`PRODUCTION` unset/false) still allows placeholders; confirmed running back has `is_production=False` and reloads cleanly.
- Confirmed `scripts/deploy-amvara9.sh` replaces example placeholders with `openssl rand -hex 32` on virgin deploy; prod overlay sets `PRODUCTION=true`.
- Docs: `config.env.example`, `docs/0004-deployment.md`, `docs/0001-ci-cd-amvara9.md`, `docs/SECURITY-REVIEW.md`, `CHANGELOG.md` [Unreleased].
- Tests: `back/tests/test_secret_key_production.py`; updated `test_api_docs_production.py` subprocess to set non-placeholder secrets under `PRODUCTION=true`.

## Testing instructions

1. **Unit (Docker back):**
   ```bash
   docker compose -f docker-compose.yml -f docker-compose.dev.yml exec -T back \
     python3 -m pytest tests/test_secret_key_production.py tests/test_api_docs_production.py -q
   ```
   Expect: all passed (placeholder rejected in prod; allowed in dev; non-placeholder OK in prod; API docs prod test still OK).

2. **Dev still boots with placeholders:**
   ```bash
   docker compose -f docker-compose.yml -f docker-compose.dev.yml exec -T back \
     python3 -c "from app.settings import settings; print(settings.is_production)"
   curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:14202/api/health
   ```
   Expect: `False` and `200` (host port may be 4202 or 14202 per `docker compose ps`).

3. **Prod refuse (subprocess; no real secret logged):**
   ```bash
   docker compose -f docker-compose.yml -f docker-compose.dev.yml exec -T back \
     python3 -c "
   import os, sys
   os.environ['PRODUCTION']='true'
   os.environ['SECRET_KEY']='CHANGE_THIS_TO_A_RANDOM_SECRET_KEY_IN_PRODUCTION'
   os.environ['REFRESH_SECRET_KEY']='unit-test-refresh-secret-not-a-placeholder-423'
   sys.path.insert(0,'/app')
   try:
       import app.settings
       print('FAIL_BOOTED')
   except Exception as e:
       print('REJECTED' if 'SECRET_KEY' in str(e) else e)
   "
   ```
   Expect: `REJECTED`.

4. **Deploy guard (read-only):** Confirm `scripts/deploy-amvara9.sh` still sed-replaces the two `CHANGE_THIS_TO_…` example lines with generated hex keys on virgin `config.env`.

## Test report

1. **Date/time (UTC):** 2026-10-05T16:31:27Z start → 2026-10-05T16:31:37Z end. Log window: ~16:31Z (±5m).
2. **Environment:** `docker-compose.yml` + `docker-compose.dev.yml`; `BASE_URL=http://127.0.0.1:14202` (HAProxy host port); branch `development` @ `4e717cad5`.
3. **What was tested:** Unit tests for placeholder SECRET_KEY rejection in production; dev boot with placeholders; subprocess prod refuse; deploy script virgin-key generation (read-only).
4. **Results:**
   - Unit pytest (`test_secret_key_production.py` + `test_api_docs_production.py`): **PASS** — `6 passed in 1.92s`.
   - Dev still boots (`is_production` + health): **PASS** — printed `False`; `/api/health` and `/` both HTTP `200`.
   - Prod refuse placeholder SECRET_KEY (subprocess): **PASS** — output `REJECTED`.
   - Deploy guard (`scripts/deploy-amvara9.sh`): **PASS** — virgin deploy still `openssl rand -hex 32` + sed-replaces both `CHANGE_THIS_TO_…` SECRET_KEY / REFRESH_SECRET_KEY lines.
5. **Overall:** **PASS**
6. **Product owner feedback:** Production will no longer start with the documented placeholder signing key, which closes a real foot-gun for hand-copied `config.env`. Local/dev remains convenient with placeholders. Deploy path still generates real keys on virgin amvara9 setup, so operators are covered end-to-end.
7. **URLs tested:**
   1. `http://127.0.0.1:14202/api/health` → 200
   2. `http://127.0.0.1:14202/` → 200
8. **Relevant log excerpts (last section):**
   ```
   pos-back: INFO: 172.23.0.7:39844 - "GET /health HTTP/1.1" 200 OK
   pytest: ...... [100%] 6 passed in 1.92s
   subprocess: REJECTED
   is_production: False
   ```
