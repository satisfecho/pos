"""
Inactive tenant housekeeping (#442).

Policy (human decision on issue #442):
- After 30 days without owner login (or never logged in since tenant create): email a
  7-day removal warning to the owner; set inactivity_warning_sent_at.
- After that warning is 7+ days old and still inactive: soft-delete the tenant
  (soft_deleted_at, hard_delete_after = soft + 60 days). Login is blocked.
- 60 days after soft-delete: hard-delete via delete_tenant_cascade (no legal retention).

Demo tenant id 1 is skipped unless include_demo=True.
"""

from __future__ import annotations

import logging
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any

from sqlmodel import Session, select

from . import email_service as email_svc
from . import models
from .tenant_lifecycle import delete_tenant_cascade, remove_tenant_files

logger = logging.getLogger(__name__)

DEFAULT_INACTIVE_DAYS = 30
DEFAULT_WARNING_GRACE_DAYS = 7
DEFAULT_HARD_DELETE_DAYS_AFTER_SOFT = 60
DEMO_TENANT_ID = 1
_UPLOADS_DIR = Path(__file__).resolve().parent.parent / "uploads"


def _aware(dt: datetime | None) -> datetime | None:
    if dt is None:
        return None
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt


def _now() -> datetime:
    return datetime.now(timezone.utc)


def owner_for_tenant(session: Session, tenant_id: int) -> models.User | None:
    return session.exec(
        select(models.User).where(
            models.User.tenant_id == tenant_id,
            models.User.role == models.UserRole.owner,
        )
    ).first()


def activity_reference(tenant: models.Tenant, owner: models.User | None) -> datetime:
    """Last owner login, else tenant created_at (never logged in)."""
    if owner is not None:
        last = _aware(getattr(owner, "last_login_at", None))
        if last is not None:
            return last
    created = _aware(tenant.created_at) or _now()
    return created


def clear_inactivity_warning_on_login(session: Session, user: models.User) -> None:
    """If an owner logs in after a warning, cancel the removal clock."""
    if user.role != models.UserRole.owner or not user.tenant_id:
        return
    tenant = session.get(models.Tenant, user.tenant_id)
    if not tenant or not tenant.inactivity_warning_sent_at:
        return
    if tenant.soft_deleted_at:
        return
    tenant.inactivity_warning_sent_at = None
    session.add(tenant)
    session.commit()


async def run_inactive_tenant_housekeeping(
    session: Session,
    *,
    dry_run: bool = False,
    now: datetime | None = None,
    inactive_days: int = DEFAULT_INACTIVE_DAYS,
    warning_grace_days: int = DEFAULT_WARNING_GRACE_DAYS,
    hard_delete_days_after_soft: int = DEFAULT_HARD_DELETE_DAYS_AFTER_SOFT,
    include_demo: bool = False,
    send_emails: bool = True,
    tenant_ids: list[int] | None = None,
) -> dict[str, Any]:
    """
    Apply warning / soft-delete / hard-delete passes.

    Returns counts and sample ids for logging / tests.
    Optional tenant_ids limits work to those tenants (tests / one-off ops).
    """
    clock = _aware(now) or _now()
    inactive_cutoff = clock - timedelta(days=inactive_days)
    warning_cutoff = clock - timedelta(days=warning_grace_days)

    warned: list[int] = []
    soft_deleted: list[int] = []
    hard_deleted: list[int] = []
    skipped_demo = 0

    tenants = list(session.exec(select(models.Tenant)).all())
    for tenant in tenants:
        if tenant.id is None:
            continue
        if tenant_ids is not None and tenant.id not in tenant_ids:
            continue
        if tenant.id == DEMO_TENANT_ID and not include_demo:
            skipped_demo += 1
            continue

        # Pass 3: hard delete
        soft_at = _aware(tenant.soft_deleted_at)
        hard_after = _aware(tenant.hard_delete_after)
        if soft_at is not None:
            due = hard_after or (soft_at + timedelta(days=hard_delete_days_after_soft))
            if due <= clock:
                if dry_run:
                    hard_deleted.append(tenant.id)
                    continue
                tid = tenant.id
                tokens = delete_tenant_cascade(session, tid)
                session.commit()
                remove_tenant_files(_UPLOADS_DIR, tid, tokens)
                hard_deleted.append(tid)
            continue

        owner = owner_for_tenant(session, tenant.id)
        ref = activity_reference(tenant, owner)
        still_inactive = ref <= inactive_cutoff

        # Pass 2: soft-delete after warning grace
        warn_at = _aware(tenant.inactivity_warning_sent_at)
        if warn_at is not None and warn_at <= warning_cutoff and still_inactive:
            if dry_run:
                soft_deleted.append(tenant.id)
                continue
            tenant.soft_deleted_at = clock
            tenant.hard_delete_after = clock + timedelta(days=hard_delete_days_after_soft)
            session.add(tenant)
            session.commit()
            soft_deleted.append(tenant.id)
            continue

        # Pass 1: send warning after inactive_days with no prior warning
        if warn_at is None and still_inactive:
            if dry_run:
                warned.append(tenant.id)
                continue
            tenant.inactivity_warning_sent_at = clock
            session.add(tenant)
            session.commit()
            warned.append(tenant.id)
            if send_emails and owner and owner.email:
                lang = (tenant.default_language or "en").strip() or "en"
                if email_svc.smtp_credentials_configured():
                    try:
                        await email_svc.send_inactive_tenant_warning_email(
                            owner.email,
                            tenant_name=tenant.name,
                            grace_days=warning_grace_days,
                            lang=lang,
                        )
                    except Exception:
                        logger.exception(
                            "inactive tenant warning email failed; tenant_id=%s",
                            tenant.id,
                        )
                else:
                    logger.warning(
                        "inactive tenant warning email skipped (no SMTP); tenant_id=%s",
                        tenant.id,
                    )

    return {
        "dry_run": dry_run,
        "now": clock.isoformat(),
        "inactive_days": inactive_days,
        "warning_grace_days": warning_grace_days,
        "hard_delete_days_after_soft": hard_delete_days_after_soft,
        "warned": warned,
        "soft_deleted": soft_deleted,
        "hard_deleted": hard_deleted,
        "warned_count": len(warned),
        "soft_deleted_count": len(soft_deleted),
        "hard_deleted_count": len(hard_deleted),
        "skipped_demo": skipped_demo,
    }
