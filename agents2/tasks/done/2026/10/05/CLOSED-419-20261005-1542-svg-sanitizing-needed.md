---
## Closing summary (TOP)

- **What happened:** Tenant SVG logo uploads were stored and served without sanitization, risking stored XSS on the app origin.
- **What was done:** Added allowlist SVG sanitization on `POST /tenant/logo`, hardened upload serve headers (nosniff, attachment, CSP sandbox), and documented residual notes.
- **What was tested:** Pytest SVG/uploads security (7 passed), landing 200, settings/menu logo Puppeteer smokes, unsafe SVG rejected with 400, serve headers verified — overall PASS.
- **Why closed:** All criteria passed; safe logos work and malicious SVG uploads are rejected.
- **Closed at (UTC):** 2026-10-05 15:50
---

# SVG sanitizing for tenant logo uploads (#419)

## GitHub Issues
- **Issue:** https://github.com/satisfecho/pos/issues/419
- **419**

## Status
- **Implemented:** 2026-10-05 (UTC)
- SVG logo uploads sanitized via `back/app/svg_sanitize.py` (allowlist rewrite; script / event handlers / unsafe URLs rejected).
- Explicit `/uploads` logo/header/product serve paths set `X-Content-Type-Options: nosniff`; SVG responses also get `Content-Disposition: attachment` and a restrictive CSP.
- Front already embeds logos with `<img>` (unchanged).
- Tests: `back/tests/test_tenant_logo_svg.py`. Docs: `docs/SECURITY-REVIEW.md`, `CHANGELOG.md` [Unreleased].

## Problem / goal
Tenant logo upload accepts `image/svg+xml` and stores SVG bytes as-is (no re-encode), then serves them inline as `image/svg+xml` under the shared app origin. That can enable stored XSS if a malicious SVG is opened in a script-capable context (or if the front embeds logos unsafely). Goal: harden SVG logo handling so untrusted SVG cannot run script in the app origin, and tighten upload response headers.

See also `docs/SECURITY-REVIEW.md` (uploads), `docs/testing.md` (Settings logo / menu logo smokes).

## High-level instructions for coder
- Review `POST /tenant/logo` and tenant-logo serve path in `back/app/main.py`: SVG currently bypasses image optimize/re-encode and is written/served verbatim.
- Choose a fix path (prefer both where practical): (1) sanitize SVG on upload with a maintained library, **or** drop SVG from allowed logo types; (2) harden `/uploads/*` (and logo) responses with `X-Content-Type-Options: nosniff`, prefer `Content-Disposition: attachment` for raw SVG if still allowed, and consider a restrictive CSP on upload responses.
- Confirm how the Angular front renders tenant logos (`<img>` vs object/iframe); keep safe embedding (`<img>` / non-scriptable) and do not introduce script-capable embedding of user SVG.
- Keep path-traversal safeguards (UUID filenames); do not weaken auth on SETTINGS_UPDATE.
- Add/extend backend tests for malicious or script-bearing SVG rejection/sanitization; smoke Settings logo upload and public menu logo (`test:settings-logo`, `test:menu-logo`) so legitimate logos still work.
- Do not paste exploit payloads into commits, changelog, or docs beyond minimal test fixtures.

## What changed
- **`back/app/svg_sanitize.py`:** Allowlist SVG sanitizer; rejects DOCTYPE/entity, script-like tags, `on*` handlers, and `javascript:` URLs.
- **`back/app/main.py`:** `POST /tenant/logo` sanitizes SVG before write; `_uploads_media_headers` on logo/header/product serve routes.
- **`back/tests/test_tenant_logo_svg.py`:** Unit + API tests for safe accept / unsafe reject / serve headers.
- **`docs/SECURITY-REVIEW.md`**, **`CHANGELOG.md`:** Residual note and Unreleased fix entry.

## Testing instructions
1. Backend (Docker):  
   `docker compose -f docker-compose.yml -f docker-compose.dev.yml exec -T back python3 -m pytest tests/test_tenant_logo_svg.py tests/test_uploads_security.py -q`
   Expect all passed.
