# Hide nginx Server version banner in production

## GitHub Issues
- **Issue:** https://github.com/satisfecho/pos/issues/210
- **210**

## Problem / goal

Public responses from **https://satisfecho.de/** expose **`Server: nginx/1.31.0`** (or similar versioned values) from nginx inside **pos-front**. HAProxy terminates TLS but forwards that header today. This is **information disclosure** for reconnaissance—not an exploit by itself—but should be hardened in production.

The issue author documented a sensible fix order: nginx **`server_tokens off;`**, then HAProxy **`http-response del-header Server`** (or a generic replacement), rebuild/reload prod stack, verify externally, and smoke-test site/API/ACME.

Relevant paths: **`front/nginx.conf`**, **`haproxy/haproxy.prod.cfg`** (and dev overlay if dev should keep verbose headers). See **`docs/0026-haproxy-ssl-amvara9.md`** for prod HAProxy layout.

## Implementation (coder)

- **`front/nginx.conf`:** `server_tokens off;` in the server block (used by **`Dockerfile.prod`** only; dev uses `ng serve`, not nginx).
- **`haproxy/haproxy.prod.cfg`:** `http-response del-header Server` on **`http_frontend`** (strips nginx and any upstream `Server` on public 80/443).
- **`haproxy/README.md`:** note prod strips `Server`; dev **`haproxy.dev.cfg`** unchanged for local debugging.
- **`CHANGELOG.md`:** Unreleased entry (#210).

## Testing instructions

1. **After prod deploy** (rebuild **front** image + reload/restart **haproxy** with prod compose on amvara9):
   - `curl -sI https://satisfecho.de/ | grep -i server` — expect **no** `nginx/1.x` line (header absent or generic only).
   - `curl -sI http://satisfecho.de/.well-known/acme-challenge/test` — HTTP must still reach nginx webroot (301 to HTTPS is OK for non-ACME paths; ACME path must not be broken).
2. **Smoke:** landing `/`, `https://satisfecho.de/api/health` or `/api/docs`, existing cert renewal path unchanged.
3. **Local dev** (optional): `curl -sI http://127.0.0.1:4202/ | grep -i server` — dev HAProxy does **not** strip `Server`; behavior unchanged vs before.
4. **HAProxy syntax:** on a host with `certbot/haproxy-certs/*.pem` present, `docker compose -f docker-compose.yml -f docker-compose.prod.yml exec haproxy haproxy -c -f /usr/local/etc/haproxy/haproxy.cfg` should pass.

## Handoff log

- **Handoff (`012-feature-coder-handoff.md`, 2026-05-21):** Implementation verified (`server_tokens off;`, `http-response del-header Server`, README, CHANGELOG). Committed on **`development`**. Renamed **`WIP-210-…` → `UNTESTED-210-…`**. **`gh issue edit 210 --remove-label "agent:wip" --add-label "agent:untested"`**.
