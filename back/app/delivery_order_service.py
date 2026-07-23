"""Create POS orders from delivery payloads (marketplace + Satisfecho Delivery)."""

from __future__ import annotations

from datetime import date, datetime, timezone

from sqlalchemy import select
from sqlmodel import Session

from app import models
from app.order_notes import normalize_order_note

# Marks guest checkout creates (notify_kitchen=False) for TTL unpaid cleanup.
PUBLIC_SATISFECHO_DELIVERY_SESSION_ID = "public_satisfecho_delivery"


def _tax_amount_cents_inclusive(price_cents: int, quantity: int, rate_percent: int) -> int:
    if rate_percent <= 0:
        return 0
    total_incl = price_cents * quantity
    return round(total_incl * rate_percent / (100 + rate_percent))


def _effective_tax(
    session: Session,
    tenant_id: int,
    product_tax_id: int | None,
    as_of: date | None = None,
) -> models.Tax | None:
    as_of = as_of or date.today()
    tax_id = product_tax_id
    if not tax_id:
        tenant = session.get(models.Tenant, tenant_id)
        if tenant and getattr(tenant, "default_tax_id", None):
            tax_id = tenant.default_tax_id
    if not tax_id:
        return None
    tax = session.get(models.Tax, tax_id)
    if not tax or tax.tenant_id != tenant_id:
        return None
    if tax.valid_from and as_of < tax.valid_from:
        return None
    if tax.valid_to is not None and as_of > tax.valid_to:
        return None
    return tax


def _resolve_product_lines(
    session: Session,
    *,
    tenant_id: int,
    lines: list[dict],
) -> tuple[list[tuple[models.Product, int, str | None]] | None, dict | None]:
    """lines: [{"product_id": int, "quantity": int, "notes": str|None}]."""
    if not lines:
        return None, {"status": "error", "detail": "no_lines"}
    resolved: list[tuple[models.Product, int, str | None]] = []
    for row in lines:
        pid = int(row["product_id"])
        qty = int(row["quantity"])
        product = session.get(models.Product, pid)
        if not product or product.tenant_id != tenant_id:
            return None, {"status": "error", "detail": f"product_not_found:{pid}"}
        notes = normalize_order_note(row.get("notes"))
        resolved.append((product, max(1, qty), notes))
    return resolved, None


def _add_order_items(
    session: Session,
    *,
    order: models.Order,
    tenant_id: int,
    resolved_lines: list[tuple[models.Product, int, str | None]],
    order_date: date,
) -> None:
    for product, qty, notes in resolved_lines:
        product_tax_id = getattr(product, "tax_id", None)
        effective_tax = _effective_tax(session, tenant_id, product_tax_id, order_date)
        tax_id = effective_tax.id if effective_tax else None
        tax_rate = effective_tax.rate_percent if effective_tax else 0
        price_cents = product.price_cents or 0
        line_tax_cents = (
            _tax_amount_cents_inclusive(price_cents, qty, tax_rate) if effective_tax else 0
        )
        oi = models.OrderItem(
            order_id=order.id,
            product_id=product.id,
            product_name=product.name,
            quantity=qty,
            price_cents=price_cents,
            cost_cents=getattr(product, "cost_cents", None),
            notes=notes,
            status=models.OrderItemStatus.pending,
            tax_id=tax_id,
            tax_rate_percent=tax_rate if effective_tax else None,
            tax_amount_cents=line_tax_cents if effective_tax else None,
        )
        session.add(oi)


def _publish_and_deduct(session: Session, order: models.Order, tenant_id: int, table_name: str) -> None:
    try:
        from app.main import publish_order_update

        publish_order_update(
            tenant_id,
            {
                "type": "new_order",
                "order_id": order.id,
                "table_name": table_name,
                "status": order.status.value,
                "created_at": order.created_at.isoformat() if order.created_at else "",
            },
            table_id=None,
        )
    except Exception:
        pass

    try:
        tenant = session.get(models.Tenant, tenant_id)
        if tenant and getattr(tenant, "inventory_tracking_enabled", False):
            from app.inventory_service import deduct_inventory_for_order

            deduct_inventory_for_order(session, order, tenant)
            session.commit()
    except Exception:
        pass


