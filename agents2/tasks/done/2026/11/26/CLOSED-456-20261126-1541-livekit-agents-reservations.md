---
## Closing summary (TOP)

- **What happened:** Issue #456 asked for LiveKit Agents so voice/chat can handle restaurant reservations via existing public APIs.
- **What was done:** Shipped a gated vertical slice (docs, client, token/allowlist, public status/session endpoints, optional worker) on `development`; empty allowlist keeps the feature off by default.
- **What was tested:** 11 unit tests passed; public status endpoint returns `enabled: false` when allowlist is empty; LiveKit Cloud E2E skipped (no credentials).
- **Why closed:** All required tester criteria passed (overall PASS).
- **Closed at (UTC):** 2026-11-26 16:35
---

# LiveKit agents for reservations

## GitHub Issues
- **Issue:** https://github.com/satisfecho/pos/issues/456
- **456**

## Status
- **In progress → shipping vertical slice** after human reply on #456 (`voice and chat ... just do both`, 2026-11-26T16:00:05Z).
- Cleared prior **Blocked - waiting for human** (waiting notice was 2026-11-26T15:43:06Z).
- Defaults for remaining product options (prefer config over parking):
  - **Actions:** availability + create + cancel/lookup by token (public APIs only).
  - **Pilot tenants:** `LIVEKIT_RESERVATION_AGENT_TENANT_IDS` (empty = off).
  - **Architecture:** thin LiveKit Agents worker → existing public reservation HTTP APIs (no second store).

## Problem / goal
Explore and (if product agrees) add LiveKit Agents so voice/chat agents can handle restaurant reservations end-to-end, using existing public and staff reservation APIs rather than a parallel booking system.

## High-level instructions for coder
- Read issue #456 and reservation docs: `docs/0010-table-reservation-implementation-plan.md`, `docs/0011-table-reservation-user-guide.md`, `docs/0025-reservation-overbooking-detection.md`.
- Survey existing reservation endpoints (public book-by-tenant, staff reservations, cancel-by-token) and note what an agent would call.
- There is no LiveKit usage in this repo yet. Propose a thin integration path (LiveKit Agents + worker talking to existing APIs) on **`development`**; do not invent a second reservation store.
- Prefer a small vertical slice (e.g. check availability + create reservation for one tenant) over a full contact-center product.
- Secrets (LiveKit API key/secret, SIP, etc.) belong in `config.env` / deployment secrets only - never hard-code or paste into the task file.
- Keep multi-tenant scoping and auth consistent with adjacent reservation routes.

## Implementation notes (010)
- Docs: `docs/0093-livekit-reservation-agents.md`
- Client: `back/app/reservation_agent_client.py`
- Token/allowlist: `back/app/livekit_reservation.py`
- Public: `GET/POST /public/tenants/{id}/reservation-agent[/session]`
- Optional worker: `back/livekit_reservation_agent/` (+ `requirements-livekit.txt`, not in main image)
- Settings / `config.env.example`: `LIVEKIT_*`, `POS_API_BASE_URL`

## Testing instructions

1. Unit tests (no LiveKit Cloud required):

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml exec -T back \
  python3 -m pytest tests/test_livekit_reservation_agent.py -q
```

Expect 11 passed.

2. Status endpoint when allowlist empty (default):

```bash
curl -s http://127.0.0.1:4202/api/public/tenants/1/reservation-agent
```

Expect `"enabled": false`.

3. Optional (needs LiveKit credentials in `config.env` + worker): set `LIVEKIT_*` and `LIVEKIT_RESERVATION_AGENT_TENANT_IDS=1`, restart back, `POST .../reservation-agent/session` should return `url`/`token`/`room_name`; run `python -m livekit_reservation_agent` from `back/` with optional deps installed.

## Test report

1. **Date/time (UTC):** 2026-11-26 16:34:31 start - 16:34:50 end. Log window: last ~15m on pos-back / pos-front.
2. **Environment:** `docker-compose.yml` + `docker-compose.dev.yml`; branch `development`; host `BASE_URL` via HAProxy `http://127.0.0.1:14202` (4202 not published on this host; health 200 on 14202).
3. **What was tested:** Unit tests for LiveKit reservation agent (11 expected); public status endpoint when allowlist empty (`enabled: false`). Optional LiveKit Cloud session/worker skipped (no `LIVEKIT_*` in config.env / container env).
4. **Results:**
   - Unit tests (`tests/test_livekit_reservation_agent.py -q`): **PASS** - `11 passed, 2 warnings in 1.46s`.
   - Status endpoint allowlist empty: **PASS** - `GET /api/public/tenants/1/reservation-agent` → `{"enabled":false,"channels":[],"actions":[]}` HTTP 200.
   - Optional LiveKit session + worker: **N/A** - no LiveKit credentials configured; not required for pass.
5. **Overall:** **PASS**
6. **Product owner feedback:** Vertical slice is correctly gated off by default and covered by unit tests without LiveKit Cloud. Status API matches the "empty allowlist = disabled" contract. Full voice/chat E2E still needs credentials and a running worker when you want a pilot tenant.
7. **URLs tested:**
   1. `http://127.0.0.1:14202/api/health` (200)
   2. `http://127.0.0.1:14202/api/public/tenants/1/reservation-agent` (200, enabled false)
8. **Relevant log excerpts:**
```
pos-back: GET /public/tenants/1/reservation-agent HTTP/1.1" 200 OK
pos-back: GET /public/tenants/1/reservation-agent HTTP/1.1" 200 OK
pytest: 11 passed, 2 warnings in 1.46s
```
