---
## Closing summary (TOP)

- **What happened:** Production CORS defaults used `*` with credentialed FastAPI middleware; the tester verified the allowlist and prod wildcard reject.
- **What was done:** Production now refuses empty or wildcard `CORS_ORIGINS`; example env and docs use explicit localhost/HAProxy origins and tell operators to set the real front-end origin (e.g. `https://satisfecho.de`).
- **What was tested:** Unit tests (11 passed), landing and `/api/health` 200, allowlisted Origin echoes ACAO, unlisted Origin has no ACAO, prod `CORS_ORIGINS=*` subprocess REJECTED, docs/example no longer default `*` — overall PASS.
- **Why closed:** All tester criteria passed; CORS-only scope delivered.
- **Closed at (UTC):** 2026-10-05 16:41
---

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

## Test report

1. **Date/time (UTC):** 2026-10-05T16:39:29Z start → 2026-10-05T16:40:27Z end. Log window: `docker logs --since 2026-10-05T16:39:00Z`.
2. **Environment:** `docker-compose.yml` + `docker-compose.dev.yml`; HAProxy `127.0.0.1:14202`; branch `development`; running `CORS_ORIGINS=https://pos-dev.157.90.66.148.sslip.io` (from `config.env`, not compose default).
3. **What was tested:** Unit tests for prod CORS/secret/docs boot rules; landing + `/api/health` 200; allowlisted vs unlisted Origin ACAO; production `CORS_ORIGINS=*` subprocess reject; docs/`config.env.example` no longer ship `*` as the default.
4. **Results:**
   - Unit pytest (`test_cors_origins_production.py`, `test_secret_key_production.py`, `test_api_docs_production.py`): **PASS** — 11 passed in 2.50s.
   - Landing HTTP 200 on `http://127.0.0.1:14202/`: **PASS**.
   - `/api/health` HTTP 200: **PASS**.
   - Allowlisted Origin echoes `Access-Control-Allow-Origin`: **PASS** — Origin `https://pos-dev.157.90.66.148.sslip.io` (the running allowlist) returned `access-control-allow-origin: https://pos-dev.157.90.66.148.sslip.io` via HAProxy and via `back:8020`. Note: `http://localhost:4202` is **not** in this host’s live `CORS_ORIGINS`, so it correctly did not echo ACAO.
   - Unlisted Origin has no ACAO: **PASS** — `Origin: https://evil.example` → HTTP 200, no `Access-Control-Allow-Origin` (HAProxy and back:8020).
   - Prod refuse wildcard subprocess: **PASS** — printed `REJECTED`.
   - Docs / example: **PASS** — `config.env.example` defaults to localhost/127.0.0.1 4202/4200; `docs/0001-ci-cd-amvara9.md` and `docs/0004-deployment.md` tell operators to set e.g. `https://satisfecho.de` and never `*`.
5. **Overall:** **PASS**.
6. **Product owner feedback:** Production will no longer boot with a wildcard CORS list, which is the right default for credentialed cookies. Local and amvara9 docs now tell operators to list the real front-end origin instead of copying `*`. Live this host already uses the sslip.io origin, and the allowlist behaved as expected.
7. **URLs tested:**
   1. `http://127.0.0.1:14202/` (landing)
   2. `http://127.0.0.1:14202/api/health` (no Origin / allowlisted Origin / unlisted Origin)
   3. `http://127.0.0.1:8020/health` inside `pos-back` (allowlisted and unlisted Origin)
8. **Relevant log excerpts:**

```
# pytest
...........                                                              [100%]
11 passed in 2.50s

# pos-haproxy
172.23.0.1:41546 ... 200 ... "GET /api/health HTTP/1.1"
172.23.0.1:36088 ... 200 ... "GET /api/health HTTP/1.1"

# pos-back
INFO:     172.23.0.7:37132 - "GET /health HTTP/1.1" 200 OK
INFO:     127.0.0.1:35094 - "GET /health HTTP/1.1" 200 OK
```
