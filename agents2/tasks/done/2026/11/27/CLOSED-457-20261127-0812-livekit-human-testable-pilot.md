---
## Closing summary (TOP)

- **What happened:** Issue #457 asked for a human-testable LiveKit reservation-agent pilot (join surface, docs, screenshots) on top of the gated #456 slice.
- **What was done:** Added pilot HTML join page, Puppeteer harness, Human test A/B docs, config notes, and a gated disabled-state screenshot; full Cloud path left for operators with `LIVEKIT_*`.
- **What was tested:** 11 unit tests, gated status/session APIs, pilot page + screenshot, and docs checks all PASS; optional Cloud pilot skipped (no credentials).
- **Why closed:** All required criteria passed on the gated path; full Cloud pilot not required when credentials are absent.
- **Closed at (UTC):** 2026-11-27 08:24
---

# LiveKit reservation agent - human-testable pilot (#457)

## GitHub Issues
- **Issue:** https://github.com/satisfecho/pos/issues/457
- **457**

## Status
- **Implemented:** 2026-11-27T08:22:00Z
- Minimal guest join page, docs, Puppeteer harness, gated screenshot (no LiveKit Cloud credentials in this environment).

## Problem / goal
Issue #456 shipped a gated LiveKit reservation-agent vertical slice (public status/session APIs, optional worker, unit tests). The human now wants a version they can **actually test**, with **screenshots** and clear **test instructions** when done.

Baseline and contracts: `docs/0093-livekit-reservation-agents.md`. Related closed work: `agents2/tasks/done/2026/11/26/CLOSED-456-20261126-1541-livekit-agents-reservations.md`.

## High-level instructions for coder
- Read #457, #456 closing notes, and `docs/0093-livekit-reservation-agents.md`. Do not invent a second booking store; keep calling existing public reservation APIs.
- Deliver a **human-testable** path for the pilot (voice and/or data chat):
  - Document exact `config.env` keys needed (`LIVEKIT_*`, allowlist, `POS_API_BASE_URL`) without pasting secrets.
  - Ensure `GET …/reservation-agent` / `POST …/reservation-agent/session` behave as documented when a pilot tenant is allowlisted.
  - Prefer a **minimal guest join surface** or scripted client that uses the session mint + LiveKit client SDK so a human can join a room without reinventing the worker. Issue text: no full guest widget was required in the first slice; for #457, add only what is needed for human verification (small page or documented join steps + harness).
- Keep **out of scope** from #457 / 0093: SIP trunking; staff-authenticated agent tools; modify reservation date/time without token; bundling `livekit-agents` into the `pos-back` Docker image.
- Secrets stay in `config.env` / deployment secrets only - never hard-code or put into the task file / commits.
- When done: update docs with step-by-step human test instructions, attach or store **screenshots** of the working flow (status enabled, session join, book/cancel via agent if credentials available), and append **Testing instructions** for the tester agent. If LiveKit Cloud credentials are missing in the environment, document the exact gated checks that still pass without Cloud and what the human must set to run the full pilot.
- Work on **`development`**; push `development` only unless issue labels require urgent promote.

## What was implemented
- `front/public/reservation-agent-pilot.html` - status check, session mint, LiveKit CDN join (mic + data chat).
- `front/scripts/test-reservation-agent-pilot.mjs` + `npm run test:reservation-agent-pilot`.
- Docs: `docs/0093-livekit-reservation-agents.md` human test A (gated) / B (full Cloud + worker); config key table; screenshot of disabled pilot UI.
- `config.env.example`: note pilot URL + `LIVEKIT_AGENT_TENANT_ID`.
- Screenshot: `docs/screenshots/livekit-reservation-agent-pilot-disabled.png` (no Cloud credentials here; enabled/join screenshots need human `LIVEKIT_*`).

## Testing instructions

1. **Backend unit tests** (no LiveKit Cloud):

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml exec -T back \
  python3 -m pytest tests/test_livekit_reservation_agent.py -q
```

Expect: 11 passed.

2. **Gated public API** (credentials unset - default local):

```bash
# Replace port with host HAProxy port from docker compose ps (e.g. 14202 or 4202)
curl -s http://127.0.0.1:14202/api/public/tenants/1/reservation-agent
# {"enabled":false,"channels":[],"actions":[]}

curl -s -o /dev/null -w "%{http_code}\n" -X POST \
  http://127.0.0.1:14202/api/public/tenants/1/reservation-agent/session
# 404
```

3. **Pilot page + harness**:

```bash
# Open in browser: http://127.0.0.1:<port>/reservation-agent-pilot.html?tenantId=1
# Badge should show "disabled"; Join stays inactive.

