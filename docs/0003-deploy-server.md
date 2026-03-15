# Deploying to a server (e.g. amvara8, amvara9)

Steps to get the latest **master** or **main** branch deployed on a server where the project lives (e.g. `/development/pos2`).

**amvara9:** Automatic deploy on push to master is set up via GitHub Actions. See [0001-ci-cd-amvara9.md](0001-ci-cd-amvara9.md).

## Prerequisites

- Docker and Docker Compose installed on the server
- Git
- A `config.env` file already in place (do **not** commit it; copy from `config.env.example` once and edit)

## Steps

1. **SSH to the server** and go to the project directory:
   ```bash
   ssh amvara8
   cd /development/pos2
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
   - `API_URL` – full URL to the API (e.g. `https://amvara8.example.com/api` or `http://amvara8:4200/api` if everything is behind one port)
   - `WS_URL` – WebSocket URL (e.g. `wss://amvara8.example.com/ws` or `ws://amvara8:4200/ws`)
   - `CORS_ORIGINS` – exact origin(s) where the frontend is served (e.g. `https://amvara8.example.com` or `http://amvara8:4200`)
   - `SECRET_KEY` and `REFRESH_SECRET_KEY` – set to strong random values in production  

   See [0004-deployment.md](0004-deployment.md) for details.

4. **Rebuild and start (production mode)**  
   From the project root (`/development/pos2`):
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

## Using `run.sh` on the server

If the server also uses `run.sh` for startup (and you have `config.env` in place):

```bash
cd /development/pos2
git fetch origin && git checkout main && git pull origin main
./run.sh
```

That script starts in **production** mode (build + prod compose override) and runs migrations after startup. Press Ctrl+C to stop; for a long‑running server you would typically run the stack in the background (e.g. via systemd or by using `docker compose ... up -d` as in step 4 and skipping `run.sh`).

## Summary

| Step | Command / action |
|------|-------------------|
| 1 | `cd /development/pos2` |
| 2 | `git fetch origin && git checkout main && git pull origin main` |
| 3 | Keep `config.env` with correct `API_URL`, `WS_URL`, `CORS_ORIGINS`, secrets |
| 4 | `docker compose --env-file config.env -f docker-compose.yml -f docker-compose.prod.yml up --build -d` |
| 5 | `docker compose --env-file config.env exec back python -m app.migrate` |
| 6 | (Optional) `docker compose --env-file config.env exec back python -m app.seeds.seed_demo_tables` |
| 7 | Check logs and `/api/health` |