def create_order_from_delivery_payload(
    session: Session,
    *,
    tenant_id: int,
    integration: models.DeliveryMarketplaceIntegration,
    external_order_ref: str,
    lines: list[dict],
    customer_name: str | None,
    provider_label: str,
) -> tuple[models.Order | None, dict]:
    """
    lines: [{"product_id": int, "quantity": int}] after mapping.
    Returns (order, {"created"|"duplicate"|"error", ...}).
    """
    existing = session.exec(
        select(models.Order).where(
            models.Order.tenant_id == tenant_id,
            models.Order.delivery_integration_id == integration.id,
            models.Order.external_order_ref == external_order_ref,
            models.Order.deleted_at.is_(None),
        )
    ).first()
    if existing:
        return existing, {"status": "duplicate", "order_id": existing.id}

    resolved_lines, err = _resolve_product_lines(session, tenant_id=tenant_id, lines=lines)
    if err:
        return None, err
    assert resolved_lines is not None

    order_date = datetime.now(timezone.utc).date()
    order = models.Order(
        table_id=None,
        tenant_id=tenant_id,
        status=models.OrderStatus.pending,
        session_id=None,
        customer_name=customer_name,
        notes=f"[{provider_label}] marketplace order {external_order_ref}",
        delivery_integration_id=integration.id,
        external_order_ref=external_order_ref,
        order_channel=models.OrderChannel.marketplace,
    )
    session.add(order)
    session.flush()
    _add_order_items(
        session,
        order=order,
        tenant_id=tenant_id,
        resolved_lines=resolved_lines,
        order_date=order_date,
    )
    session.commit()
    session.refresh(order)
    _publish_and_deduct(session, order, tenant_id, "Delivery")
    return order, {"status": "created", "order_id": order.id}


def create_satisfecho_delivery_order(
    session: Session,
    *,
    tenant_id: int,
    lines: list[dict],
    delivery_address: str,
    customer_phone: str | None = None,
    customer_name: str | None = None,
    notes: str | None = None,
    courier_user_id: int | None = None,
    notify_kitchen: bool = True,
) -> tuple[models.Order | None, dict]:
    """
    Create a first-party Satisfecho Delivery order (no marketplace integration, no table).
    lines: [{"product_id": int, "quantity": int, "notes": str|None}].

    When notify_kitchen is False (public checkout before pay), skip WS publish and
    inventory deduct until payment confirmation calls publish_satisfecho_delivery_order.
    """
    address = (delivery_address or "").strip()
    if not address:
        return None, {"status": "error", "detail": "delivery_address_required"}

    if courier_user_id is not None:
        courier = session.get(models.User, courier_user_id)
        if (
            not courier
            or courier.tenant_id != tenant_id
            or courier.role != models.UserRole.courier
        ):
            return None, {"status": "error", "detail": "invalid_courier_user"}

    resolved_lines, err = _resolve_product_lines(session, tenant_id=tenant_id, lines=lines)
    if err:
        return None, err
    assert resolved_lines is not None

    order_date = datetime.now(timezone.utc).date()
    order = models.Order(
        table_id=None,
        tenant_id=tenant_id,
        status=models.OrderStatus.pending,
        session_id=(
            PUBLIC_SATISFECHO_DELIVERY_SESSION_ID if not notify_kitchen else None
        ),
        customer_name=(customer_name or "").strip() or None,
        notes=normalize_order_note(notes),
        order_channel=models.OrderChannel.satisfecho_delivery,
        delivery_address=address,
        customer_phone=customer_phone,
        courier_user_id=courier_user_id,
    )
    session.add(order)
    session.flush()
    _add_order_items(
        session,
        order=order,
        tenant_id=tenant_id,
        resolved_lines=resolved_lines,
        order_date=order_date,
    )
    session.commit()
    session.refresh(order)
    if notify_kitchen:
        _publish_and_deduct(session, order, tenant_id, "Satisfecho Delivery")
    return order, {"status": "created", "order_id": order.id}


def publish_satisfecho_delivery_order(session: Session, order: models.Order) -> None:
    """Notify kitchen/staff and deduct inventory for a Satisfecho Delivery order (e.g. after pay)."""
    if not order or order.tenant_id is None:
        return
    _publish_and_deduct(session, order, order.tenant_id, "Satisfecho Delivery")
