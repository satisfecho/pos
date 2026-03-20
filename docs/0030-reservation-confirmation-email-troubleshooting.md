# Reservation confirmation email troubleshooting (amvara9)

When public bookings include a customer email but no confirmation email is received, check the following.

**Note:** The assistant cannot connect to amvara9 (no SSH/remote access). Run the diagnostic and log commands below on the server and paste the output if you need help interpreting it.

## Run diagnostic on amvara9 (one command)

SSH to amvara9, then from the deploy directory:

```bash
cd /development/pos
COMPOSE_OPTS="--env-file config.env -f docker-compose.yml -f docker-compose.prod.yml"
docker compose $COMPOSE_OPTS exec back python scripts/diagnose_reservation_email.py
```

This prints: global SMTP status, **per-tenant SMTP** (the confirmation flow uses **tenant** SMTP only; no global fallback), recent reservations with email, and what to check next. Share this output to investigate further.

**Create a test reservation (Puppeteer)** after deploy to trigger the confirmation flow and then inspect backend logs:

```bash
# From repo root (or front/)
BASE_URL=https://www.satisfecho.de HEADLESS=1 node front/scripts/test-reservation-create.mjs
# Or: npm run test:reservation-create --prefix front
```

## 1. View backend logs on amvara9

On the server (e.g. SSH into amvara9), from the deploy directory:

```bash
cd /development/pos
COMPOSE_OPTS="--env-file config.env -f docker-compose.yml -f docker-compose.prod.yml"
docker compose $COMPOSE_OPTS logs back --tail=200
```

Follow logs in real time while making a test booking:

```bash
docker compose $COMPOSE_OPTS logs -f back
```

## 2. What to look for in logs

After the code change that added logging, you will see one of:

| Log message | Meaning |
|-------------|--------|
| `Reservation confirmation skipped: tenant_id=... has no SMTP configured` | **Most common:** The tenant (e.g. Cobalto) has no Email settings. Configure **Settings → Email** in the app (SMTP host, port, user, password) for the tenant, or set global `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD` in `config.env` on the server. |
| `Reservation confirmation skipped: reservation_id=... has no customer_email` | The booking was created without an email address (or it was a staff-created reservation; confirmations are only sent for **public** bookings with email). |
| `SMTP credentials not configured (tenant or global)` | From email_service: neither tenant nor global SMTP is set. |
| `Failed to send email to ...` | SMTP connection or auth failed (wrong host/port/credentials, firewall, TLS issue). Check the exception text in the same log line. |
| `Reservation confirmation email sent for reservation_id=...` | Email was sent successfully. |

## 3. When is the confirmation email sent?

- Only for **public** bookings (no staff logged in when creating the reservation).
- The reservation must have a **customer email** and a **token** (public bookings get a token automatically).
- The **tenant** must have **SMTP configured** (Settings → Email: SMTP host, port, user, password), or the server must have global SMTP in `config.env`.

## 4. Quick check: tenant SMTP (or use full diagnostic above)

The reservation confirmation flow uses **tenant SMTP** if the tenant has it; otherwise it falls back to **global** `config.env` SMTP. If neither is set, the backend skips sending and logs "Reservation confirmation skipped".

Quick DB check:

```bash
docker compose $COMPOSE_OPTS exec back python -c "
from app.db import engine
from sqlmodel import Session, select
from app import models
with Session(engine) as s:
    for t in s.exec(select(models.Tenant)).all():
        has_smtp = bool(t.smtp_user and t.smtp_password)
        print(f'tenant_id={t.id} name={t.name} smtp_configured={has_smtp}')
"
```

If `smtp_configured=False`, configure Email in the app (Settings → Email) and save.

## 5. Global SMTP (config.env)

If you prefer one SMTP account for all tenants, set on the server in `config.env`:

- `SMTP_HOST` (e.g. smtp.gmail.com)
- `SMTP_PORT` (e.g. 587)
- `SMTP_USER`
- `SMTP_PASSWORD`
- Optionally `SMTP_USE_TLS=true`, `EMAIL_FROM`, `EMAIL_FROM_NAME`

Then restart the back container: `docker compose $COMPOSE_OPTS up -d back`.
