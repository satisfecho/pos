# POS2

**Restaurant POS and ordering infrastructure — self-hosted, multi-tenant, real-time.**

A point-of-sale system with a customer-facing menu, table management, reservations, and Stripe payments. Staff use the Angular admin; customers order via QR codes and pay at the table. You keep full control of your data and deployment.

---

## About the Project

POS2 is built for restaurants and venues that want:

- **One place for everything** — Orders, tables, reservations, menu, and payments in a single stack.
- **Customer ordering without apps** — Guests scan a table QR code, browse the menu, place orders, and pay with Stripe. Optional table PIN keeps ordering secure.
- **Real-time updates** — Order status (pending → preparing → ready → delivered → paid) flows to staff and customers over WebSockets.
- **Multi-tenant from day one** — Each restaurant (tenant) has isolated data, settings, and Stripe configuration.
- **Self-hosted** — Run on your own server or local network; no vendor lock-in.

The frontend is Angular; the backend is FastAPI with PostgreSQL and Redis. All major flows are implemented and documented (see [ROADMAP.md](ROADMAP.md) and the `docs/` folder).

---

## Features

| Area | What's included |
|------|------------------|
| **Orders** | Full lifecycle (pending → preparing → ready → delivered → paid). Session-based orders per browser. Item-level status; partial delivery; order modification and cancellation before delivery; soft delete with “Show removed items” in staff UI. |
| **Customer menu** | Browse menu, cart, place order, order history. Optional “immediate payment required” (checkout auto-opens after placing order). |
| **Kitchen display** | Dedicated full-screen view at `/kitchen`: large order cards, auto-refresh and WebSocket updates, optional sound on new orders. Read-only; same access as Orders. See [docs/0015-kitchen-display.md](docs/0015-kitchen-display.md). |
| **Reports** | Sales & revenue at `/reports` (owner/admin): date range, summary, reservation count and by source (public/staff), by product/category/table/waiter, charts, CSV/Excel export. See [docs/0016-reports.md](docs/0016-reports.md). |
| **Payments** | Stripe integration; per-tenant Stripe keys and currency. |
| **Tables** | Table management, QR codes, canvas view. Table activation and 4-digit PIN so only present guests can order; PIN rate limiting via Redis. |
| **Reservations** | Staff: list, create, edit, seat, finish, cancel at `/reservations`. Public: book at `/book/:tenantId`, view/cancel at `/reservation?token=...`. Table status: available / reserved / occupied. |
| **Real-time** | WebSocket updates for order status; token-based WS auth (`/ws-token`). |
| **i18n & currency** | Multiple UI languages (e.g. en, es, ca, de, zh-CN, hi); backend localized messages; per-tenant currency (EUR, USD, MXN, etc.). |
| **Multi-tenant** | Isolated data per tenant; first user becomes owner; configurable roles (owner, admin, kitchen, bartender, waiter, receptionist) and permissions (e.g. reservation read/write). |
| **Provider portal** | Suppliers register at `/provider/register`, log in at `/provider/login`, and manage their catalog at `/provider` (tile/list view, search, add/edit/delete products, company details). See [docs/0014-provider-portal.md](docs/0014-provider-portal.md). |

Planned but not yet implemented: customer accounts (registration, MFA, invoices), batch order operations, and stricter “must pay before continuing” flow. See [ROADMAP.md](ROADMAP.md) and [docs/0002-customer-features-plan.md](docs/0002-customer-features-plan.md).

---

## Built With

- **Frontend:** Angular 21+ (SPA)
- **Backend:** FastAPI, SQLModel ORM
- **Database:** PostgreSQL 18
- **Cache / pub-sub:** Redis 7
- **Real-time:** WebSocket bridge (custom service)
- **Payments:** Stripe
- **Deployment:** Docker Compose, HAProxy

---

## Getting Started

### Prerequisites

