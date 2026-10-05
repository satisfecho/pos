# Deployment Guide

This guide covers **configuration** (API_URL, WS_URL, CORS) and **deploy steps** to run POS on a server or custom domain.

**amvara9:** Automatic deploy on push to master is set up via GitHub Actions. See [0001-ci-cd-amvara9.md](0001-ci-cd-amvara9.md).

---

## Quick Start

1. Copy the example configuration:
   ```bash
   cp config.env.example config.env
   ```

2. Edit `config.env` with your domain/IP settings (see [Configuration variables](#configuration-variables) below).

3. For **local/dev**: start services with `docker compose --env-file config.env up -d`.

4. For **production on a server**: see [Deploying to a server](#deploying-to-a-server) below.

---

## Configuration Variables

### Frontend URLs (`API_URL` and `WS_URL`)

These tell the Angular frontend where to connect to the backend:

**For Domain Deployment:**
```bash
API_URL=https://api.yourdomain.com
WS_URL=wss://api.yourdomain.com  # Note: wss:// for secure WebSocket
```

**For IP Address Deployment:**
```bash
API_URL=http://192.168.1.100:8020
WS_URL=ws://192.168.1.100:8021
```

**For Localhost (Development):**
```bash
API_URL=http://localhost:8020
WS_URL=ws://localhost:8021
```

### CORS Origins (`CORS_ORIGINS`)

Comma-separated **exact** front-end origins (protocol + host + port) allowed to call the API with credentials. Auth cookies use `SameSite=Lax` + httponly; production still requires an allowlist so Starlette does not reflect arbitrary `Origin` values when `allow_credentials=True`.

**Production (required allowlist — `*` refused at startup when `PRODUCTION=true`):**
```bash
CORS_ORIGINS=https://satisfecho.de
# or multiple:
CORS_ORIGINS=https://app.yourdomain.com,https://admin.yourdomain.com
```

**IP Address (LAN / self-hosted):**
```bash
CORS_ORIGINS=http://192.168.1.100:4202
```

**Local Docker HAProxy (dev):**
```bash
CORS_ORIGINS=http://localhost:4202,http://127.0.0.1:4202,http://localhost:4200,http://127.0.0.1:4200
```

**Wildcard `*`:** Allowed only when **not** in production (e.g. `./run.sh` sets `CORS_ORIGINS=*` for phone/LAN testing). Do **not** use `*` on amvara9 / `docker-compose.prod.yml` — the backend refuses to boot. Public QR menus served through the same HAProxy host are **same-origin** and do not need a wildcard.

### Example config.env snippets

**Domain with HTTPS (production):**
```bash
# config.env
API_URL=/api
WS_URL=
CORS_ORIGINS=https://satisfecho.de
```

**IP Address on local network (dev / no PRODUCTION):**
```bash
# config.env
API_URL=http://192.168.1.100:8020
WS_URL=ws://192.168.1.100:8021
CORS_ORIGINS=http://192.168.1.100:4202
```

**Development (localhost):**
```bash
# config.env
API_URL=/api
WS_URL=
CORS_ORIGINS=http://localhost:4202,http://127.0.0.1:4202,http://localhost:4200,http://127.0.0.1:4200
```

**Production (server behind one port):**  
Prefer relative `API_URL=/api` and empty `WS_URL` (same-origin). Set `CORS_ORIGINS` to the exact origin(s) where users open the app (e.g. `https://satisfecho.de`). Set `SECRET_KEY` and `REFRESH_SECRET_KEY` to strong random values.

### Production flag (`PRODUCTION`)

`docker-compose.prod.yml` sets **`PRODUCTION=true`** on the **back** service so `settings.is_production` enables Secure auth cookies, production rate limits, **hides public API docs** (`/docs`, `/redoc`, `/openapi.json` → 404), **refuses to boot** if `SECRET_KEY` or `REFRESH_SECRET_KEY` still starts with the documented `CHANGE_THIS…` placeholder, and **refuses `CORS_ORIGINS=*`** (or an empty list). You do **not** need to set `PRODUCTION` in `config.env` for amvara9; the compose overlay wins over the mounted env file. Local **`docker-compose.dev.yml`** leaves it unset (`False`) so `/api/docs` stays available and placeholders / `*` remain usable for developers. Optional overrides in `config.env.example`: `PRODUCTION`, and `ENABLE_API_DOCS=true` only if you must remount Swagger in a production-like environment.

### Important notes

1. **Production port 80**: With `docker-compose.prod.yml`, the frontend defaults to host port **80**. Set `FRONTEND_PORT` in `config.env` only if you need a different port.
2. **HTTPS/WSS**: If using HTTPS for the API, use `wss://` (not `ws://`) for WebSocket.
3. **CORS**: `CORS_ORIGINS` must include the exact URL where users access the frontend (protocol and port). Production rejects `*`.
4. **Wildcard**: `*` is for local/LAN only (e.g. `./run.sh`). Same-origin public menus do not need it.
5. **`PRODUCTION`**: Set by the prod compose overlay for **back** (Secure cookies, production rate limits, no public `/api/docs`, reject `CHANGE_THIS…` secrets, reject CORS `*`); not required in `config.env`.

---

## Deploying to a server

Steps to get the latest **master** or **main** branch deployed on a server where the project lives (e.g. `/development/pos`).

### Prerequisites

- Docker and Docker Compose installed on the server
- Git
- A `config.env` file already in place (do **not** commit it; copy from `config.env.example` once and edit)

### Steps

1. **SSH to the server** and go to the project directory:
   ```bash
   ssh amvara8
   cd /development/pos
   ```

2. **Fetch and switch to the branch you want to deploy** (e.g. `main` or `master`):
   ```bash
   git fetch origin
   git checkout main
   git pull origin main
   ```
   (Use `master` if your default branch is named `master`.)

3. **Keep your existing `config.env`**  
   Do not overwrite it with the example. Ensure it has production values for:
   - `API_URL` – full URL to the API (e.g. `https://yourdomain.com/api` or `http://host:8020/api` if behind one port)
   - `WS_URL` – WebSocket URL (e.g. `wss://yourdomain.com/ws` or `ws://host:8021/ws`)
   - `CORS_ORIGINS` – exact origin(s) where the frontend is served (no `*`; e.g. `https://satisfecho.de`)
   - `SECRET_KEY` and `REFRESH_SECRET_KEY` – strong random values in production

4. **Rebuild and start (production mode)**  
   From the project root (`/development/pos`):
   ```bash
   docker compose --env-file config.env -f docker-compose.yml -f docker-compose.prod.yml up --build -d
   ```

5. **Run database migrations** (if they did not run on startup):
   ```bash
   docker compose --env-file config.env exec back python -m app.migrate
   ```

6. **(Optional) Seed demo tables**  
   If you use tenant id 1 as the demo restaurant and need T01–T10:
   ```bash
   docker compose --env-file config.env exec back python -m app.seeds.seed_demo_tables
   ```

7. **(Optional) Daily demo order/reservation reset**  
   On production (e.g. amvara9), schedule a host cron so tenant 1 demo orders and reservations stay fresh. See [Daily demo data reset](0001-ci-cd-amvara9.md#daily-demo-data-reset-tenant-1). Manual one-shot:

   ```bash
   ./scripts/reset-demo-data-on-server.sh
   # or: docker compose --env-file config.env -f docker-compose.yml -f docker-compose.prod.yml exec -T back python -m app.seeds.reset_demo_data
   ```

   Separately, schedule the hourly unpaid public Satisfecho Delivery cleanup (all tenants; not covered by demo reset). See [Unpaid public Satisfecho Delivery cleanup](0001-ci-cd-amvara9.md#unpaid-public-satisfecho-delivery-cleanup-all-tenants) and `./scripts/cleanup-unpaid-public-delivery-on-server.sh`.

8. **Check that everything is up**  
   - Logs: `docker compose --env-file config.env logs -f --tail=50`
   - Health: `curl -s http://localhost:4200/api/health` (adjust host/port if you use a reverse proxy or different `FRONTEND_PORT`)

### Using `run.sh` on the server

If the server uses `run.sh` for startup (and you have `config.env` in place):

```bash
cd /development/pos
git fetch origin && git checkout main && git pull origin main
./run.sh
```

That script starts in **production** mode (build + prod compose override) and runs migrations after startup. For a long‑running server you would typically use `docker compose ... up -d` as in step 4 instead of `run.sh`.

### Summary

| Step | Command / action |
|------|-------------------|
| 1 | `cd /development/pos` |
| 2 | `git fetch origin && git checkout main && git pull origin main` |
| 3 | Keep `config.env` with correct `API_URL`, `WS_URL`, `CORS_ORIGINS`, secrets |
| 4 | `docker compose --env-file config.env -f docker-compose.yml -f docker-compose.prod.yml up --build -d` |
| 5 | `docker compose --env-file config.env exec back python -m app.migrate` |
| 6 | (Optional) `docker compose --env-file config.env exec back python -m app.seeds.seed_demo_tables` |
| 7 | (Optional) daily demo reset cron — see [0001-ci-cd-amvara9.md](0001-ci-cd-amvara9.md#daily-demo-data-reset-tenant-1); unpaid public delivery cleanup cron — see [0001 § Unpaid public…](0001-ci-cd-amvara9.md#unpaid-public-satisfecho-delivery-cleanup-all-tenants) |
| 8 | Check logs and `/api/health` |

---

## Reverse proxy (optional)

If you use a reverse proxy (nginx, Traefik, HAProxy, etc.):

1. Set `API_URL` and `WS_URL` to point to your reverse proxy.
2. Configure the proxy to forward:
   - `/api/*` → backend (e.g. `http://pos-back:8020`)
   - `/ws/*` → WebSocket bridge (e.g. `ws://pos-ws-bridge:8021`)
3. Update `CORS_ORIGINS` to match your frontend domain.

---

## Troubleshooting

**Frontend can't connect to backend**
- Check that `API_URL` matches where the backend is accessible.
- Verify CORS settings allow your frontend origin.
- Check browser console for CORS errors.

**WebSocket connection fails**
- Ensure `WS_URL` uses `ws://` for HTTP or `wss://` for HTTPS.
- Check that the WebSocket port is accessible.
- Verify WebSocket bridge container is running.
- **Build note:** `ws-bridge` uses `FROM pos-back` via Compose `additional_contexts` (back is tagged `pos-back:latest`). Do not hard-code `<directory>-back` (e.g. `pos2-back`); rebuild with `docker compose … build back ws-bridge`. Entrypoint is `uvicorn main:app` on port **8021** (not backend `app.main`).

**CORS errors**
- Ensure `CORS_ORIGINS` includes the exact frontend URL (including protocol and port).
- Check the browser network tab for the exact origin being blocked.
