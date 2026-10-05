# Harden CORS_ORIGINS setting on production

## GitHub Issues
- **Issue:** https://github.com/satisfecho/pos/issues/421
- **421**

## Status
- **Implemented:** 2026-10-05T16:25:00Z (UTC)
- Renamed FEAT → WIP → UNTESTED after implementation.

## Problem / goal
Shipped default `CORS_ORIGINS=*` (`config.env.example`) combined with `allow_credentials=True` in the FastAPI CORS middleware means Starlette reflects the request `Origin` for credentialed requests. Auth cookies are `SameSite=Lax` + httponly, so this is not a practical exploit path today, but production should prefer an explicit allowlist of the deployment’s own front-end origin(s) instead of a wildcard default.

Related docs: `docs/0004-deployment.md` (CORS Origins), `docs/SECURITY-REVIEW.md` (edge/CORS), `docs/0001-ci-cd-amvara9.md`.

## High-level instructions for coder
- Inspect `CORS_ORIGINS` wiring: `config.env.example`, `back/app/settings.py` (`cors_origins`), and CORS middleware setup in `back/app/main.py` (`allow_credentials` / origin list).
- Tighten the **default / documented** production posture so `*` is not the recommended or shipped default for credentialed deployments; prefer exact origin(s) (protocol + host + port) per `docs/0004-deployment.md`.
- Preserve legitimate local-dev and public-menu needs if docs still allow `*` for QR/public menus — document when `*` is acceptable vs when an allowlist is required (especially with credentials).
- Align example env and amvara9/deploy notes so operators set real origins (e.g. `https://satisfecho.de`) rather than copying `*`.
- Do not break SameSite cookie auth or local Docker HAProxy ports (4202/4200) — verify CORS still works for configured origins after the change.
- Smoke: app landing 200; a credentialed API call from an allowed origin still works; document any intentional rejection of unlisted origins.
- Sibling security hardening in flight: `UNTESTED-422-…` (API docs), `UNTESTED-423-…` (default secrets) — do **not** merge; this task owns CORS only.

## What was done
- `Settings._reject_wildcard_cors_in_production`: when `PRODUCTION=true`, refuse empty `CORS_ORIGINS` or any `*` in the list (`back/app/settings.py`).
- Default / example origins: local HAProxy `4202`/`4200` (localhost + 127.0.0.1) in `config.env.example`, Settings default, and `docker-compose.yml` (back + ws-bridge) — no longer `*`.
- Docs: `docs/0004-deployment.md`, `docs/0001-ci-cd-amvara9.md`, `docs/SECURITY-REVIEW.md`, `README.md`, `CHANGELOG.md` [Unreleased]; `run.sh` comment that `*` is DEV/LAN only.
- Tests: `back/tests/test_cors_origins_production.py`; sibling prod subprocess tests set an explicit `CORS_ORIGINS` when `PRODUCTION=true`.
- Smoke (host **14202**): landing 200; `/api/health` with allowlisted Origin returns `Access-Control-Allow-Origin`; production `CORS_ORIGINS=*` subprocess → REJECTED. Dev `is_production=False` unchanged.

## Testing instructions

1. **Unit (Docker back):**
   ```bash
   docker compose -f docker-compose.yml -f docker-compose.dev.yml exec -T back \
     python3 -m pytest tests/test_cors_origins_production.py tests/test_secret_key_production.py tests/test_api_docs_production.py -q
   ```
   Expect: all passed (wildcard/empty CORS rejected in prod; `*` allowed in dev; explicit allowlist OK in prod).

2. **Landing + health:**
   ```bash
   # Host port from: docker compose -f docker-compose.yml -f docker-compose.dev.yml ps
   curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:14202/
   curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:14202/api/health
   ```
   Expect: `200` / `200` (use `4202` if that is your published HAProxy port).

3. **CORS allowlist (use an origin present in the running back’s `CORS_ORIGINS`):**
   ```bash
   docker compose -f docker-compose.yml -f docker-compose.dev.yml exec -T back \
     python3 -c "from app.settings import settings; print(settings.cors_origins)"
   # Then (replace ORIGIN with the first origin from that list):
   curl -s -D - -o /dev/null -H "Origin: ORIGIN" http://127.0.0.1:14202/api/health \
     | grep -iE 'HTTP/|access-control-allow-origin'
   curl -s -D - -o /dev/null -H "Origin: https://evil.example" http://127.0.0.1:14202/api/health \
     | grep -iE 'HTTP/|access-control-allow-origin'
   ```
   Expect: allowlisted Origin echoes in `Access-Control-Allow-Origin`; unlisted Origin has no ACAO header (browser would block).

4. **Prod refuse wildcard (subprocess):**
   ```bash
   docker compose -f docker-compose.yml -f docker-compose.dev.yml exec -T back \
     python3 -c "
   import os, sys
   os.environ['PRODUCTION']='true'
   os.environ['SECRET_KEY']='unit-test-secret-key-not-a-placeholder-421'
   os.environ['REFRESH_SECRET_KEY']='unit-test-refresh-secret-not-a-placeholder-421'
   os.environ['CORS_ORIGINS']='*'
   sys.path.insert(0,'/app')
   for m in list(sys.modules):
       if m == 'app.settings' or m.startswith('app.settings'):
           del sys.modules[m]
   try:
       import app.settings
       print('FAIL_BOOTED')
   except Exception as e:
       print('REJECTED' if 'CORS_ORIGINS' in str(e) else e)
   "
   ```
   Expect: `REJECTED`.

5. **Docs / example (read-only):** Confirm `config.env.example` does not default `CORS_ORIGINS=*`, and amvara9 notes say to set e.g. `https://satisfecho.de`.
