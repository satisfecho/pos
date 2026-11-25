"""
Public careers apply: short-lived 6-digit email confirmation before storing PII/CV (#448).

Reuses hash/code patterns from owner signup; challenges are tenant-scoped and ephemeral.
"""

from __future__ import annotations

import hashlib
import logging
import secrets
from datetime import datetime, timedelta, timezone

from sqlmodel import Session, select

from app import email_service as email_svc
from app import models
from app.settings import settings

logger = logging.getLogger(__name__)

CODE_DIGITS = 6
SUBMIT_TOKEN_BYTES = 32


def code_max_age() -> timedelta:
    minutes = int(getattr(settings, "careers_verification_expire_minutes", 30) or 30)
    return timedelta(minutes=max(5, minutes))


def submit_token_max_age() -> timedelta:
    minutes = int(getattr(settings, "careers_submit_token_expire_minutes", 15) or 15)
    return timedelta(minutes=max(5, minutes))


def hash_secret(raw: str) -> str:
    return hashlib.sha256(raw.strip().encode("utf-8")).hexdigest()


def generate_code() -> str:
    fixed = (getattr(settings, "careers_fixed_code", "") or "").strip()
    if not fixed:
        fixed = (getattr(settings, "owner_signup_fixed_code", "") or "").strip()
    if fixed and not settings.is_production and len(fixed) == CODE_DIGITS and fixed.isdigit():
        return fixed
    return f"{secrets.randbelow(10**CODE_DIGITS):0{CODE_DIGITS}d}"


def generate_submit_token() -> str:
    return secrets.token_urlsafe(SUBMIT_TOKEN_BYTES)


def _aware(dt: datetime | None) -> datetime | None:
    if dt is None:
        return None
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt


def purge_expired_challenges(session: Session, tenant_id: int | None = None) -> int:
    now = datetime.now(timezone.utc)
    q = select(models.CareerEmailChallenge).where(
        models.CareerEmailChallenge.expires_at < now
    )
    if tenant_id is not None:
        q = q.where(models.CareerEmailChallenge.tenant_id == tenant_id)
    rows = list(session.exec(q).all())
    for row in rows:
        session.delete(row)
    if rows:
        session.commit()
    return len(rows)


def latest_open_challenge(
    session: Session, tenant_id: int, email: str
) -> models.CareerEmailChallenge | None:
    return session.exec(
        select(models.CareerEmailChallenge)
        .where(
            models.CareerEmailChallenge.tenant_id == tenant_id,
            models.CareerEmailChallenge.email == email,
            models.CareerEmailChallenge.verified_at == None,  # noqa: E711
        )
        .order_by(models.CareerEmailChallenge.sent_at.desc())
    ).first()


async def issue_and_send_code(
    *,
    tenant: models.Tenant,
    email: str,
    session: Session,
    lang: str,
    client_ip: str | None,
) -> tuple[models.CareerEmailChallenge, str, bool]:
    """
    Create/replace open challenge, email 6-digit code.
    Returns (challenge, raw_code, email_sent).
    """
    purge_expired_challenges(session, int(tenant.id))
    # Invalidate prior open challenges for this email+tenant
    prior = session.exec(
        select(models.CareerEmailChallenge).where(
            models.CareerEmailChallenge.tenant_id == int(tenant.id),
            models.CareerEmailChallenge.email == email,
            models.CareerEmailChallenge.verified_at == None,  # noqa: E711
        )
    ).all()
    for row in prior:
        session.delete(row)
    if prior:
        session.commit()

    raw = generate_code()
    now = datetime.now(timezone.utc)
    challenge = models.CareerEmailChallenge(
        tenant_id=int(tenant.id),
        email=email,
        code_hash=hash_secret(raw),
        sent_at=now,
        expires_at=now + code_max_age(),
        client_ip=client_ip,
        created_at=now,
    )
    session.add(challenge)
    session.commit()
    session.refresh(challenge)

    email_sent = False
    if email_svc.smtp_credentials_configured(tenant):
        email_sent = await email_svc.send_careers_verification_email(
            email, raw, tenant=tenant, lang=lang
        )
    else:
        logger.warning(
            "careers verify email skipped: SMTP not configured; tenant_id=%s",
            tenant.id,
        )
    return challenge, raw, email_sent


def confirm_code(
    *,
    session: Session,
    tenant_id: int,
    email: str,
    code: str,
) -> tuple[models.CareerEmailChallenge, str] | None:
    """Validate code; issue one-time submit_token. Returns (challenge, raw_token) or None."""
    purge_expired_challenges(session, tenant_id)
    challenge = latest_open_challenge(session, tenant_id, email)
    if not challenge:
        return None
    now = datetime.now(timezone.utc)
    if _aware(challenge.expires_at) and _aware(challenge.expires_at) < now:
        session.delete(challenge)
        session.commit()
        return None
    if hash_secret(code) != challenge.code_hash:
        return None
    raw_token = generate_submit_token()
    token_exp = now + submit_token_max_age()
    challenge.verified_at = now
    challenge.submit_token_hash = hash_secret(raw_token)
    challenge.submit_token_expires_at = token_exp
    challenge.expires_at = token_exp
    challenge.code_hash = ""  # consume code
    session.add(challenge)
    session.commit()
    session.refresh(challenge)
    return challenge, raw_token


def consume_submit_token(
    *,
    session: Session,
    tenant_id: int,
    email: str,
    submit_token: str,
) -> bool:
    """True if token matches a verified challenge for email+tenant; challenge deleted."""
    purge_expired_challenges(session, tenant_id)
    th = hash_secret(submit_token)
    now = datetime.now(timezone.utc)
    challenge = session.exec(
        select(models.CareerEmailChallenge).where(
            models.CareerEmailChallenge.tenant_id == tenant_id,
            models.CareerEmailChallenge.email == email,
            models.CareerEmailChallenge.submit_token_hash == th,
            models.CareerEmailChallenge.verified_at != None,  # noqa: E711
        )
    ).first()
    if not challenge:
        return False
    exp = _aware(challenge.submit_token_expires_at)
    if exp is None or exp < now:
        session.delete(challenge)
        session.commit()
        return False
    session.delete(challenge)
    session.commit()
    return True
