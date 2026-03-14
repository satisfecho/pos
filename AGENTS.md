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

## Reservation tests (Puppeteer)

Run these from the repo root or from `front/` when the app is up (e.g. on port 4203 or 4202). Chrome must be installed (e.g. `/Applications/Google Chrome.app` on macOS). Scripts auto-detect the first responding port among 4203, 4202, 4200.

**Staff flow (login → reservations → create → cancel):**

```bash
cd /path/to/pos2
source .env   # optional: provides DEMO_LOGIN_EMAIL, DEMO_LOGIN_PASSWORD
export LOGIN_EMAIL="${DEMO_LOGIN_EMAIL:-$LOGIN_EMAIL}"
export LOGIN_PASSWORD="${DEMO_LOGIN_PASSWORD:-$LOGIN_PASSWORD}"
cd front && node scripts/debug-reservations.mjs
```

Or with credentials inline (no .env):  
`LOGIN_EMAIL="user@example.com" LOGIN_PASSWORD="secret" node front/scripts/debug-reservations.mjs`

**Public flow (no login: book page → submit → view/cancel by token):**

```bash
cd /path/to/pos2/front
node scripts/debug-reservations-public.mjs
```

Optional env: `BASE_URL` (e.g. `http://127.0.0.1:4203`), `TENANT_ID` (default `1`). No credentials needed for the public test.

## Demo tables (seed and test)

The demo restaurant (tenant id 1) should have **T01–T09**: T01–T05 with 4 seats, T06–T09 with 2 seats, on a single floor "Main". If the database was reinitialized or tables were lost, seed them and then run the check.

**Seed tables (idempotent; creates only missing tables):**

```bash
# From repo root, with backend in Docker:
docker compose exec back python -m app.seeds.seed_demo_tables

# Or from back/ with venv and DB reachable:
cd back && python -m app.seeds.seed_demo_tables
```

**Test that tables exist:**

```bash
docker compose exec back python -m app.seeds.check_demo_tables
```

Exit 0 means tenant 1 has T01–T09 with the correct seat counts; exit 1 reports missing or wrong tables.
