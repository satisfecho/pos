"""Cancel abandoned unpaid public Satisfecho Delivery orders past a TTL.

Public checkout (`notify_kitchen=False`) tags orders with
``PUBLIC_SATISFECHO_DELIVERY_SESSION_ID``. Staff creates are never tagged and
are never cleaned. Kitchen was never notified for these rows, so cancel is
silent (no WS / inventory side effects).
"""

from __future__ import annotations

from datetime import datetime, timedelta, timezone

from sqlmodel import Session, select

from app import models
from app.delivery_order_service import PUBLIC_SATISFECHO_DELIVERY_SESSION_ID

# Past public_order_token lifetime (~1h); within the 1–24h guidance window.
DEFAULT_TTL_HOURS = 2


def cleanup_unpaid_public_delivery_orders(
    session: Session,
    *,
    ttl_hours: float = DEFAULT_TTL_HOURS,
    dry_run: bool = False,
    tenant_id: int | None = None,
    now: datetime | None = None,
) -> dict:
    """
    Soft-cancel public Satisfecho Delivery orders that stayed unpaid past TTL.

    Criteria (all required):
    - order_channel = satisfecho_delivery
    - session_id = public_satisfecho_delivery (public create marker)
    - status = pending
    - payment_method is null, paid_at is null
    - deleted_at is null
    - created_at <= now - ttl_hours

    Returns counts: matched, cancelled, dry_run, ttl_hours, cutoff_iso.
    """
    if ttl_hours <= 0:
        raise ValueError("ttl_hours must be positive")

    clock = now or datetime.now(timezone.utc)
    if clock.tzinfo is None:
        clock = clock.replace(tzinfo=timezone.utc)
    cutoff = clock - timedelta(hours=ttl_hours)

    stmt = select(models.Order).where(
        models.Order.order_channel == models.OrderChannel.satisfecho_delivery,
        models.Order.session_id == PUBLIC_SATISFECHO_DELIVERY_SESSION_ID,
        models.Order.status == models.OrderStatus.pending,
        models.Order.payment_method.is_(None),
        models.Order.paid_at.is_(None),
        models.Order.deleted_at.is_(None),
        models.Order.created_at <= cutoff,
    )
    if tenant_id is not None:
        stmt = stmt.where(models.Order.tenant_id == tenant_id)

    orders = list(session.exec(stmt).all())
    cancelled = 0

    for order in orders:
        if dry_run:
            continue
        items = session.exec(
            select(models.OrderItem).where(models.OrderItem.order_id == order.id)
        ).all()
        order.status = models.OrderStatus.cancelled
        order.cancelled_at = clock
        order.cancelled_by = "ttl_cleanup"
        order.deleted_at = clock
        order.session_id = None
        for item in items:
            if item.status != models.OrderItemStatus.cancelled and not item.removed_by_customer:
                item.status = models.OrderItemStatus.cancelled
                item.removed_by_customer = True
                item.removed_at = clock
                session.add(item)
        session.add(order)
        cancelled += 1

    if not dry_run and cancelled:
        session.flush()

    return {
        "matched": len(orders),
        "cancelled": cancelled if not dry_run else 0,
        "dry_run": dry_run,
        "ttl_hours": ttl_hours,
        "cutoff_iso": cutoff.isoformat(),
    }
