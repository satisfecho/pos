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
