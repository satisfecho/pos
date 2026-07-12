# Platform operator portal – Documentation

This document describes the **platform operator portal**: login and read-only SaaS metrics for Satisfecho platform administrators. It is distinct from the **provider portal** (`/provider`) and **tenant staff** login (`/login`).

---

## 1. Overview

Platform operators can:

- **Log in** at `/platform/login` (scope `platform` on `/token`).
- View a **read-only dashboard** at `/platform` with:
  - Total tenant (client) count
  - New tenant sign-ups in the last 30 days
  - Login activity (last 24 hours / 7 days)
  - Recent tenants (id, name, created_at — no PII)
  - Recent login events (timestamp, role, tenant_id, scope — no emails)

Operator users live in the same `User` table with `role=platform_operator`, `tenant_id=NULL`, and `provider_id=NULL`.

---

## 2. URLs

| Purpose | URL |
|--------|-----|
| Operator login | `/platform/login` |
| Operator dashboard | `/platform` |

---

## 3. Backend API

All endpoints require a JWT from login with `?scope=platform`.

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/token?scope=platform` | Operator login (email + password). |
| `GET` | `/platform/me` | Current operator profile. |
| `GET` | `/platform/metrics` | Aggregated metrics (read-only). |

Successful logins (all scopes) append a row to `login_event` for operator metrics.

---

## 4. Creating the first operator

Set credentials in **`config.env`** (never commit real passwords):

```env
PLATFORM_OPERATOR_EMAIL=ops@yourcompany.de
PLATFORM_OPERATOR_PASSWORD=choose-a-strong-password
```

Then run (with backend in Docker):

```bash
docker compose exec back python -m app.seeds.ensure_platform_operator
```

The seed is idempotent: re-running updates the password and ensures role/tenant fields are correct.

---

## 5. Security notes

- Operator endpoints return **aggregates** only; no cross-tenant PII (emails, customer data).
- Use a dedicated operator account; do not reuse tenant staff or provider credentials.
- Protect `PLATFORM_OPERATOR_PASSWORD` like any admin secret (deployment env / secrets manager).