- [Docker](https://docs.docker.com/get-docker/) and [Docker Compose](https://docs.docker.com/compose/install/)
- Git

### Quick Start

1. **Clone the repository**
   ```bash
   git clone https://github.com/satisfecho/pos
   cd pos
   ```

2. **Configure environment**
   ```bash
   cp config.env.example config.env
   ```
   For local development the defaults are fine. For production or a custom domain, set `API_URL`, `WS_URL`, `CORS_ORIGINS`, and `SECRET_KEY`. See [docs/0004-deployment.md](docs/0004-deployment.md).

3. **Start all services**
   ```bash
   docker compose --env-file config.env up -d
   ```

4. **Find the app URL**  
   Run `docker compose ps` and check the **PORTS** column for the `haproxy` service (e.g. `0.0.0.0:4202->4202/tcp` or `0.0.0.0:4203->4202/tcp`). The **host port** (4202 or 4203) is your app URL.

   - **App (recommended):** http://localhost:4202 (or the port shown for haproxy)
   - **API docs:** http://localhost:4202/api/docs  
   - **Health:** http://localhost:4202/api/health

5. **Create an account**  
   There is no pre-seeded user. Open **http://localhost:4202/register** (use your actual port), enter tenant name, email, and password. The first user becomes the tenant owner. Then sign in at the main URL.

---

## Access Points

| Purpose | URL |
|--------|-----|
| **Unified app (frontend + API via HAProxy)** | http://localhost:4202 |
| **API docs (Swagger)** | http://localhost:4202/api/docs |
| **Health check** | http://localhost:4202/api/health |
| **DB health** | http://localhost:4202/api/health/db |
| **Public menu (example)** | http://localhost:4202/menu/{table_token} |
| **Public booking** | http://localhost:4202/book/{tenantId} |
| **Provider login** | http://localhost:4202/provider/login |
| **Provider dashboard** | http://localhost:4202/provider |
| **Kitchen display** | http://localhost:4202/kitchen |
| **Reports (owner/admin)** | http://localhost:4202/reports |
| **Dashboard (staff)** | http://localhost:4202/dashboard |

If your frontend port is different (e.g. 4203), replace 4202 with that port. See [AGENTS.md](AGENTS.md) for how to detect the port and debug with logs.

---

## Configuration

Key variables in `config.env` (see `config.env.example` for the full list):

| Variable | Description | Required |
|----------|-------------|----------|
| `SECRET_KEY` | JWT signing; change in production | Yes |
| `REFRESH_SECRET_KEY` | Refresh token signing; must differ from `SECRET_KEY` | Yes |
| `API_URL` | Backend base URL used by frontend (e.g. `http://localhost:4202/api`) | For custom domain |
| `WS_URL` | WebSocket URL (e.g. `ws://localhost:4202/ws`) | For custom domain |
| `CORS_ORIGINS` | Allowed frontend origins (comma-separated) | Yes (production) |
| `POSTGRES_*` / `DB_*` | Database connection | Yes |
| `STRIPE_CURRENCY` | Fallback currency if tenant has none | Optional |

Stripe keys are configured per tenant in **Settings** in the admin UI. For deployment on a domain or IP, see [docs/0004-deployment.md](docs/0004-deployment.md).

---

## Documentation

| Document | Description |
|----------|-------------|
| [ROADMAP.md](ROADMAP.md) | Implemented vs planned features; rate limiting and security roadmap |
| [CHANGELOG.md](CHANGELOG.md) | Release notes and unreleased changes |
| [AGENTS.md](AGENTS.md) | How to find the app port and view logs (for developers/agents) |
| [docs/0008-order-management-logic.md](docs/0008-order-management-logic.md) | Order lifecycle, session rules, status reset |
| [docs/0007-implementation-verification.md](docs/0007-implementation-verification.md) | What’s implemented vs Phase 4 (batch, audit, etc.) |
| [docs/0010-table-reservation-implementation-plan.md](docs/0010-table-reservation-implementation-plan.md) | Reservations design and backend |
| [docs/0011-table-reservation-user-guide.md](docs/0011-table-reservation-user-guide.md) | URLs and flows for staff and public booking |
| [docs/0009-table-pin-security.md](docs/0009-table-pin-security.md) | Table activation and PIN validation |
| [docs/0012-translation-implementation.md](docs/0012-translation-implementation.md) | i18n (frontend + backend + DB content) |
| [docs/0004-deployment.md](docs/0004-deployment.md) | Domain/IP deployment and env vars |
| [docs/0002-customer-features-plan.md](docs/0002-customer-features-plan.md) | Planned customer accounts, MFA, invoices |
| [docs/0005-email-sending-options.md](docs/0005-email-sending-options.md) | Email configuration options |
| [docs/0006-gmail-setup-instructions.md](docs/0006-gmail-setup-instructions.md) | Gmail SMTP setup |
| [docs/0013-verification-alternatives.md](docs/0013-verification-alternatives.md) | Verification flow alternatives |
| [docs/0014-provider-portal.md](docs/0014-provider-portal.md) | Provider registration, login, and catalog management |
| [docs/0015-kitchen-display.md](docs/0015-kitchen-display.md) | Kitchen display: full-screen view, auto-refresh, optional sound |

---

## Architecture

```
Browser → Frontend (Angular) → Backend (FastAPI) → PostgreSQL
                                    ↓
                               Redis (pub/sub)
                                    ↓
                          WebSocket bridge → Browser (real-time)
```

**Services (Docker Compose):**

- **haproxy** — Single entry point; routes `/` to frontend, `/api` to backend, `/ws` to WebSocket bridge. Port from `FRONTEND_PORT` (default 4202).
- **front** — Angular SPA (dev server in container).
- **back** — FastAPI app (Uvicorn).
- **ws-bridge** — WebSocket server; subscribes to Redis and pushes order updates.
- **db** — PostgreSQL 18.
- **redis** — Cache and pub/sub.

---

## Development

### Logs and port

- **Port:** `docker compose ps` → PORTS for `haproxy` → use that host port in the browser.
- **Logs:** `docker compose logs -f` (all); `docker compose logs --tail=50 back`; `docker compose logs --tail=80 front`; `docker compose logs --tail=30 haproxy`.

See [AGENTS.md](AGENTS.md) for more detail.

### Database migrations

Migrations live in `back/migrations/` and run automatically on backend startup.

- **Apply manually:** `docker compose exec back python -m app.migrate`
- **Check pending:** `docker compose exec back python -m app.migrate --check`
- **New migration:** Use timestamped names, e.g. `back/migrations/YYYYMMDDHHMMSS_description.sql`. See `back/migrations/README.md`.

Do not edit existing migration files; add a new migration to change schema.

### Hot reload

- Frontend and backend both reload on code changes when run via Docker Compose.

### Stopping

```bash
docker compose --env-file config.env down
```

---

## Internationalization (i18n)

- **Languages:** English, Spanish, Catalan, German, Chinese (Simplified), Hindi (see `front/public/i18n/*.json`).
- **Currency:** Per-tenant (e.g. EUR, USD, MXN, INR, CNY, TWD).
- **Language picker:** In admin sidebar and on the public menu.
- **API:** Use `?lang=es` (or other code) for localized API messages.

See [docs/0012-translation-implementation.md](docs/0012-translation-implementation.md).

---

## Table Reservations

- **Staff:** Sign in → **Reservations** in the sidebar. List, create, edit, seat at a table, finish, or cancel. Tables canvas shows status **Reserved** (amber) when a reservation is assigned.
- **Public:** Book at **`/book/:tenantId`** (e.g. `http://localhost:4202/book/1`). After booking, use the link to **view or cancel** at `/reservation?token=...`. No login required.

Details: [docs/0011-table-reservation-user-guide.md](docs/0011-table-reservation-user-guide.md).

---

## Deployment

For a custom domain or IP, set in `config.env`:

- `API_URL` and `WS_URL` to your backend base URL (use `https://` and `wss://` for production).
- `CORS_ORIGINS` to your frontend origin(s).

Then restart: `docker compose --env-file config.env up -d`.

Full guide: [docs/0004-deployment.md](docs/0004-deployment.md).

---

## Roadmap

- **Done:** Order management, reservations, table PIN, Stripe, WebSocket, i18n, deployment docs. See [ROADMAP.md](ROADMAP.md) for the full list.
- **Planned:** Customer accounts (register, MFA, invoices), order Phase 4 (batch, audit, item replacement), optional stricter “immediate payment” enforcement. Rate limiting and security hardening are described in [ROADMAP.md](ROADMAP.md).

---

## Security Notes

- **Production:** Set a strong `SECRET_KEY` and `REFRESH_SECRET_KEY` in `config.env`.
- **CORS:** Set `CORS_ORIGINS` to your real frontend origin(s); avoid `*` in production if possible.
- **Database:** Use strong credentials; do not commit `config.env`.
- **Stripe:** Use live keys in production and configure them per tenant in Settings.
- **Rate limiting:** Not yet implemented for most endpoints; PIN attempts are rate-limited. See [ROADMAP.md](ROADMAP.md) for the planned strategy.

---

## Troubleshooting

| Issue | What to try |
|------|-------------|
| **Services won’t start** | Check port conflicts; ensure `config.env` exists and is valid; run `docker compose logs`. |
| **Frontend can’t reach API** | Confirm `API_URL` and `WS_URL` match how the browser reaches the app (e.g. through HAProxy). Check CORS and browser console. |
| **Wrong port** | Run `docker compose ps`, find the host port for `haproxy`, and open that URL (e.g. `http://localhost:4202`). |
| **DB connection errors** | Ensure `db` is healthy (`docker compose ps`); with Compose, use `DB_HOST=db`. Check credentials in `config.env`. |

More: [docs/0004-deployment.md](docs/0004-deployment.md) and [AGENTS.md](AGENTS.md).
