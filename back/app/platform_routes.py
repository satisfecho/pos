"""Platform operator portal — read-only SaaS metrics (tenant count, sign-ups, logins)."""

from datetime import datetime, timedelta, timezone
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func
from sqlmodel import Session, select

from . import models
from .db import get_session
from .security import get_current_user

router = APIRouter()


def _require_platform_operator(
    current_user: Annotated[models.User, Depends(get_current_user)],
) -> models.User:
    if current_user.role != models.UserRole.platform_operator:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Platform operator account required",
        )
    if current_user.tenant_id is not None or current_user.provider_id is not None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Platform operator account required",
        )
    return current_user


@router.get("/me")
def platform_me(
    current_user: Annotated[models.User, Depends(_require_platform_operator)],
) -> dict:
    return {
        "id": current_user.id,
        "email": current_user.email,
        "full_name": current_user.full_name,
        "role": current_user.role.value,
    }


@router.get("/metrics", response_model=models.PlatformMetricsResponse)
def platform_metrics(
    current_user: Annotated[models.User, Depends(_require_platform_operator)],
    session: Session = Depends(get_session),
) -> models.PlatformMetricsResponse:
    now = datetime.now(timezone.utc)
    since_30d = now - timedelta(days=30)
    since_24h = now - timedelta(hours=24)
    since_7d = now - timedelta(days=7)

    tenant_count = session.exec(select(func.count()).select_from(models.Tenant)).one()
    signups_last_30_days = session.exec(
        select(func.count())
        .select_from(models.Tenant)
        .where(models.Tenant.created_at >= since_30d)
    ).one()

    recent_tenants = session.exec(
        select(models.Tenant)
        .order_by(models.Tenant.created_at.desc())  # type: ignore[arg-type]
        .limit(10)
    ).all()

    logins_last_24_hours = session.exec(
        select(func.count())
        .select_from(models.LoginEvent)
        .where(models.LoginEvent.logged_in_at >= since_24h)
    ).one()
    logins_last_7_days = session.exec(
        select(func.count())
        .select_from(models.LoginEvent)
        .where(models.LoginEvent.logged_in_at >= since_7d)
    ).one()

    recent_login_rows = session.exec(
        select(models.LoginEvent)
        .order_by(models.LoginEvent.logged_in_at.desc())  # type: ignore[arg-type]
        .limit(20)
    ).all()

    return models.PlatformMetricsResponse(
        tenant_count=int(tenant_count or 0),
        signups_last_30_days=int(signups_last_30_days or 0),
        logins_last_24_hours=int(logins_last_24_hours or 0),
        logins_last_7_days=int(logins_last_7_days or 0),
        recent_tenants=[
            models.PlatformTenantSummary(
                id=t.id,  # type: ignore[arg-type]
                name=t.name,
                created_at=t.created_at,
            )
            for t in recent_tenants
            if t.id is not None
        ],
        recent_logins=[
            models.PlatformLoginSummary(
                logged_in_at=row.logged_in_at,
                role=row.role.value if row.role else None,
                tenant_id=row.tenant_id,
                login_scope=row.login_scope,
            )
            for row in recent_login_rows
        ],
    )
