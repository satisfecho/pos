# Platform operator portal – Documentation

This document describes the **platform operator portal**: login and SaaS oversight for Satisfecho platform administrators. It is distinct from the **provider portal** (`/provider`) and **tenant staff** login (`/login`).

---

## 1. Overview

Platform operators can:

- **Log in** at `/platform/login` (scope `platform` on `/token`).
- View a **dashboard** at `/platform` with:
  - Total tenant (client) count
  - New tenant sign-ups in the last 30 days
  - Login activity (last 24 hours / 7 days)
  - **All tenants** with owner contact email, product count, and links
  - Recent login events (who logged in, which tenant, scope)
- Open a **tenant detail** page at `/platform/tenants/{id}` with:
  - Owner and business contact (email, phone)
  - Activity stats (products, tables, users, orders, reservations)
  - **Staff accounts** (email + role) — whom to contact
  - Links to **public pages** for that tenant:
    - `/public-menu/{id}` — guest menu
    - `/book/{id}` — reservations / booking
    - `/waitlist/{id}` — waitlist
    - `/delivery/{id}` — Satisfecho Delivery checkout

Operator users live in the same `User` table with `role=platform_operator`, `tenant_id=NULL`, and `provider_id=NULL`.

---

## 2. URLs

| Purpose | URL |
|--------|-----|
| Operator login | `/platform/login` |
| Operator dashboard | `/platform` |
| Tenant detail | `/platform/tenants/{tenantId}` |
| Guest menu (review) | `/public-menu/{tenantId}` |
| Guest booking | `/book/{tenantId}` |
| Guest waitlist | `/waitlist/{tenantId}` |
| Guest delivery checkout | `/delivery/{tenantId}` |

---

## 3. Backend API

All endpoints require a JWT from login with `?scope=platform`.

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/token?scope=platform` | Operator login (email + password). |
| `GET` | `/platform/me` | Current operator profile. |
| `GET` | `/platform/metrics` | Aggregated metrics + recent tenants/logins. |
| `GET` | `/platform/tenants` | All tenants (up to 100) with owner contact and counts. |
| `GET` | `/platform/tenants/{id}` | Tenant detail + staff contacts. |

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

- Operator endpoints expose **tenant owner/staff emails** and business contact fields to **platform operators only** — not to other tenants or public users.
- Customer/guest PII (reservation guest emails, order customer data) is not shown on the platform dashboard.
- Use a dedicated operator account; do not reuse tenant staff or provider credentials.
- Protect `PLATFORM_OPERATOR_PASSWORD` like any admin secret (deployment env / secrets manager).
