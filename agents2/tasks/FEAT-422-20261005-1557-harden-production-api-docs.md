# Harden /api/docs in production (#422)

## GitHub Issues
- **Issue:** https://github.com/satisfecho/pos/issues/422
- **422**

## Problem / goal
`/api/docs` and `/api/openapi.json` are publicly reachable through HAProxy in production (full API surface disclosure). Prod checks in `haproxy/README.md` even list `/api/docs`. Disable or restrict API docs in production and gate access behind an authorized user (or equivalent auth). Dev/local should keep docs available for developers. Related: `docs/testing.md` (API docs smoke), `docs/SECURITY-REVIEW.md`.

## High-level instructions for coder
- When `is_production` (or prod overlay), do not expose Swagger/OpenAPI publicly: disable routes, return 404/401/403 for anonymous access, or mount docs only for authenticated privileged roles — pick one clear approach consistent with FastAPI patterns already in the repo.
- Keep `/api/docs` usable in **dev** so `test:api-docs` / local debugging still work unless an explicit opt-in is documented.
- Align HAProxy/docs references (`haproxy/README.md`, deploy docs) so prod health checks do not assume public `/api/docs`.
- Prefer app-level gating over fragile path ACLs alone; if HAProxy rules help, document them.
- Smoke: in prod-like config, anonymous GET `/api/docs` and `/api/openapi.json` are blocked; in dev, docs still load; landing/`/health` unaffected.