BASE_URL=http://127.0.0.1:14202 npm run test:reservation-agent-pilot --prefix front
```

If host Chromium/snap cannot launch, API checks in the script still matter; screenshot already stored at `docs/screenshots/livekit-reservation-agent-pilot-disabled.png`. Optional capture via Docker Chrome:

```bash
mkdir -p tmp/screenshots && chmod 777 tmp/screenshots
docker run --rm --network host -v "$PWD/tmp/screenshots:/screenshots" zenika/alpine-chrome:124 \
  --no-sandbox --headless --disable-gpu --virtual-time-budget=8000 \
  --screenshot=/screenshots/livekit-reservation-agent-pilot-disabled.png \
  --window-size=1100,900 \
  'http://127.0.0.1:14202/reservation-agent-pilot.html?tenantId=1'
```

4. **Optional full pilot** (only if `LIVEKIT_URL` / `LIVEKIT_API_KEY` / `LIVEKIT_API_SECRET` / `LIVEKIT_RESERVATION_AGENT_TENANT_IDS` are set in `config.env`, back restarted, worker running): status `enabled:true`, Join room works, `REQUIRE_ENABLED=1` harness passes. Not required to close this task when credentials are absent - document and pass gated path.

5. Confirm docs: `docs/0093-livekit-reservation-agents.md` sections Human test A/B and screenshot render.

## Test report

- **Date/time (UTC):** 2026-11-27T08:21:54Z start – 2026-11-27T08:23:14Z end
- **Log window:** ~2026-11-27T08:08Z – 08:23Z (docker logs `--since 15m` / `20m`)
- **Environment:** `docker-compose.yml` + `docker-compose.dev.yml`; host HAProxy `127.0.0.1:14202`; branch `development`. No `LIVEKIT_*` in `pos-back` process env (gated path). Full Cloud pilot not required per Testing instructions.

### What was tested
Backend unit tests; gated status/session APIs; pilot HTML page (disabled badge, Join inactive); docs Human test A/B + screenshot; optional full pilot skipped (credentials absent).

### Results
1. **pytest `tests/test_livekit_reservation_agent.py`:** **PASS** – `11 passed` in 1.44s via `docker compose … exec -T back`.
2. **Gated status API:** **PASS** – `GET /api/public/tenants/1/reservation-agent` → `{"enabled":false,"channels":[],"actions":[]}`.
3. **Gated session mint:** **PASS** – `POST …/reservation-agent/session` → HTTP `404` (host curl and back logs).
4. **Pilot page + harness (gated):** **PASS** – Page HTTP 200; alpine-chrome screenshot shows badge `disabled`, Join inactive, event log “Agent disabled…”. Harness API portion inside front (`BASE_URL=http://haproxy:4202`) logged `Gated check OK: enabled=false`. Puppeteer browser step failed (no Chrome in front image; host path falls back to macOS Chrome) – covered by Docker Chrome screenshot per Testing instructions.
5. **Docs 0093 Human test A/B + screenshot:** **PASS** – Sections present; `docs/screenshots/livekit-reservation-agent-pilot-disabled.png` exists (~51KB); markdown image path resolves.
6. **Optional full pilot (Cloud + worker):** **N/A / skipped** – no `LIVEKIT_*` on back; not required to close.

### Overall: **PASS**

### Product owner feedback
The human-testable gated path is solid: APIs, pilot page, docs, and screenshot match the “credentials unset” contract from #456/#457. A human can follow Human test B once LiveKit Cloud keys and allowlist are set. The npm Puppeteer harness needs Chrome available (host or image) for the browser step; Docker alpine-chrome is a workable substitute for the disabled screenshot.

### URLs tested
1. `http://127.0.0.1:14202/api/public/tenants/1/reservation-agent`
2. `http://127.0.0.1:14202/api/public/tenants/1/reservation-agent/session` (POST)
3. `http://127.0.0.1:14202/reservation-agent-pilot.html?tenantId=1`
4. `http://haproxy:4202/…` (same paths from inside `pos-front` / harness API check)

### Relevant log excerpts
```
pos-back pytest: 11 passed, 2 warnings in 1.44s
pos-back: GET /public/tenants/1/reservation-agent HTTP/1.1" 200 OK
pos-back: POST /public/tenants/1/reservation-agent/session HTTP/1.1" 404 Not Found
curl status: {"enabled":false,"channels":[],"actions":[]}
harness (front, API): Gated check OK: enabled=false
alpine-chrome: 51469 bytes written …/livekit-reservation-agent-pilot-disabled.png
```
