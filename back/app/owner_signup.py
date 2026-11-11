"""
Owner (restaurant) signup email verification with a short-lived 6-digit code (#442).

Separate from end-user Customer verification and from provider/courier registration.
"""

from __future__ import annotations

import hashlib
import logging
import os
import secrets
from datetime import datetime, timedelta, timezone

from sqlmodel import Session, select

from . import email_service as email_svc
from . import models
from .settings import settings

logger = logging.getLogger(__name__)

CODE_DIGITS = 6


def code_max_age() -> timedelta:
    minutes = int(getattr(settings, "owner_signup_verification_expire_minutes", 30) or 30)
    return timedelta(minutes=max(5, minutes))


def hash_code(raw: str) -> str:
    return hashlib.sha256(raw.strip().encode("utf-8")).hexdigest()


def generate_code() -> str:
    fixed = (getattr(settings, "owner_signup_fixed_code", "") or "").strip()
    if fixed and not settings.is_production and len(fixed) == CODE_DIGITS and fixed.isdigit():
        return fixed
    return f"{secrets.randbelow(10**CODE_DIGITS):0{CODE_DIGITS}d}"


def platform_operator_notify_email() -> str:
    """Mailbox for successful owner signup notify - same as /platform login seed."""
    configured = (getattr(settings, "platform_operator_email", "") or "").strip()
    if configured:
        return configured
    return (os.environ.get("PLATFORM_OPERATOR_EMAIL") or "").strip()


def _aware(dt: datetime | None) -> datetime | None:
    if dt is None:
        return None
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt


def code_is_expired(sent_at: datetime | None) -> bool:
    sent = _aware(sent_at)
    if sent is None:
        return True
    return datetime.now(timezone.utc) - sent > code_max_age()


async def issue_and_send_owner_code(
    user: models.User,
    session: Session,
    lang: str,
) -> bool:
    """Generate a 6-digit code, store SHA-256 hash only, email the owner."""
    raw = generate_code()
    user.email_verification_code_hash = hash_code(raw)
    user.email_verification_sent_at = datetime.now(timezone.utc)
    user.email_verified = False
    session.add(user)
    session.commit()
    session.refresh(user)

    if not email_svc.smtp_credentials_configured():
        logger.warning(
            "owner signup verification email skipped: SMTP not configured; user_id=%s",
            user.id,
        )
        return False
    return await email_svc.send_owner_signup_verification_email(
        user.email, raw, lang=lang
    )


async def notify_platform_of_verified_owner(
    *,
    owner_email: str,
    tenant_id: int | None,
    tenant_name: str | None,
    lang: str = "en",
) -> bool:
    to_addr = platform_operator_notify_email()
    if not to_addr:
        logger.warning(
            "platform owner notify skipped: PLATFORM_OPERATOR_EMAIL unset; tenant_id=%s",
            tenant_id,
        )
        return False
    if not email_svc.smtp_credentials_configured():
        logger.warning(
            "platform owner notify skipped: SMTP not configured; tenant_id=%s",
            tenant_id,
        )
        return False
    return await email_svc.send_platform_owner_signup_notify(
        to_addr,
        owner_email=owner_email,
        tenant_id=tenant_id,
        tenant_name=tenant_name or "",
        lang=lang,
    )


def find_unverified_owner_by_email(session: Session, email: str) -> models.User | None:
    user = session.exec(select(models.User).where(models.User.email == email)).first()
    if not user:
        return None
    if user.role != models.UserRole.owner or user.tenant_id is None:
        return None
    if user.email_verified:
        return None
    return user


def tenant_is_soft_deleted(tenant: models.Tenant | None) -> bool:
    return bool(tenant and _aware(getattr(tenant, "soft_deleted_at", None)))


def owner_email_gate_blocks_login(session: Session, user: models.User) -> str | None:
    """
    Return an api_error code if this tenant staff login must be blocked, else None.

    - Soft-deleted tenants: all staff blocked.
    - Unverified owner: that owner blocked.
    - Other staff of a tenant whose owner is still unverified: blocked (spam cannot operate).
    """
    if user.tenant_id is None:
        return None
    tenant = session.get(models.Tenant, user.tenant_id)
    if tenant_is_soft_deleted(tenant):
        return "tenant_soft_deleted"
    if user.role == models.UserRole.owner and not bool(getattr(user, "email_verified", True)):
        return "email_verification_required"
    if user.role != models.UserRole.owner:
        owner = session.exec(
            select(models.User).where(
                models.User.tenant_id == user.tenant_id,
                models.User.role == models.UserRole.owner,
            )
        ).first()
        if owner is not None and not bool(getattr(owner, "email_verified", True)):
            return "email_verification_required"
    return None
