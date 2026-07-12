"""Restaurant group membership and shared catalog/customer tenant resolution."""

from __future__ import annotations

import secrets

from fastapi import HTTPException
from sqlmodel import Session, select

from app import models


def _generate_join_code() -> str:
    return secrets.token_urlsafe(9)[:12]


def require_owner_or_admin(user: models.User) -> None:
    if user.tenant_id is None or user.role not in (models.UserRole.owner, models.UserRole.admin):
        raise HTTPException(status_code=403, detail="Owner or admin required")


def get_membership(session: Session, tenant_id: int) -> models.RestaurantGroupMember | None:
    return session.exec(
        select(models.RestaurantGroupMember).where(
            models.RestaurantGroupMember.tenant_id == tenant_id
        )
    ).first()


def get_group_for_tenant(session: Session, tenant_id: int) -> models.RestaurantGroup | None:
    membership = get_membership(session, tenant_id)
    if not membership:
        return None
    return session.get(models.RestaurantGroup, membership.group_id)


def sibling_tenant_ids(session: Session, tenant_id: int) -> list[int]:
    """Other tenant ids in the same group (excluding tenant_id)."""
    membership = get_membership(session, tenant_id)
    if not membership:
        return []
    rows = session.exec(
        select(models.RestaurantGroupMember.tenant_id).where(
            models.RestaurantGroupMember.group_id == membership.group_id,
            models.RestaurantGroupMember.tenant_id != tenant_id,
        )
    ).all()
    return list(rows)


def accessible_billing_customer_tenant_ids(session: Session, tenant_id: int) -> list[int]:
    group = get_group_for_tenant(session, tenant_id)
    if group and group.share_customers:
        return [tenant_id, *sibling_tenant_ids(session, tenant_id)]
    return [tenant_id]


def accessible_product_tenant_ids(session: Session, tenant_id: int) -> list[int]:
    group = get_group_for_tenant(session, tenant_id)
    if group and group.share_products:
        return [tenant_id, *sibling_tenant_ids(session, tenant_id)]
    return [tenant_id]


def billing_customer_accessible(
    session: Session, user_tenant_id: int, customer: models.BillingCustomer
) -> bool:
    return customer.tenant_id in accessible_billing_customer_tenant_ids(session, user_tenant_id)


def create_group(
    session: Session, *, tenant_id: int, name: str, share_products: bool, share_customers: bool
) -> models.RestaurantGroup:
    if get_membership(session, tenant_id):
        raise HTTPException(status_code=400, detail="Tenant already belongs to a restaurant group")
    group = models.RestaurantGroup(
        name=name.strip(),
        join_code=_generate_join_code(),
        share_products=share_products,
        share_customers=share_customers,
    )
    session.add(group)
    session.flush()
    session.add(models.RestaurantGroupMember(group_id=group.id, tenant_id=tenant_id))
    session.commit()
    session.refresh(group)
    return group


def join_group(session: Session, *, tenant_id: int, join_code: str) -> models.RestaurantGroup:
    if get_membership(session, tenant_id):
        raise HTTPException(status_code=400, detail="Tenant already belongs to a restaurant group")
    code = join_code.strip()
    if not code:
        raise HTTPException(status_code=400, detail="Join code is required")
    group = session.exec(
        select(models.RestaurantGroup).where(models.RestaurantGroup.join_code == code)
    ).first()
    if not group:
        raise HTTPException(status_code=404, detail="Restaurant group not found")
    session.add(models.RestaurantGroupMember(group_id=group.id, tenant_id=tenant_id))
    session.commit()
    session.refresh(group)
    return group


def leave_group(session: Session, tenant_id: int) -> None:
    membership = get_membership(session, tenant_id)
    if not membership:
        raise HTTPException(status_code=404, detail="Not a member of any restaurant group")
    group_id = membership.group_id
    session.delete(membership)
    session.flush()
    remaining = session.exec(
        select(models.RestaurantGroupMember).where(
            models.RestaurantGroupMember.group_id == group_id
        )
    ).all()
    if not remaining:
        group = session.get(models.RestaurantGroup, group_id)
        if group:
            session.delete(group)
    session.commit()


def group_detail(session: Session, tenant_id: int) -> dict | None:
    group = get_group_for_tenant(session, tenant_id)
    if not group:
        return None
    members = session.exec(
        select(models.RestaurantGroupMember, models.Tenant)
        .join(models.Tenant, models.Tenant.id == models.RestaurantGroupMember.tenant_id)
        .where(models.RestaurantGroupMember.group_id == group.id)
        .order_by(models.Tenant.name.asc())
    ).all()
    return {
        "id": group.id,
        "name": group.name,
        "join_code": group.join_code,
        "share_products": group.share_products,
        "share_customers": group.share_customers,
        "created_at": group.created_at.isoformat(),
        "members": [
            {
                "tenant_id": member.tenant_id,
                "tenant_name": tenant.name,
                "joined_at": member.joined_at.isoformat(),
                "is_current": member.tenant_id == tenant_id,
            }
            for member, tenant in members
        ],
    }
