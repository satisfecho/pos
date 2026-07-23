"""Create POS orders from delivery payloads (marketplace + Satisfecho Delivery)."""

from __future__ import annotations

import json
import math
import re
from datetime import date, datetime, timezone

from sqlalchemy import select
from sqlmodel import Session

from app import models
from app.order_notes import normalize_order_note

# Marks guest checkout creates (notify_kitchen=False) for TTL unpaid cleanup.
PUBLIC_SATISFECHO_DELIVERY_SESSION_ID = "public_satisfecho_delivery"


def normalize_postal_code(raw: str | None) -> str:
    """Uppercase alphanumeric postal code (strip spaces and hyphens)."""
    if not raw or not isinstance(raw, str):
        return ""
    return re.sub(r"[\s\-]", "", raw.strip()).upper()


def parse_delivery_postal_codes(raw: str | None) -> list[str]:
    """Parse tenant.delivery_postal_codes JSON array into normalized codes."""
    if not raw or not isinstance(raw, str) or not raw.strip():
        return []
    try:
        data = json.loads(raw)
    except json.JSONDecodeError:
        return []
    if not isinstance(data, list):
        return []
    out: list[str] = []
    seen: set[str] = set()
    for item in data:
        code = normalize_postal_code(str(item) if item is not None else "")
        if code and code not in seen:
            seen.add(code)
            out.append(code)
    return out


def serialize_delivery_postal_codes(codes: list[str] | None) -> str | None:
    if not codes:
        return None
    normalized = parse_delivery_postal_codes(json.dumps(codes))
    return json.dumps(normalized) if normalized else None


def haversine_meters(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Great-circle distance in meters."""
    r = 6371000.0
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlmb = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dlmb / 2) ** 2
    return 2 * r * math.asin(min(1.0, math.sqrt(a)))


def validate_delivery_coverage(
    tenant: models.Tenant,
    *,
    postal_code: str | None = None,
    delivery_latitude: float | None = None,
    delivery_longitude: float | None = None,
) -> str | None:
    """
    Return an error detail string if address is outside configured coverage, else None.
    Postal-code list and/or radius (when restaurant lat/lng set) are enforced when configured.
    """
    allowed = parse_delivery_postal_codes(getattr(tenant, "delivery_postal_codes", None))
    if allowed:
        code = normalize_postal_code(postal_code)
        if not code:
            return "postal_code_required"
        if code not in allowed:
            return "outside_delivery_zone"

    radius = getattr(tenant, "delivery_radius_meters", None)
    if radius is not None and int(radius) > 0:
        t_lat = getattr(tenant, "latitude", None)
        t_lon = getattr(tenant, "longitude", None)
        if t_lat is None or t_lon is None:
            # Radius configured but restaurant has no center — skip radius check.
            return None
        if delivery_latitude is None or delivery_longitude is None:
            return "delivery_location_required"
        try:
            dist = haversine_meters(
                float(t_lat),
                float(t_lon),
                float(delivery_latitude),
                float(delivery_longitude),
            )
        except (TypeError, ValueError):
            return "delivery_location_invalid"
        if dist > float(int(radius)):
            return "outside_delivery_radius"
    return None


def tenant_delivery_fee_cents(tenant: models.Tenant | None) -> int:
    if tenant is None:
        return 0
    fee = getattr(tenant, "delivery_fee_cents", 0) or 0
    return max(0, int(fee))


def order_delivery_fee_cents(order: models.Order | None) -> int:
    if order is None:
        return 0
    fee = getattr(order, "delivery_fee_cents", 0) or 0
    return max(0, int(fee))


def customer_delivery_track_status(
    order: models.Order,
    items: list[models.OrderItem],
) -> str:
    """
    Coarse guest-facing status for track page:
    awaiting_payment | received | preparing | out_for_delivery | delivered | cancelled
    """
    status_val = (
        order.status.value if hasattr(order.status, "value") else str(order.status)
    )
    if status_val == models.OrderStatus.cancelled.value:
        return "cancelled"
    if status_val == models.OrderStatus.completed.value:
        return "delivered"
    if status_val == models.OrderStatus.out_for_delivery.value:
        return "out_for_delivery"

    active = [
        i
        for i in items
        if (
            i.status.value
            if hasattr(i.status, "value")
            else str(i.status)
        )
        != models.OrderItemStatus.cancelled.value
    ]
    if active and all(
        (
            i.status.value
            if hasattr(i.status, "value")
            else str(i.status)
        )
        == models.OrderItemStatus.delivered.value
        for i in active
    ):
        return "delivered"

    unpaid = order.paid_at is None and status_val == models.OrderStatus.pending.value
    if unpaid:
        return "awaiting_payment"

    item_statuses = {
        (i.status.value if hasattr(i.status, "value") else str(i.status)) for i in active
    }
    if item_statuses & {
        models.OrderItemStatus.preparing.value,
        models.OrderItemStatus.ready.value,
    }:
        return "preparing"
    return "received"


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


def _product_from_tenant_product(
    session: Session,
    *,
    tenant_id: int,
    tp: models.TenantProduct,
) -> models.Product | None:
    """Map a tenant menu row to Product (create+link if catalog-only)."""
    if tp.product_id is not None:
        product = session.get(models.Product, tp.product_id)
        if product is not None and product.tenant_id == tenant_id:
            return product
        return None

    price_cents = tp.price_cents
    if price_cents is None and tp.provider_product_id:
        pp = session.get(models.ProviderProduct, tp.provider_product_id)
        if pp is not None and pp.price_cents is not None:
            price_cents = pp.price_cents
    if price_cents is None:
        return None

    product = models.Product(
        name=tp.name,
        price_cents=price_cents,
        cost_cents=getattr(tp, "cost_cents", None),
        tenant_id=tenant_id,
        tax_id=getattr(tp, "tax_id", None),
    )
    session.add(product)
    session.flush()
    tp.product_id = product.id
    if tp.price_cents is None:
        tp.price_cents = price_cents
    session.add(tp)
    return product


def _resolve_product_lines(
    session: Session,
    *,
    tenant_id: int,
    lines: list[dict],
) -> tuple[list[tuple[models.Product, int, str | None]] | None, dict | None]:
    """lines: [{"product_id": int, "quantity": int, "notes": str|None}].

    ``product_id`` may be a public-menu ``TenantProduct.id`` or a legacy ``Product.id``.
    """
    if not lines:
        return None, {"status": "error", "detail": "no_lines"}
    resolved: list[tuple[models.Product, int, str | None]] = []
    for row in lines:
        pid = int(row["product_id"])
        qty = int(row["quantity"])
        product: models.Product | None = None

        # Public menu / cart sends TenantProduct.id (same as guest table orders).
        tp = session.get(models.TenantProduct, pid)
        if tp is not None and tp.tenant_id == tenant_id:
            product = _product_from_tenant_product(session, tenant_id=tenant_id, tp=tp)
            if product is None:
                return None, {"status": "error", "detail": f"product_not_found:{pid}"}
        else:
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
    delivery_fee_cents: int | None = None,
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

    tenant = session.get(models.Tenant, tenant_id)
    fee = (
        max(0, int(delivery_fee_cents))
        if delivery_fee_cents is not None
        else tenant_delivery_fee_cents(tenant)
    )

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
        delivery_fee_cents=fee,
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
