# LiveKit reservation agents (#456)

> **Status: first vertical slice.** Voice + chat agent worker talks to **existing** public reservation APIs. No second booking store.

## Product decisions (defaults)

| Choice | Value |
|--------|--------|
| **Channels** | Voice **and** chat (issue #456 human reply) |
| **Actions (v1)** | Availability (`next-available`, day slots), **create**, **cancel/lookup by token** |
| **Pilot tenants** | `LIVEKIT_RESERVATION_AGENT_TENANT_IDS` (comma-separated). Empty = public session mint **off** |
| **Architecture** | Thin LiveKit Agents worker → HTTP → POS public reservation routes |

Staff modify/cancel without token stays on the existing authenticated `/reservations` UI.

## What shipped

| Piece | Role |
|-------|------|
| `back/app/reservation_agent_client.py` | HTTP client for public book/cancel APIs |
| `back/app/livekit_reservation.py` | Allowlist + guest LiveKit JWT mint (python-jose) |
| `GET /public/tenants/{id}/reservation-agent` | Enabled? + channels/actions |
| `POST /public/tenants/{id}/reservation-agent/session` | Mint room + guest token (pilot only) |
| `back/livekit_reservation_agent/` | Optional worker (separate requirements) |

## APIs the agent calls

Same contracts as the public book page:

- `GET /reservations/next-available`
- `GET /reservations/book-day-slots`
- `POST /reservations` (body includes `tenant_id`)
- `GET /reservations/by-token`
- `PUT /reservations/{id}/cancel?token=…`

## Config (`config.env`)

```bash
# LIVEKIT_URL=wss://your-project.livekit.cloud
# LIVEKIT_API_KEY=
# LIVEKIT_API_SECRET=
# LIVEKIT_RESERVATION_AGENT_TENANT_IDS=1
# LIVEKIT_RESERVATION_AGENT_TOKEN_TTL_SECONDS=3600
# POS_API_BASE_URL=http://127.0.0.1:4202/api
# LIVEKIT_AGENT_TENANT_ID=1
```

Never commit real keys. Leave unset in local demo unless you are testing LiveKit.

## Run the worker (optional)

```bash
# Separate venv recommended (do not add livekit-agents to the main API image)
cd back
python -m venv .venv-livekit && source .venv-livekit/bin/activate
pip install -r livekit_reservation_agent/requirements-livekit.txt
# Load LIVEKIT_* and POS_API_BASE_URL from config.env
python -m livekit_reservation_agent dev
```

The worker registers with LiveKit; when a guest obtains a session token from POS and joins the room, the agent handles voice (STT/TTS) and text chat with the same tools.

## Frontend

No guest widget in this slice. Clients:

1. `GET …/reservation-agent` → if `enabled`
2. `POST …/reservation-agent/session` → `url` + `token` + `room_name`
3. Join with LiveKit client SDK (voice and/or data chat)

## Out of scope (v1)

- SIP telephony trunking
- Staff-authenticated agent tools
- Modify reservation date/time without token
- Bundling `livekit-agents` into `pos-back` Docker image
- Marketing claims beyond this pilot path

## Tests

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml exec back \
  python3 -m pytest tests/test_livekit_reservation_agent.py -q
```
