"""Tax-inclusive vs exclusive *display* helpers (#455).

Stored and billed amounts stay tax-inclusive. ``price_display_mode`` only changes
how guest/staff surfaces present unit prices; payable totals remain server-
authoritative (see ``order_payment_service.order_due_cents``).
"""

from __future__ import annotations

from datetime import date
from typing import Any

from sqlmodel import Session

from app import models

PRICE_DISPLAY_INCLUSIVE = "inclusive"
PRICE_DISPLAY_EXCLUSIVE = "exclusive"
_VALID_MODES = frozenset({PRICE_DISPLAY_INCLUSIVE, PRICE_DISPLAY_EXCLUSIVE})


def normalize_price_display_mode(raw: str | None) -> str:
    m = (raw or PRICE_DISPLAY_INCLUSIVE).strip().lower()
    if m not in _VALID_MODES:
        return PRICE_DISPLAY_INCLUSIVE
    return m


def tenant_price_display_mode(tenant: models.Tenant | None) -> str:
    if tenant is None:
        return PRICE_DISPLAY_INCLUSIVE
    return normalize_price_display_mode(getattr(tenant, "price_display_mode", None))


def tax_amount_cents_inclusive(price_cents: int, quantity: int, rate_percent: int) -> int:
    """Tax portion embedded in a tax-inclusive price."""
    if rate_percent <= 0 or quantity <= 0 or price_cents <= 0:
        return 0
    total_incl = int(price_cents) * int(quantity)
    return round(total_incl * rate_percent / (100 + rate_percent))


def net_unit_cents_from_inclusive(price_cents: int, rate_percent: int) -> int:
    """Unit price with VAT removed (display-only when mode is exclusive)."""
    incl = max(0, int(price_cents or 0))
    tax = tax_amount_cents_inclusive(incl, 1, int(rate_percent or 0))
    return max(0, incl - tax)


def display_unit_cents(
    price_cents: int,
    *,
    mode: str,
    tax_rate_percent: int | None,
) -> int:
    """Cents to show for one unit; billed amount remains ``price_cents``."""
    if normalize_price_display_mode(mode) == PRICE_DISPLAY_EXCLUSIVE:
        return net_unit_cents_from_inclusive(price_cents, int(tax_rate_percent or 0))
    return max(0, int(price_cents or 0))


def effective_tax_rate_percent(
    session: Session,
    tenant: models.Tenant | None,
    product_tax_id: int | None,
    *,
    as_of: date | None = None,
) -> int | None:
    """Resolve rate % for display (product override → tenant default)."""
    as_of = as_of or date.today()
    tax_id = product_tax_id
    if not tax_id and tenant and getattr(tenant, "default_tax_id", None):
        tax_id = tenant.default_tax_id
    if not tax_id:
        return None
    tax = session.get(models.Tax, tax_id)
    if not tax:
        return None
    if tenant and tax.tenant_id != tenant.id:
        return None
    if tax.valid_from and tax.valid_from > as_of:
        return None
    if tax.valid_to and tax.valid_to < as_of:
        return None
    return int(tax.rate_percent or 0)


def decorate_menu_product_display(
    product: dict[str, Any],
    *,
    mode: str,
    tax_rate_percent: int | None,
) -> None:
    """Mutate a menu product dict with display fields.

    ``price_cents`` stays the tax-inclusive billed unit price.
    """
    mode_n = normalize_price_display_mode(mode)
    rate = int(tax_rate_percent) if tax_rate_percent is not None else None
    product["price_display_mode"] = mode_n
    if rate is not None:
        product["tax_rate_percent"] = rate
    billed = int(product.get("price_cents") or 0)
    product["display_price_cents"] = display_unit_cents(
        billed, mode=mode_n, tax_rate_percent=rate
    )
    list_cents = product.get("list_price_cents")
    if list_cents is not None:
        product["display_list_price_cents"] = display_unit_cents(
            int(list_cents), mode=mode_n, tax_rate_percent=rate
        )
