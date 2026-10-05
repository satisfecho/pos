# Harden /api/docs in production (#422)

## GitHub Issues
- **Issue:** https://github.com/satisfecho/pos/issues/422
- **422**

## Status
- **Implemented** (010 feature coder) — awaiting tester.

## Problem / goal
`/api/docs` and `/api/openapi.json` are publicly reachable through HAProxy in production (full API surface disclosure). Prod checks in `haproxy/README.md` even list `/api/docs`. Disable or restrict API docs in production and gate access behind an authorized user (or equivalent auth). Dev/local should keep docs available for developers. Related: `docs/testing.md` (API docs smoke), `docs/SECURITY-REVIEW.md`.

## High-level instructions for coder
- When `is_production` (or prod overlay), do not expose Swagger/OpenAPI publicly: disable routes, return 404/401/403 for anonymous access, or mount docs only for authenticated privileged roles — pick one clear approach consistent with FastAPI patterns already in the repo.
- Keep `/api/docs` usable in **dev** so `test:api-docs` / local debugging still work unless an explicit opt-in is documented.
- Align HAProxy/docs references (`haproxy/README.md`, deploy docs) so prod health checks do not assume public `/api/docs`.
- Prefer app-level gating over fragile path ACLs alone; if HAProxy rules help, document them.
- Smoke: in prod-like config, anonymous GET `/api/docs` and `/api/openapi.json` are blocked; in dev, docs still load; landing/`/health` unaffected.

## What was done
- App-level gating: `settings.api_docs_enabled` is `False` when `PRODUCTION=true` unless `ENABLE_API_DOCS=true`. FastAPI mounts `docs_url` / `redoc_url` / `openapi_url` only when enabled (`back/app/settings.py`, `back/app/main.py`).
- Documented opt-in in `config.env.example`; updated `haproxy/README.md`, `docs/0004-deployment.md`, `docs/testing.md`, `docs/SECURITY-REVIEW.md`, `CHANGELOG.md`.
- Regression: `back/tests/test_api_docs_production.py` (subprocess with `PRODUCTION=true` → 404 for `/docs`, `/redoc`, `/openapi.json`; `/health` still 200).

## Testing instructions

1. **Unit / prod-like gate (required):**
   ```bash
   docker compose -f docker-compose.yml -f docker-compose.dev.yml exec -T back \
     python3 -m pytest tests/test_api_docs_production.py -q
   ```
   Expect: 1 passed.

2. **Dev still serves docs (required):** with local stack up (HAProxy host port from `docker compose ps`, often `14202` or `4202`):
   ```bash
   PORT=14202   # or 4202
   curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:$PORT/api/docs
   curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:$PORT/api/openapi.json
   curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:$PORT/api/health
   curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:$PORT/
   ```
   Expect: `200` for all four (dev has `PRODUCTION` unset/false).

3. **Optional Puppeteer (host Chrome):**
   ```bash
   cd front && BASE_URL=http://127.0.0.1:14202 HEADLESS=1 npm run test:api-docs
   ```
   Expect: `>>> RESULT: API docs at /api/docs load successfully.`

4. **Optional after amvara9 recreate:** anonymous `GET /api/docs` and `/api/openapi.json` → **404**; `/api/health` and `/` still OK.
