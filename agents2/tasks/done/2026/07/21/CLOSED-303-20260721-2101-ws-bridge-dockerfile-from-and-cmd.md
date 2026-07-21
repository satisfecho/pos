---
## Closing summary (TOP)

- **What happened:** ws-bridge failed to build/start when Compose project directory name did not match a hard-coded `FROM` image (`pos2-back`), and historically CMD could miss the standalone bridge app.
- **What was done:** Pinned Compose images `pos-back` / `pos-ws-bridge`, wired `additional_contexts` so Dockerfile `FROM pos-back` resolves via Compose; kept CMD as uvicorn `main:app` on 8021; docs/changelog note for #303.
- **What was tested:** Rebuild/start, image tags, CMD inspect, in-container + HAProxy `/ws/health`, optional WebSocket smoke, regression `/` and `/api/health` — all **PASS**.
- **Why closed:** All tester criteria passed; feature fully delivered.
- **Closed at (UTC):** 2026-07-21 21:07
---

# Fix ws-bridge Dockerfile FROM image and startup CMD

## GitHub Issues
- **Issue:** https://github.com/satisfecho/pos/issues/303
- **303**

## Problem / goal

The WebSocket bridge container (`ws-bridge/Dockerfile`) fails to build or start on some setups because the base image name and/or process entrypoint do not match how this repo’s Compose stack tags and runs services.

Reported failures:
- **`FROM`** uses an image name that Docker cannot resolve locally (build fails with pull/access errors for a non-existent `docker.io/library/…` image).
- **`CMD`** historically ran the backend module path instead of the standalone `ws-bridge` FastAPI app (`main:app` on port **8021**), so the container exited with `ModuleNotFoundError`.

Goal: `pos-ws-bridge` builds and stays up under `docker compose -f docker-compose.yml -f docker-compose.dev.yml`, answering health checks on **8021**, so front WebSockets (see `docs/0004-deployment.md`, `docs/testing.md` WebSocket smoke) work.

## High-level instructions for coder

- Inspect `ws-bridge/Dockerfile`, `ws-bridge/main.py`, and how Compose names the **back** image for this project (`COMPOSE_PROJECT_NAME` / directory project name vs `container_name: pos-back`). Align **`FROM`** with the image tag Compose actually builds for **back** (or a safer pattern that does not depend on a wrong local tag).
- Ensure **`CMD`** (or equivalent) starts the ws-bridge app with uvicorn on **`0.0.0.0:8021`** (`main:app`), not `app.main` from the backend package.
- Rebuild/start only **ws-bridge** (and dependents if needed); confirm container stays running and responds on **8021** (health or simple HTTP check as already used for the bridge).
- Smoke: with stack up, run or note WebSocket connectivity (`front/scripts` / `docs/testing.md` WebSocket test) after owner login if credentials available; check `docker logs` for **pos-ws-bridge** / **pos-haproxy** for start errors.
- Keep changes scoped to ws-bridge / compose wiring; no secrets in the task or commits. Update a short note in deploy/WS docs only if the documented image/CMD assumptions were wrong.

## Implementation notes (coder)

