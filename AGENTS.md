# Agent Operating Instructions

These instructions apply to all work in this repository:

- Do not install anything on the host system. Use containers for any installs.
- If any install is required, ask for approval before proceeding.
- Run tests or tooling inside containers whenever possible.
- If a command must run outside containers, only use existing folders (no new host-wide installs).
- Always check container logs after making changes, to spot errors.
- Never use `npm install`; always use `npm ci --ignore-scripts`, pin versions in package.json/package-lock.json, and avoid running scripts on install (supply chain risk).

## Docker: status, port, and logs

When debugging the running app (e.g. frontend not loading a route, API issues):

1. **Check if containers are up and which port the app is on**
   - From the repo root: `docker compose ps`
   - The **frontend** is exposed via **HAProxy**. In the PORTS column, find the `haproxy` service: it shows `HOST_PORT->4202/tcp` (e.g. `0.0.0.0:4203->4202/tcp`). The **host port** (e.g. 4203 or 4202) is the one to use in the browser: `http://127.0.0.1:4203` or `http://localhost:4202`. The port comes from `FRONTEND_PORT` in the environment (default in docker-compose is 4202).

2. **Review logs and last requests**
   - All services: `docker compose logs -f` (follow) or `docker compose logs --tail=100`
   - Frontend (build errors, dev server): `docker compose logs --tail=80 front`
   - Backend (API requests, errors): `docker compose logs --tail=50 back`
   - HAProxy (HTTP/WS access, redirects): `docker compose logs --tail=30 haproxy`
   - Use these to confirm the app is running, see recent requests, and spot build or runtime errors (e.g. Angular build failures in `front` logs).
