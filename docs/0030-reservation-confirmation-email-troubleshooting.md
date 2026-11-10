# Reservation confirmation email troubleshooting (amvara9)

**Status (ops troubleshooting - current):** Use this runbook when a booking has a customer email but no confirmation arrives. For **SMTP setup** (Gmail App Password, Settings → Email fields) see [`0056-gmail-setup.md`](0056-gmail-setup.md). For **provider comparison / research** (SendGrid, Resend, etc.) see [`0005-email-sending-options.md`](0005-email-sending-options.md) - research only, not a shipping checklist.

When public bookings include a customer email but no confirmation email is received, check the following.

**Note:** From a machine where `ssh amvara9` is configured (key-based auth), an agent can run the commands below remotely. If SSH is unavailable, run them on the server and paste the output. The same diagnostic works locally with the dev compose files (see below).

## Run diagnostic (one command)

SSH to amvara9, then from the deploy directory:

```bash
cd /development/pos
COMPOSE_OPTS="--env-file config.env -f docker-compose.yml -f docker-compose.prod.yml"
docker compose $COMPOSE_OPTS exec back python scripts/diagnose_reservation_email.py
```

**Local (dev overlay):** from the repo root:

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml exec back python scripts/diagnose_reservation_email.py
```

Script path inside the back container (`WORKDIR /app`): `scripts/diagnose_reservation_email.py` (host: `back/scripts/diagnose_reservation_email.py`).

This prints: global SMTP status, **per-tenant SMTP** (confirmations use tenant SMTP if set, else global `config.env`), recent reservations with email, and what to check next. Share this output to investigate further.

**Create a test reservation (Puppeteer)** after deploy to trigger the confirmation flow; the reservation email defaults to **ralf.roeber@amvara.de** so you can verify the mail in the inbox. Then inspect backend logs:

```bash
# From repo root (or front/)
BASE_URL=https://www.satisfecho.de HEADLESS=1 node front/scripts/test-reservation-create.mjs
# Override email: TEST_EMAIL=you@your-domain.com node front/scripts/test-reservation-create.mjs
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

After a booking with email, you will see one of:

| Log message | Meaning |
|-------------|--------|
| `Reservation confirmation skipped: tenant_id=... (name=...) has no SMTP and global SMTP not set` | **Most common:** Neither tenant nor global SMTP is usable. Configure **Settings → Email** for the tenant (SMTP host, port, TLS, user, password; optional From), or set global `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD` in `config.env` on the server. |
| `Reservation confirmation skipped: reservation_id=... has no customer_email` | The booking was created without an email address. |
| `Reservation confirmation skipped: tenant_id=... reservation_id=... not found` | Background task could not load tenant or reservation (rare / race). |
| `SMTP credentials not configured (tenant or global)` | From `email_service`: neither tenant nor global SMTP credentials are set at send time. |
| `Failed to send email to ...` | SMTP connection or auth failed (wrong host/port/credentials, firewall, TLS issue). Check the exception text in the same log line. |
| `Reservation confirmation email failed for reservation_id=...` | Wrapper around a send failure (same investigation as `Failed to send email`). |
| `Reservation confirmation email sent for reservation_id=... to ...` | Email was sent successfully. |

## 3. When is the confirmation email sent?

- Whenever a reservation is **created** with a non-empty **customer email** (staff UI or public booking).
- **Public** bookings also get a **token**; the confirmation email may include a **view/cancel** link when `public_app_base_url` is set. Staff-created reservations have no token, so the email has details only (no self-service link).
- **SMTP** must be configured for the tenant (Settings → Email) or globally in `config.env`, or sending is skipped with a log line. Usability for “has SMTP” is `smtp_user` + `smtp_password` (tenant or global); host/port/TLS must still be correct for the provider or send will fail (see [0056](0056-gmail-setup.md)).

### Custom subject and body (Settings → Email)

Tenants can set **plain-text** subject and body with `{{placeholders}}` (e.g. `{{customer_name}}`, `{{cancellation_policy}}`, `{{reservation_link_block_html}}`). Only allowed names are replaced; this is not a full template engine (no code execution). See `back/app/reservation_email_template.py` for the allowlist. Leave both fields empty to use the built-in default wording.

**Language:** Server-generated parts of the confirmation (default subject/body when templates are empty, prepayment amount line, arrival note, map link labels, contact labels, manage-reservation button, HTML footer) follow the tenant **default UI language** (`default_language`), normalized like other API messages. Each reservation stores **`locale`** from the booking request (`?lang=` / `Accept-Language` on `POST /reservations`); when set, that overrides the tenant default for confirmation and reminder emails.

**Prepayment placeholders:** Use `{{prepayment_notice}}` for the combined prepayment amount (when set) plus your **Reservations → prepayment text**. Use `{{prepayment_text}}` only in custom layouts that do **not** also include `{{prepayment_notice}}`, so guests do not see the same policy text twice.

## 4. Quick check: tenant SMTP (or use full diagnostic above)

The reservation confirmation flow uses **tenant SMTP** if the tenant has `smtp_user` + `smtp_password`; otherwise it falls back to **global** `config.env` SMTP. If neither is set, the backend skips sending and logs that tenant and global SMTP are not set.

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

If `smtp_configured=False`, configure Email in the app (Settings → Email) and save. Prefer the full diagnostic script above when investigating production.

## 5. Global SMTP (config.env)

If you prefer one SMTP account for all tenants, set on the server in `config.env`:

- `SMTP_HOST` (e.g. smtp.gmail.com)
- `SMTP_PORT` (e.g. 587)
- `SMTP_USER`
- `SMTP_PASSWORD`
- Optionally `SMTP_USE_TLS=true`, `EMAIL_FROM`, `EMAIL_FROM_NAME`

Then restart the back container: `docker compose $COMPOSE_OPTS up -d back`.
