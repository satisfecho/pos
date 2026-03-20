#!/usr/bin/env python3
"""
Diagnose why reservation confirmation emails may not be sent or not reaching the mailbox.
Run on amvara9 (or any deploy) inside the back container. Prints tenant SMTP status,
global SMTP status, and recent reservations with email — no passwords printed.

Usage on server (from deploy dir, e.g. /development/pos):
  docker compose --env-file config.env -f docker-compose.yml -f docker-compose.prod.yml exec back \\
    python scripts/diagnose_reservation_email.py

Or from back/ with env loaded:
  cd back && python scripts/diagnose_reservation_email.py
"""
from __future__ import annotations

import sys
from pathlib import Path

# Ensure back (parent of scripts/) is on path so "from app..." works
_back = Path(__file__).resolve().parent.parent
if str(_back) not in sys.path:
    sys.path.insert(0, str(_back))

from sqlmodel import Session, select

from app import models
from app.db import engine
from app.settings import settings


def main() -> None:
    print("=== Reservation confirmation email diagnostic ===\n")

    # 1. Global SMTP (config.env)
    print("1. Global SMTP (config.env / environment)")
    has_global = bool(settings.smtp_user and settings.smtp_password)
    print(f"   SMTP_HOST: {settings.smtp_host or '(not set)'}")
    print(f"   SMTP_PORT: {settings.smtp_port}")
    print(f"   SMTP_USER: {settings.smtp_user or '(not set)'}")
    print(f"   SMTP_PASSWORD: {'set' if settings.smtp_password else '(not set)'} (length {len(settings.smtp_password or '')})")
    print(f"   EMAIL_FROM: {settings.email_from or '(not set)'}")
    print(f"   => Global SMTP usable for send: {has_global}\n")

    # 2. Per-tenant SMTP
    print("2. Tenant SMTP (Settings → Email in app)")
    with Session(engine) as session:
        tenants = list(session.exec(select(models.Tenant)).all())
    for t in tenants:
        has_tenant = bool(t.smtp_user and t.smtp_password)
        print(f"   tenant_id={t.id} name={t.name!r}")
        print(f"      smtp_host={getattr(t, 'smtp_host', None) or '(not set)'}")
        print(f"      smtp_port={getattr(t, 'smtp_port', None)}")
        print(f"      smtp_user={'set' if (t.smtp_user and t.smtp_user.strip()) else '(not set)'}")
        print(f"      smtp_password={'set' if (t.smtp_password and t.smtp_password.strip()) else '(not set)'}")
        print(f"      => Tenant SMTP usable: {has_tenant}")
    if not tenants:
        print("   (no tenants)")
    print()

    # 3. Effective sender: tenant SMTP if set, else global. If neither, skipped.
    with Session(engine) as session:
        tenants = list(session.exec(select(models.Tenant)).all())
    any_tenant_smtp = any(t.smtp_user and t.smtp_password for t in tenants)
    can_send = any_tenant_smtp or has_global
    print("3. When is confirmation email sent?")
    print("   - Only for PUBLIC bookings (no staff logged in) with customer_email and token.")
    print("   - Backend uses TENANT SMTP if tenant has smtp_user + smtp_password.")
    print("   - If tenant has no SMTP, backend falls back to GLOBAL SMTP (config.env).")
    print("   - If neither tenant nor global SMTP is set, sending is skipped.")
    print(f"   => At least one tenant has SMTP: {any_tenant_smtp}")
    print(f"   => Global SMTP set: {has_global}")
    print(f"   => Can send (tenant or global): {can_send}\n")

    # 4. Recent reservations with email (could have triggered confirmation)
    print("4. Recent reservations (last 15) with customer_email")
    with Session(engine) as session:
        reservations = list(
            session.exec(
                select(models.Reservation)
                .where(models.Reservation.customer_email.isnot(None))
                .order_by(models.Reservation.created_at.desc())
                .limit(15)
            ).all()
        )
    if not reservations:
        print("   (none)")
    else:
        for r in reservations:
            email_display = (r.customer_email or "").strip() or "(blank)"
            if len(email_display) > 4:
                email_display = email_display[:3] + "***" + email_display[-4:]
            created = r.created_at.strftime("%Y-%m-%d %H:%M") if r.created_at else "?"
            print(f"   id={r.id} tenant_id={r.tenant_id} email={email_display} created={created} status={r.status}")
    print()

    # 5. Possible causes and next steps
    print("5. Possible causes if mails don't reach mailbox")
    if not can_send:
        print("   - NO SMTP configured: set tenant SMTP in Settings → Email, or set SMTP_* in config.env.")
    else:
        print("   - SMTP is configured. If backend logs say 'Reservation confirmation email sent' but mailbox is empty:")
        print("     • Check spam/junk; check recipient address.")
        print("     • Some providers accept then drop (greylist). Try sending to a different address.")
        print("   - If backend logs say 'Failed to send email' or 'Reservation confirmation email failed':")
        print("     • Check SMTP host/port, TLS, and app password (e.g. Gmail needs app password).")
        print("     • Run: docker compose ... exec back python scripts/debug_smtp.py your@email.com")
    print("\n6. Backend logs to check (run in deploy dir)")
    print("   docker compose --env-file config.env -f docker-compose.yml -f docker-compose.prod.yml logs back --tail=200")
    print("   Look for: 'Reservation confirmation email sent' | 'Reservation confirmation skipped' | 'Failed to send email'")
    print()


if __name__ == "__main__":
    main()
