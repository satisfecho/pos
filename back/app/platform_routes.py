"""Platform operator portal — SaaS metrics and tenant oversight for platform admins."""

from datetime import datetime, timedelta, timezone
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func
from sqlmodel import Session, select

from . import models
from .db import get_session
from .security import get_current_user

router = APIRouter()

_TENANT_LIST_LIMIT = 100


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


def _count_for_tenant(session: Session, model: type, tenant_id: int) -> int:
    value = session.exec(
        select(func.count()).select_from(model).where(model.tenant_id == tenant_id)  # type: ignore[arg-type]
    ).one()
    return int(value or 0)


def _owner_for_tenant(session: Session, tenant_id: int) -> models.User | None:
    return session.exec(
        select(models.User)
        .where(
            models.User.tenant_id == tenant_id,
            models.User.role == models.UserRole.owner,
        )
        .order_by(models.User.id)  # type: ignore[arg-type]
        .limit(1)
    ).first()


def _tenant_summary(session: Session, tenant: models.Tenant) -> models.PlatformTenantSummary:
    tenant_id = tenant.id
    if tenant_id is None:
        raise ValueError("Tenant id is required")

    owner = _owner_for_tenant(session, tenant_id)

    return models.PlatformTenantSummary(
        id=tenant_id,
        name=tenant.name,
        created_at=tenant.created_at,
        owner_email=owner.email if owner else None,
        owner_name=owner.full_name if owner else None,
        tenant_email=tenant.email,
        tenant_phone=tenant.phone,
        product_count=_count_for_tenant(session, models.Product, tenant_id),
        table_count=_count_for_tenant(session, models.Table, tenant_id),
        user_count=_count_for_tenant(session, models.User, tenant_id),
        order_count=_count_for_tenant(session, models.Order, tenant_id),
        reservation_count=_count_for_tenant(session, models.Reservation, tenant_id),
    )


def _tenant_detail(session: Session, tenant: models.Tenant) -> models.PlatformTenantDetail:
    tenant_id = tenant.id
    if tenant_id is None:
        raise ValueError("Tenant id is required")

    summary = _tenant_summary(session, tenant)
    staff_rows = session.exec(
        select(models.User)
        .where(models.User.tenant_id == tenant_id)
        .order_by(models.User.role, models.User.email)  # type: ignore[arg-type]
    ).all()

    return models.PlatformTenantDetail(
        **summary.model_dump(),
        business_type=(
            tenant.business_type.value if tenant.business_type is not None else None
        ),
        description=tenant.description,
        address=tenant.address,
        website=tenant.website,
        staff_users=[
            models.PlatformStaffContact(
                email=u.email,
                full_name=u.full_name,
                role=u.role.value,
            )
            for u in staff_rows
        ],
    )


def _login_summary(
    session: Session, row: models.LoginEvent
) -> models.PlatformLoginSummary:
    user_email: str | None = None
    if row.user_id is not None:
        user = session.get(models.User, row.user_id)
        if user:
            user_email = user.email

    tenant_name: str | None = None
    if row.tenant_id is not None:
        tenant = session.get(models.Tenant, row.tenant_id)
        if tenant:
            tenant_name = tenant.name

    return models.PlatformLoginSummary(
        logged_in_at=row.logged_in_at,
        role=row.role.value if row.role else None,
        tenant_id=row.tenant_id,
        tenant_name=tenant_name,
        login_scope=row.login_scope,
        user_email=user_email,
    )


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


@router.get("/tenants", response_model=list[models.PlatformTenantSummary])
def platform_tenants(
    current_user: Annotated[models.User, Depends(_require_platform_operator)],
    session: Session = Depends(get_session),
) -> list[models.PlatformTenantSummary]:
    tenants = session.exec(
        select(models.Tenant)
        .order_by(models.Tenant.created_at.desc())  # type: ignore[arg-type]
        .limit(_TENANT_LIST_LIMIT)
    ).all()
    return [_tenant_summary(session, t) for t in tenants if t.id is not None]


@router.get("/tenants/{tenant_id}", response_model=models.PlatformTenantDetail)
def platform_tenant_detail(
    tenant_id: int,
    current_user: Annotated[models.User, Depends(_require_platform_operator)],
    session: Session = Depends(get_session),
) -> models.PlatformTenantDetail:
    tenant = session.get(models.Tenant, tenant_id)
    if tenant is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tenant not found")
    return _tenant_detail(session, tenant)


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
            _tenant_summary(session, t) for t in recent_tenants if t.id is not None
        ],
        recent_logins=[_login_summary(session, row) for row in recent_login_rows],
    )
