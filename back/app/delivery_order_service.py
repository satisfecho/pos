"""Create POS orders from normalized delivery payloads (kitchen pipeline reuse)."""

from __future__ import annotations

from datetime import date, datetime, timezone

from sqlalchemy import select
from sqlmodel import Session

from app import models


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

    if not lines:
        return None, {"status": "error", "detail": "no_lines"}

    order_date = datetime.now(timezone.utc).date()
    resolved_lines: list[tuple[models.Product, int]] = []
    for row in lines:
        pid = int(row["product_id"])
        qty = int(row["quantity"])
        product = session.get(models.Product, pid)
        if not product or product.tenant_id != tenant_id:
            return None, {"status": "error", "detail": f"product_not_found:{pid}"}
        resolved_lines.append((product, max(1, qty)))

    order = models.Order(
        table_id=None,
        tenant_id=tenant_id,
        status=models.OrderStatus.pending,
        session_id=None,
        customer_name=customer_name,
        notes=f"[{provider_label}] marketplace order {external_order_ref}",
        delivery_integration_id=integration.id,
        external_order_ref=external_order_ref,
    )
    session.add(order)
    session.flush()

    for product, qty in resolved_lines:
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
            notes=None,
            status=models.OrderItemStatus.pending,
            tax_id=tax_id,
            tax_rate_percent=tax_rate if effective_tax else None,
            tax_amount_cents=line_tax_cents if effective_tax else None,
        )
        session.add(oi)

    session.commit()
    session.refresh(order)

    try:
        from app.main import publish_order_update

        publish_order_update(
            tenant_id,
            {
                "type": "new_order",
                "order_id": order.id,
                "table_name": "Delivery",
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

    return order, {"status": "created", "order_id": order.id}
