---
## Closing summary (TOP)

- **What happened:** Front prod Docker image was still on Node 20 while dev was already on Node 22.23.4.
- **What was done:** Aligned `front/Dockerfile.prod` (and AGENTS.md prerequisite) to `node:22.23.4-alpine` with the existing dev pin; left Node 24 as an optional follow-up.
- **What was tested:** Dockerfile pin parity, `pos-front` `node -v` v22.23.4, prod-static image build, curl `/` 200, and `test:landing-version` — all PASS.
- **Why closed:** All testing criteria passed; Node 20→22 prod alignment fully delivered.
- **Closed at (UTC):** 2026-10-22 10:36
---

# Update Node.js (#433)

## GitHub Issues
- **Issue:** https://github.com/satisfecho/pos/issues/433
- **433**

## Status
- **Implemented:** 2026-10-22T10:31:00Z
- Chose **`node:22.23.4-alpine`** (matches existing dev pin; Node 22 LTS; Angular 21 supports `^22.12.0`). Did **not** jump to Active LTS Node 24 / Current 26 in this pass — align prod with dev first.
- Prod builder `front/Dockerfile.prod` updated from `node:20-alpine` → `node:22.23.4-alpine`.
- `AGENTS.md` host prerequisite: Node.js 18+ → Node.js 22+.
- `CHANGELOG.md` `[Unreleased]` updated.
- No GitHub Actions `node-version` pin for app builds (deploy uses Docker on server; Actions already has `FORCE_JAVASCRIPT_ACTIONS_TO_NODE24`).
- Verified: dev `pos-front` runs `v22.23.4`; prod image build (`Dockerfile.prod`) succeeded; `GET /` 200; `test:landing-version` passed.

## Problem / goal
Keep the front Docker/Node toolchain on a current, supported Node.js image. Issue asks whether Node updates are available and, if so, to install the latest appropriate version.

**Current state (as of task creation):**
- Dev image `front/Dockerfile` already uses `node:22.23.4-alpine`.
- Prod image `front/Dockerfile.prod` still uses `node:20-alpine` (builder).
- `AGENTS.md` still mentions Node.js 18+ as a host prerequisite; docs/CI may still reference Node 20.

## High-level instructions for coder
- Confirm the newest **suitable** Node Alpine tags on Docker Hub for this stack (prefer current Active LTS / matching major already used in `front/Dockerfile`; do not jump to an unsupported/experimental major without checking Angular 20+ compatibility).
- Align **`front/Dockerfile`** and **`front/Dockerfile.prod`** (and any other Node base images in compose/CI) so prod is not stuck on Node 20 while dev is on 22.x, unless there is a documented reason to diverge.
- Search the repo for pinned Node versions (GitHub Actions `node-version`, docs that claim Node 18/20, README/AGENTS prerequisites) and update only what this change actually requires.
- Rebuild front images as needed; confirm `ng serve` / prod build succeed (`docker logs` for `pos-front` — no TS/NG build failures).
- Smoke: app responds on HAProxy port (e.g. `curl` 200 on `/` or `npm run test:landing-version` with `BASE_URL` set).
- Note the chosen version(s) in CHANGELOG when committing (committer/changelog step).
- Do **not** run host `npm install`; keep `npm ci --ignore-scripts` and pinned lockfile as today.

## Out of scope
- Unrelated dependency upgrades.
- Host-wide Node installs outside Docker.
- Jump to Node 24 Active LTS (optional follow-up once dev+prod are aligned on 22.23.4).

## Testing instructions

1. Confirm both Dockerfiles pin the same base:
   ```bash
   head -1 front/Dockerfile front/Dockerfile.prod
   # expect: FROM node:22.23.4-alpine (prod has AS builder)
   ```
2. Dev: `docker exec pos-front node -v` → `v22.23.4`. Front logs show no TS/NG build failures after restart.
3. Optional prod builder check:
   ```bash
   docker build -f front/Dockerfile.prod --build-arg COMMIT_HASH=$(git rev-parse --short HEAD) -t pos-front-prod-test:433 front
   ```
   Expect `ng build` / `production-static` to succeed.
4. Smoke (app up via HAProxy, e.g. port from `docker compose ps`):
   ```bash
   curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:14202/   # or :4202
   BASE_URL=http://127.0.0.1:14202 npm run test:landing-version --prefix front
   ```
   Expect HTTP 200 and landing version + demo restaurant card OK.

## Test report

1. **Date/time (UTC):** 2026-10-22T10:32:04Z start → 2026-10-22T10:35:32Z end. Log window: ~10:28–10:35 UTC (`pos-front`).
2. **Environment:** `docker-compose.yml` + `docker-compose.dev.yml`; branch `development` @ `0d1b2e639`; HAProxy `127.0.0.1:14202`; smoke `BASE_URL=http://pos-haproxy:4202` (compose net) / host curl on `:14202`.
3. **What was tested:** Dockerfile pin parity (dev+prod → `node:22.23.4-alpine`); `pos-front` Node version; prod `Dockerfile.prod` build; HTTP `/` + landing version/demo card smoke.
4. **Results:**
   - Dockerfile pins match `node:22.23.4-alpine` (prod `AS builder`): **PASS** — `head -1 front/Dockerfile front/Dockerfile.prod`.
   - Dev `docker exec pos-front node -v` → `v22.23.4`; current `ng serve` healthy (bundle complete, no post-fix ERROR spam): **PASS** — node `-v`; logs `Application bundle generation complete. [7.781 seconds] - 2026-10-22T10:35:04.020Z`; `Watch mode enabled`.
   - Prod builder `docker build -f front/Dockerfile.prod … -t pos-front-prod-test:433`: **PASS** — builder `FROM node:22.23.4-alpine`; `ng build --configuration production-static` → `Application bundle generation complete. [9.514 seconds]`; image tagged.
   - Smoke `curl` `/` → 200; `test:landing-version`: **PASS** — host `http://127.0.0.1:14202/` → `200`; Puppeteer (ghcr.io/puppeteer/puppeteer:24.22.3 on `pos2_net`) → version `2.1.185 0d1b2e639…`, demo card `"Restaurant Demo"`, `>>> RESULT: Landing page shows version and demo restaurant card.`
5. **Overall:** **PASS**
6. **Product owner feedback:** Dev and prod front images now share the same Node 22.23.4 Alpine base, so production builds are no longer stuck on Node 20. Landing and prod-static build both succeed on that toolchain; optional Node 24 follow-up remains out of scope as documented.
7. **URLs tested:**
   1. http://127.0.0.1:14202/ (curl 200)
   2. http://127.0.0.1:14202/api/health (curl 200)
   3. http://pos-haproxy:4202/ (Puppeteer landing smoke)
8. **Relevant log excerpts:**
   ```
   # Dockerfiles
   FROM node:22.23.4-alpine
   FROM node:22.23.4-alpine AS builder

   # Dev
   v22.23.4
   Application bundle generation complete. [7.781 seconds] - 2026-10-22T10:35:04.020Z

   # Prod build
   #6 [builder  1/10] FROM docker.io/library/node:22.23.4-alpine
   Application bundle generation complete. [9.514 seconds] - 2026-10-22T10:32:34.711Z
   naming to docker.io/library/pos-front-prod-test:433

   # Landing smoke
   Version element text: 2.1.185 0d1b2e639 …
   OK: One restaurant card titled "Restaurant Demo"
   >>> RESULT: Landing page shows version and demo restaurant card.
   ```
