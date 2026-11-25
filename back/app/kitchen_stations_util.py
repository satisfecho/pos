"""Resolve KDS prep station and route for order lines (kitchen vs bar display)."""

from __future__ import annotations

from . import models


# KDS route for ready-made / no-prep lines (#454). Kitchen and bar displays hide these.
KDS_ROUTE_NONE = "none"


def product_skips_kitchen(product: models.Product | None) -> bool:
    """True when the product is marked ready-made and must not appear on KDS."""
    return bool(product and getattr(product, "skip_kitchen", False))


def initial_order_item_status(product: models.Product | None) -> models.OrderItemStatus:
    """Ready-made lines start as ready (no prep); others stay pending."""
    if product_skips_kitchen(product):
        return models.OrderItemStatus.ready
    return models.OrderItemStatus.pending


def resolve_order_item_kds(
    product: models.Product | None,
    tenant: models.Tenant,
    station_by_id: dict[int, models.KitchenStation],
) -> tuple[int | None, str | None, str]:
    """
    Returns (kitchen_station_id, kitchen_station_name, kitchen_station_route).
    kitchen_station_route is 'kitchen', 'bar', or 'none' (skip KDS / ready-made).
    """
    if product_skips_kitchen(product):
        return None, None, KDS_ROUTE_NONE
    if product and product.kitchen_station_id:
        st = station_by_id.get(product.kitchen_station_id)
        if st:
            return st.id, st.name, st.display_route or "kitchen"
    is_beverages = bool(product and (product.category or "") == "Beverages")
    if is_beverages:
        did = tenant.default_bar_station_id
        if did and did in station_by_id:
            st = station_by_id[did]
            return st.id, st.name, st.display_route or "bar"
        return None, None, "bar"
    kid = tenant.default_kitchen_station_id
    if kid and kid in station_by_id:
        st = station_by_id[kid]
        return st.id, st.name, st.display_route or "kitchen"
    return None, None, "kitchen"


def validate_kitchen_station_belongs(
    session,
    station_id: int,
    tenant_id: int,
) -> models.KitchenStation:
    st = session.get(models.KitchenStation, station_id)
    if not st or st.tenant_id != tenant_id:
        raise ValueError("Invalid kitchen station")
    return st


def normalize_display_route(value: str) -> str:
    v = (value or "kitchen").strip().lower()
    if v not in ("kitchen", "bar"):
        raise ValueError("display_route must be 'kitchen' or 'bar'")
    return v
