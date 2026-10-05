---
## Closing summary (TOP)

- **What happened:** Production left `/api/docs` and OpenAPI publicly reachable; this task gated them behind `PRODUCTION` / `ENABLE_API_DOCS`.
- **What was done:** App-level `api_docs_enabled` disables FastAPI docs/redoc/openapi when production unless opt-in; docs, changelog, and `test_api_docs_production.py` updated.
- **What was tested:** Pytest prod gate passed (404 when `PRODUCTION=true`); local HAProxy `:14202` returned 200 for `/api/docs`, OpenAPI, health, and landing. Overall PASS.
- **Why closed:** All required criteria passed; optional Puppeteer/amvara9 checks skipped with clear rationale.
- **Closed at (UTC):** 2026-10-05 16:22
---

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

## Test report

1. **Date/time (UTC):** start 2026-10-05T16:21:15Z — end 2026-10-05T16:21:35Z. Log window: ~16:21–16:22 UTC.
2. **Environment:** `docker compose -f docker-compose.yml -f docker-compose.dev.yml`; HAProxy host `http://127.0.0.1:14202`; branch `development`. Back settings: `is_production=False`, `api_docs_enabled=True`.
3. **What was tested:** Prod-like API docs gate via pytest; dev still serves `/api/docs` + `/api/openapi.json`; health and landing unaffected. Optional Puppeteer skipped (no host npm/`puppeteer-core`; front container lacks Chrome). Optional amvara9 not in scope for this run.
4. **Results:**
   - Unit / prod-like gate (`tests/test_api_docs_production.py`): **PASS** — `1 passed in 1.34s`.
   - Dev `/api/docs` → 200: **PASS** — curl `http://127.0.0.1:14202/api/docs`.
   - Dev `/api/openapi.json` → 200: **PASS** — curl same host.
   - `/api/health` → 200: **PASS**.
   - Landing `/` → 200: **PASS**.
   - Optional Puppeteer: **SKIP** — Chrome/puppeteer not available on host or in front container (required curl checks cover docs availability).
   - Optional amvara9 anonymous 404: **SKIP** — not requested for this local verification cycle.
5. **Overall:** **PASS**
6. **Product owner feedback:** Production gating is covered by the subprocess pytest (docs/redoc/openapi 404 when `PRODUCTION=true`, health still 200). Local Docker correctly keeps docs enabled for developers. Operators should still confirm amvara9 after the next prod recreate that anonymous `/api/docs` returns 404.
7. **URLs tested:**
   1. http://127.0.0.1:14202/api/docs
   2. http://127.0.0.1:14202/api/openapi.json
   3. http://127.0.0.1:14202/api/health
   4. http://127.0.0.1:14202/
8. **Relevant log excerpts (last section):**
```
pos-haproxy: GET /api/docs HTTP/1.1 → 200
pos-haproxy: GET /api/openapi.json HTTP/1.1 → 200
pos-haproxy: GET /api/health HTTP/1.1 → 200
pos-haproxy: GET / HTTP/1.1 → 200
pos-back: GET /docs / GET /openapi.json → 200 OK (dev)
pytest: 1 passed in 1.34s
```