- Root cause: Compose default image name is `<project>-back` (`pos2-back` when the directory is `pos2`, `pos-back` when it is `pos`). Hard-coding `FROM pos2-back:latest` failed on clones named `pos`.
- Fix:
  - `docker-compose.yml`: pin `image: pos-back:latest` on **back**, `image: pos-ws-bridge:latest` on **ws-bridge**; `ws-bridge` build uses `additional_contexts: pos-back: service:back`.
  - `ws-bridge/Dockerfile`: `FROM pos-back` (Compose context), `CMD` already/remains `uvicorn main:app --host 0.0.0.0 --port 8021 …`.
  - Doc note in `docs/0004-deployment.md` troubleshooting; changelog under Unreleased Fixed (#303).

## Testing instructions

1. **Rebuild and start** (from repo root):
   ```bash
   docker compose -f docker-compose.yml -f docker-compose.dev.yml build back ws-bridge
   docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d ws-bridge
   ```
2. **Image / CMD:**
   - `docker compose … images` (or `docker images`) shows **`pos-back:latest`** and **`pos-ws-bridge:latest`** (not only `pos2-back`).
   - `docker inspect pos-ws-bridge --format '{{.Config.Cmd}}'` includes `uvicorn`, `main:app`, and port `8021`.
   - Container stays **Up** (`docker compose … ps ws-bridge`); logs show uvicorn listening on `0.0.0.0:8021` with **no** `ModuleNotFoundError` / pull denied for a missing base image.
3. **Health:**
   - Inside stack: `docker compose … exec -T ws-bridge python -c "import urllib.request; print(urllib.request.urlopen('http://127.0.0.1:8021/health').read().decode())"` → JSON `status` ok.
   - Via HAProxy (dev): `curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:4202/ws/health` → **200**.
4. **Optional WebSocket smoke** (credentials in `.env` / `LOGIN_*`):  
   `BASE_URL=http://127.0.0.1:4202 node front/scripts/test-websocket.mjs`  
   Check `docker logs pos-ws-bridge` / `pos-haproxy` for start or proxy errors.
5. **Regression:** `curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:4202/` and `/api/health` → **200**.

## Test report

1. **Date/time (UTC):** 2026-07-21 21:05:53 start → 21:06:33 end. Log window: `docker logs --since 10m` / container up since ~21:03.
2. **Environment:** `docker compose -f docker-compose.yml -f docker-compose.dev.yml`; `BASE_URL=http://127.0.0.1:4202`; branch `development` (synced before test).
3. **What was tested:** Rebuild/start `back` + `ws-bridge`; image tags `pos-back` / `pos-ws-bridge`; CMD `uvicorn main:app` on 8021; in-container + HAProxy `/ws/health`; optional `test-websocket.mjs`; regression `/` and `/api/health`.
4. **Results:**
   - Rebuild/start **PASS** — `docker compose … build back ws-bridge` succeeded; images named `docker.io/library/pos-back:latest` and `pos-ws-bridge:latest`; `up -d ws-bridge` left container Running.
   - Image tags **PASS** — `compose images` shows `pos-back:latest` / `pos-ws-bridge:latest` on running containers (legacy `pos2-back:latest` may still exist locally but is not the active tag).
   - CMD **PASS** — `docker inspect pos-ws-bridge` → `[uvicorn main:app --host 0.0.0.0 --port 8021 --log-level info --access-log]`.
   - Container Up / no ModuleNotFound **PASS** — `ps` STATUS Up; logs: `Uvicorn running on http://0.0.0.0:8021`; no `ModuleNotFoundError` / pull denied.
   - In-stack health **PASS** — `{"status":"ok",…}` from `127.0.0.1:8021/health` inside container.
   - HAProxy `/ws/health` **PASS** — HTTP **200**.
   - Optional WebSocket smoke **PASS** (exit 0) — login + `/staff/orders`; script: “No WebSocket open or auth error seen”; no start/proxy errors in `pos-ws-bridge` / HAProxy for `/ws`.
   - Regression `/` and `/api/health` **PASS** — both HTTP **200**.
5. **Overall:** **PASS**
6. **Product owner feedback:** ws-bridge now builds from the pinned `pos-back` Compose image context and stays healthy on 8021 behind HAProxy. Clone directory name no longer forces a broken `pos2-back` FROM. Safe to treat #303 as verified on local Docker.
7. **URLs tested:**
   1. http://127.0.0.1:4202/ws/health
   2. http://127.0.0.1:4202/
   3. http://127.0.0.1:4202/api/health
   4. http://127.0.0.1:4202/ (Puppeteer landing)
   5. http://127.0.0.1:4202/staff/orders (after login, WebSocket smoke)
8. **Relevant log excerpts:**
   ```
   INFO:     Uvicorn running on http://0.0.0.0:8021 (Press CTRL+C to quit)
   INFO:     127.0.0.1:55068 - "GET /health HTTP/1.1" 200 OK
   INFO:     172.30.0.5:45832 - "GET /health HTTP/1.1" 200 OK
   # haproxy:
   … http_frontend ws_backend/ws1 … 200 … "GET /ws/health HTTP/1.1"
   # build:
   naming to docker.io/library/pos-back:latest
   naming to docker.io/library/pos-ws-bridge:latest
   ```
