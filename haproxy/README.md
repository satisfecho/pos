# HAProxy Configuration

HAProxy is the single entry point for end-user traffic:

- **Production**: listens on **80** (HTTP) and **443** (HTTPS). Configure SSL on 443 in `haproxy.cfg` if needed.
- **Development**: listens on **4202** only (no root, no conflict with other services).

## Routing

- **Frontend (Static Files)**: `/` → `pos-front:80` (or `pos-front:4200` in dev)
- **API Requests**: `/api/*` → `pos-back:8020/*` (path prefix removed)
- **WebSocket**: `/ws/*` → `pos-ws-bridge:8021/*` (path prefix removed)

## Configuration

The frontend is configured to use relative URLs by default:
- API: `/api` (proxied to backend)
- WebSocket: `ws://host/ws` or `wss://host/ws` (proxied to ws-bridge)

You can override these by setting environment variables:
- `API_URL` - absolute API URL (if not set, uses `/api`)
- `WS_URL` - absolute WebSocket URL (if not set, uses relative `ws://host/ws`)

## Usage

- **Development**: `docker compose up` (uses `docker-compose.override.yml`). HAProxy is published on **4202**; use `http://localhost:4202/`.
- **Production**: `docker compose -f docker-compose.yml -f docker-compose.prod.yml up`. HAProxy is published on **80** and **443**; no port in URL.

## Testing

- **Dev**: `http://localhost:4202/`, `http://localhost:4202/api/docs`, `ws://localhost:4202/ws/...`
- **Prod**: `http://host/`, `http://host/api/docs`, `ws://host/ws/...` (or `https://` when SSL is configured)
