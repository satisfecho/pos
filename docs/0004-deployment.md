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

This tells the backend which frontend origins are allowed to make requests:

**Single Domain:**
```bash
CORS_ORIGINS=https://app.yourdomain.com
```

**Multiple Domains:**
```bash
CORS_ORIGINS=https://app.yourdomain.com,https://admin.yourdomain.com
```

**IP Address:**
```bash
CORS_ORIGINS=http://192.168.1.100:4200
```

**With Wildcard (for public menu access):**
```bash
CORS_ORIGINS=https://app.yourdomain.com,*
```

### Example config.env snippets

**Domain with HTTPS:**
```bash
# config.env
API_URL=https://api.yourdomain.com
WS_URL=wss://api.yourdomain.com
CORS_ORIGINS=https://app.yourdomain.com,*
```

**IP Address on local network:**
```bash
# config.env
API_URL=http://192.168.1.100:8020
WS_URL=ws://192.168.1.100:8021
CORS_ORIGINS=http://192.168.1.100:4200,*
```

**Development (localhost):**
```bash
# config.env
API_URL=http://localhost:8020
WS_URL=ws://localhost:8021
CORS_ORIGINS=http://localhost:4200,*
```

**Production (server behind one port):**  
Use full URLs to the API and WS (e.g. `https://yourdomain.com/api`, `wss://yourdomain.com/ws`) or internal host:port if the front is built with env at build time. Set `CORS_ORIGINS` to the exact origin(s) where users open the app. Set `SECRET_KEY` and `REFRESH_SECRET_KEY` to strong random values.

### Important notes

1. **Production port 80**: With `docker-compose.prod.yml`, the frontend defaults to host port **80**. Set `FRONTEND_PORT` in `config.env` only if you need a different port.
2. **HTTPS/WSS**: If using HTTPS for the API, use `wss://` (not `ws://`) for WebSocket.
3. **CORS**: `CORS_ORIGINS` must include the exact URL where users access the frontend (protocol and port).
4. **Wildcard**: `*` in CORS_ORIGINS allows public menu access from any origin (useful for QR code menus).

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
   - `CORS_ORIGINS` – exact origin(s) where the frontend is served
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
   If you use tenant id 1 as the demo restaurant and need T01–T09:
   ```bash
   docker compose --env-file config.env exec back python -m app.seeds.seed_demo_tables
   ```

7. **Check that everything is up**  
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
| 7 | Check logs and `/api/health` |

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

**CORS errors**
- Ensure `CORS_ORIGINS` includes the exact frontend URL (including protocol and port).
- Check the browser network tab for the exact origin being blocked.