2. App up (HAProxy host port from `docker compose ps`, e.g. `http://127.0.0.1:14202`): landing `curl` returns 200.
3. Puppeteer (owner/admin credentials in env):  
   `BASE_URL=http://127.0.0.1:<port> HEADLESS=1 npm run test:settings-logo --prefix front`  
   `BASE_URL=http://127.0.0.1:<port> HEADLESS=1 npm run test:menu-logo --prefix front`  
   Safe SVG fixture `front/scripts/fixtures/logo-test.svg` should still upload and show; script-bearing SVG via Settings should fail with 400.
4. Manual: `GET /api/uploads/{tenantId}/logo/{uuid}.svg` response headers include `X-Content-Type-Options: nosniff`, `Content-Disposition: attachment`, and a CSP with `sandbox`.

## Test report

1. **Date/time (UTC):** 2026-10-05T15:47:40Z – 2026-10-05T15:49:48Z. Log window: `docker logs --since 2026-10-05T15:47:00Z` on `pos-back` / `pos-front`.
2. **Environment:** `docker-compose.yml` + `docker-compose.dev.yml`; HAProxy `BASE_URL=http://127.0.0.1:14202`; branch `development`. Ephemeral tenant-1 owner created for Puppeteer/API (no `DEMO_LOGIN_*` in `config.env`); removed after tests. Host Chromium + front container `node_modules` volume for Puppeteer (host has no `npm` / empty bind `front/node_modules`).
3. **What was tested:** pytest SVG + uploads security; landing 200; settings logo upload (safe SVG fixture); menu logo display; unsafe/script and event-handler SVG upload rejected with 400; GET logo serve headers (`nosniff`, `attachment`, CSP `sandbox`).
4. **Results:**
   - Pytest `test_tenant_logo_svg.py` + `test_uploads_security.py`: **PASS** — 7 passed in ~1.8s.
   - Landing `curl` HTTP 200: **PASS**.
   - `test:settings-logo` (safe fixture upload + sidebar smoke): **PASS** — success toast; 8 nav routes without 5xx.
   - `test:menu-logo`: **PASS** — restaurant logo displayed on `/menu/{token}`.
   - Script-bearing SVG `POST /tenant/logo`: **PASS** — HTTP 400, detail contains disallowed content.
   - Event-handler SVG `POST /tenant/logo`: **PASS** — HTTP 400, same.
   - GET serve headers on uploaded SVG: **PASS** — `x-content-type-options: nosniff`, `content-disposition: attachment`, `content-security-policy` includes `sandbox`, `content-type: image/svg+xml`.
   - Contrast check: **N/A** — no UI colour/chrome branding change.
5. **Overall:** **PASS**
6. **Product owner feedback:** SVG logo hardening works end-to-end: safe logos still upload and show on the menu, malicious SVG uploads are rejected with 400, and served SVGs carry nosniff / attachment / sandbox CSP. Residual note: `HEAD` on the logo URL returned 404 while `GET` is 200 — not in scope of this task, but worth a follow-up if clients rely on HEAD.
7. **URLs tested:**
   1. http://127.0.0.1:14202/
   2. http://127.0.0.1:14202/login?tenant=1
   3. http://127.0.0.1:14202/dashboard
   4. http://127.0.0.1:14202/settings
   5. http://127.0.0.1:14202/contracts
   6. http://127.0.0.1:14202/my-shift
   7. http://127.0.0.1:14202/reports
   8. http://127.0.0.1:14202/staff/orders
   9. http://127.0.0.1:14202/talk
   10. http://127.0.0.1:14202/users
   11. http://127.0.0.1:14202/menu/{table-token}
   12. http://127.0.0.1:14202/api/tenant/logo (POST)
   13. http://127.0.0.1:14202/api/uploads/1/logo/{uuid}.svg (GET)
8. **Relevant log excerpts:**
```
POST /tenant/logo HTTP/1.1" 200 OK
GET /uploads/1/logo/...svg HTTP/1.1" 200 OK
POST /tenant/logo HTTP/1.1" 400 Bad Request
POST /tenant/logo HTTP/1.1" 400 Bad Request
GET /uploads/1/logo/89895e81-5b02-4418-836b-5d57fff1a89d.svg HTTP/1.1" 200 OK
```
Serve GET headers observed: `x-content-type-options: nosniff`; `content-disposition: attachment; filename="….svg"`; `content-security-policy: default-src 'none'; style-src 'unsafe-inline'; sandbox`; `content-type: image/svg+xml`.
