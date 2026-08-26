"""Helpers for per-product sellable stock alerts (#356)."""

from __future__ import annotations

from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from . import models


def product_stock_alert_payload(product: models.Product | None) -> dict:
    """Public menu fields when stock alert is enabled on a Product row."""
    if product is None or not product.stock_alert_enabled:
        return {}
    return {
        "stock_alert_enabled": True,
        "stock_qty": int(product.stock_qty or 0),
        "stock_alert_level": int(product.stock_alert_level or 0),
    }
