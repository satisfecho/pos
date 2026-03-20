# HAProxy Configuration

HAProxy is the single entry point for end-user traffic. There are two config files:

- **`haproxy.cfg`** — Used with **docker-compose.dev.yml** (local). Listens on **80** and **4202** only; no HTTPS, no certs. Use `http://localhost:4202/`.
- **`haproxy.prod.cfg`** — Used with **docker-compose.prod.yml** (amvara9/production). Listens on **80** and **443**; HTTP→HTTPS redirect; SSL certs from `certbot/haproxy-certs`. See `certbot/README.md` and `docs/0026-haproxy-ssl-amvara9.md`.

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

- **Local (dev):** `docker compose -f docker-compose.yml -f docker-compose.dev.yml up`. HAProxy published on **4202**; use `http://localhost:4202/`.
- **Production (amvara9):** `docker compose -f docker-compose.yml -f docker-compose.prod.yml up`. HAProxy on **80** and **443**; certs from `certbot/haproxy-certs`.

## Testing

- **Dev**: `http://localhost:4202/`, `http://localhost:4202/api/docs`, `ws://localhost:4202/ws/...`
- **Prod**: `http://host/`, `http://host/api/docs`, `ws://host/ws/...` (or `https://` when SSL is configured)
