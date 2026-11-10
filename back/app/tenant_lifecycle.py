"""
Tenant data export (GDPR-style bundle) and irreversible tenant purge.

Used by owner-only API routes and optional maintenance scripts (e.g. demo tenant cleanup).
"""

from __future__ import annotations

import json
import logging
import shutil
from datetime import date, datetime, time, timezone
from decimal import Decimal
from enum import Enum
from pathlib import Path
from typing import Any

from sqlalchemy import delete
from sqlmodel import Session, select

from . import inventory_models, models

logger = logging.getLogger(__name__)

TENANT_SECRET_FIELDS = frozenset(
    {
        "stripe_secret_key",
        "revolut_merchant_secret",
        "smtp_password",
    }
)


def _json_safe(value: Any) -> Any:
    if value is None:
        return None
    if isinstance(value, datetime):
        return value.isoformat()
    if isinstance(value, date):
        return value.isoformat()
    if isinstance(value, time):
        return value.isoformat()
    if isinstance(value, Decimal):
        return str(value)
    if isinstance(value, Enum):
        return value.value
    if isinstance(value, dict):
        return {k: _json_safe(v) for k, v in value.items()}
    if isinstance(value, (list, tuple)):
        return [_json_safe(v) for v in value]
    return value


def _model_dump_safe(obj: Any, *, exclude: set[str] | None = None) -> dict[str, Any]:
    exclude = exclude or set()
    data = obj.model_dump()
    out: dict[str, Any] = {}
    for k, v in data.items():
        if k in exclude:
            continue
        out[k] = _json_safe(v)
    return out


def _redact_tenant(tenant: models.Tenant) -> dict[str, Any]:
    d = _model_dump_safe(tenant)
    for f in TENANT_SECRET_FIELDS:
        if d.get(f):
            d[f] = "[REDACTED]"
    return d


def export_tenant_bundle(session: Session, tenant_id: int) -> dict[str, Any]:
    """Build a JSON-serializable snapshot of tenant-scoped data (secrets redacted in tenant row)."""
    tenant = session.get(models.Tenant, tenant_id)
    if not tenant:
        raise ValueError("Tenant not found")

    users = list(
        session.exec(select(models.User).where(models.User.tenant_id == tenant_id)).all()
    )
    user_rows = []
    for u in users:
        row = _model_dump_safe(u, exclude={"hashed_password", "otp_secret"})
        row["has_password"] = bool(u.hashed_password)
        user_rows.append(row)

    taxes = list(session.exec(select(models.Tax).where(models.Tax.tenant_id == tenant_id)).all())
    stations = list(
        session.exec(
            select(models.KitchenStation).where(models.KitchenStation.tenant_id == tenant_id)
        ).all()
    )
    products = list(
        session.exec(select(models.Product).where(models.Product.tenant_id == tenant_id)).all()
    )
    product_ids = [p.id for p in products if p.id is not None]
    questions: list[models.ProductQuestion] = []
    if product_ids:
        questions = list(
            session.exec(
                select(models.ProductQuestion).where(models.ProductQuestion.product_id.in_(product_ids))
            ).all()
        )

    floors = list(session.exec(select(models.Floor).where(models.Floor.tenant_id == tenant_id)).all())
    tables = list(session.exec(select(models.Table).where(models.Table.tenant_id == tenant_id)).all())
    reservations = list(
        session.exec(select(models.Reservation).where(models.Reservation.tenant_id == tenant_id)).all()
    )
    guest_feedback = list(
        session.exec(select(models.GuestFeedback).where(models.GuestFeedback.tenant_id == tenant_id)).all()
    )
    billing_customers = list(
        session.exec(
            select(models.BillingCustomer).where(models.BillingCustomer.tenant_id == tenant_id)
        ).all()
    )
    orders = list(session.exec(select(models.Order).where(models.Order.tenant_id == tenant_id)).all())
    order_ids = [o.id for o in orders if o.id is not None]
    order_items: list[models.OrderItem] = []
    if order_ids:
        order_items = list(
            session.exec(select(models.OrderItem).where(models.OrderItem.order_id.in_(order_ids))).all()
        )

    shifts = list(session.exec(select(models.Shift).where(models.Shift.tenant_id == tenant_id)).all())
    work_sessions = list(
        session.exec(select(models.WorkSession).where(models.WorkSession.tenant_id == tenant_id)).all()
    )

    tenant_products = list(
        session.exec(select(models.TenantProduct).where(models.TenantProduct.tenant_id == tenant_id)).all()
    )

    providers = list(
        session.exec(select(models.Provider).where(models.Provider.tenant_id == tenant_id)).all()
    )
    provider_ids = [p.id for p in providers if p.id is not None]
    provider_products: list[models.ProviderProduct] = []
    if provider_ids:
        provider_products = list(
            session.exec(
                select(models.ProviderProduct).where(models.ProviderProduct.provider_id.in_(provider_ids))
            ).all()
        )

    i18n = list(
        session.exec(select(models.I18nText).where(models.I18nText.tenant_id == tenant_id)).all()
    )

    inv_items = list(
        session.exec(
            select(inventory_models.InventoryItem).where(
                inventory_models.InventoryItem.tenant_id == tenant_id
            )
        ).all()
    )
    inv_batches = list(
        session.exec(
            select(inventory_models.InventoryBatch).where(
                inventory_models.InventoryBatch.tenant_id == tenant_id
            )
        ).all()
    )
    inv_tx = list(
        session.exec(
            select(inventory_models.InventoryTransaction).where(
                inventory_models.InventoryTransaction.tenant_id == tenant_id
            )
        ).all()
    )
    suppliers = list(
        session.exec(
            select(inventory_models.Supplier).where(inventory_models.Supplier.tenant_id == tenant_id)
        ).all()
    )
    purchase_orders = list(
        session.exec(
            select(inventory_models.PurchaseOrder).where(
                inventory_models.PurchaseOrder.tenant_id == tenant_id
            )
        ).all()
    )
    po_ids = [po.id for po in purchase_orders if po.id is not None]
    po_items: list[inventory_models.PurchaseOrderItem] = []
    if po_ids:
        po_items = list(
            session.exec(
                select(inventory_models.PurchaseOrderItem).where(
                    inventory_models.PurchaseOrderItem.purchase_order_id.in_(po_ids)
                )
            ).all()
        )
    recipes = list(
        session.exec(
            select(inventory_models.ProductRecipe).where(
                inventory_models.ProductRecipe.tenant_id == tenant_id
            )
        ).all()
    )

    return {
        "export_version": 1,
        "exported_at": datetime.now(timezone.utc).isoformat(),
        "tenant": _redact_tenant(tenant),
        "users": user_rows,
        "taxes": [_model_dump_safe(t) for t in taxes],
        "kitchen_stations": [_model_dump_safe(s) for s in stations],
        "products": [_model_dump_safe(p) for p in products],
        "product_questions": [_model_dump_safe(q) for q in questions],
        "floors": [_model_dump_safe(f) for f in floors],
        "tables": [_model_dump_safe(t) for t in tables],
        "reservations": [_model_dump_safe(r) for r in reservations],
        "guest_feedback": [_model_dump_safe(g) for g in guest_feedback],
        "billing_customers": [_model_dump_safe(b) for b in billing_customers],
        "orders": [_model_dump_safe(o) for o in orders],
        "order_items": [_model_dump_safe(i) for i in order_items],
        "shifts": [_model_dump_safe(s) for s in shifts],
        "work_sessions": [_model_dump_safe(w) for w in work_sessions],
        "tenant_products": [_model_dump_safe(tp) for tp in tenant_products],
        "providers": [_model_dump_safe(p) for p in providers],
        "provider_products": [_model_dump_safe(pp) for pp in provider_products],
        "i18n_texts": [_model_dump_safe(row) for row in i18n],
        "inventory_items": [_model_dump_safe(x) for x in inv_items],
        "inventory_batches": [_model_dump_safe(x) for x in inv_batches],
        "inventory_transactions": [_model_dump_safe(x) for x in inv_tx],
        "suppliers": [_model_dump_safe(x) for x in suppliers],
        "purchase_orders": [_model_dump_safe(x) for x in purchase_orders],
        "purchase_order_items": [_model_dump_safe(x) for x in po_items],
        "product_recipes": [_model_dump_safe(x) for x in recipes],
    }


def collect_personal_provider_tokens(session: Session, tenant_id: int) -> list[str]:
    rows = session.exec(
        select(models.Provider.token).where(models.Provider.tenant_id == tenant_id)
    ).all()
    return [t for t in rows if t]


def delete_tenant_cascade(session: Session, tenant_id: int) -> list[str]:
    """
    Delete all application data for the tenant (DB rows). Caller should commit the session.

    Returns provider upload tokens (for personal providers) so files can be removed after commit.
    """
    tenant = session.get(models.Tenant, tenant_id)
    if not tenant:
        raise ValueError("Tenant not found")

    provider_tokens = collect_personal_provider_tokens(session, tenant_id)

    # Clear table -> order pointer before deleting orders
    for tbl in session.exec(select(models.Table).where(models.Table.tenant_id == tenant_id)).all():
        tbl.active_order_id = None
        session.add(tbl)
    session.flush()

    # Inventory transactions reference order_id — remove before orders.
    session.exec(
        delete(inventory_models.InventoryTransaction).where(
            inventory_models.InventoryTransaction.tenant_id == tenant_id
        )
    )
    order_ids_subq = select(models.Order.id).where(models.Order.tenant_id == tenant_id)
    session.exec(delete(models.OrderItem).where(models.OrderItem.order_id.in_(order_ids_subq)))
    session.exec(delete(models.Order).where(models.Order.tenant_id == tenant_id))
    session.exec(
        delete(models.DeliveryIntegrationEventLog).where(
            models.DeliveryIntegrationEventLog.tenant_id == tenant_id
        )
    )
    session.exec(
        delete(models.DeliveryCatalogMapping).where(
            models.DeliveryCatalogMapping.tenant_id == tenant_id
        )
    )
    session.exec(
        delete(models.DeliveryMarketplaceIntegration).where(
            models.DeliveryMarketplaceIntegration.tenant_id == tenant_id
        )
    )
    po_ids_subq = select(inventory_models.PurchaseOrder.id).where(
        inventory_models.PurchaseOrder.tenant_id == tenant_id
    )
    session.exec(
        delete(inventory_models.PurchaseOrderItem).where(
            inventory_models.PurchaseOrderItem.purchase_order_id.in_(po_ids_subq)
        )
    )
    session.exec(
        delete(inventory_models.InventoryBatch).where(
            inventory_models.InventoryBatch.tenant_id == tenant_id
        )
    )
    session.exec(
        delete(inventory_models.PurchaseOrder).where(
            inventory_models.PurchaseOrder.tenant_id == tenant_id
        )
    )
    session.exec(
        delete(inventory_models.ProductRecipe).where(
            inventory_models.ProductRecipe.tenant_id == tenant_id
        )
    )
    session.exec(
        delete(inventory_models.InventoryItem).where(
            inventory_models.InventoryItem.tenant_id == tenant_id
        )
    )
    session.exec(
        delete(inventory_models.Supplier).where(inventory_models.Supplier.tenant_id == tenant_id)
    )

    session.exec(delete(models.GuestFeedback).where(models.GuestFeedback.tenant_id == tenant_id))
    session.exec(
        delete(models.LoyaltyLedgerEntry).where(models.LoyaltyLedgerEntry.tenant_id == tenant_id)
    )
    session.exec(
        delete(models.LoyaltyMembership).where(models.LoyaltyMembership.tenant_id == tenant_id)
    )
    session.exec(
        delete(models.LoyaltyProgram).where(models.LoyaltyProgram.tenant_id == tenant_id)
    )
    session.exec(delete(models.Reservation).where(models.Reservation.tenant_id == tenant_id))
    session.exec(delete(models.Shift).where(models.Shift.tenant_id == tenant_id))
    session.exec(delete(models.WorkSession).where(models.WorkSession.tenant_id == tenant_id))
    session.exec(delete(models.BillingCustomer).where(models.BillingCustomer.tenant_id == tenant_id))

    session.exec(delete(models.TenantProduct).where(models.TenantProduct.tenant_id == tenant_id))

    prov_ids_subq = select(models.Provider.id).where(models.Provider.tenant_id == tenant_id)
    session.exec(delete(models.ProviderProduct).where(models.ProviderProduct.provider_id.in_(prov_ids_subq)))
    session.exec(delete(models.Provider).where(models.Provider.tenant_id == tenant_id))

    prod_ids_subq = select(models.Product.id).where(models.Product.tenant_id == tenant_id)
    session.exec(delete(models.ProductQuestion).where(models.ProductQuestion.product_id.in_(prod_ids_subq)))
    session.exec(delete(models.Product).where(models.Product.tenant_id == tenant_id))

    session.exec(delete(models.I18nText).where(models.I18nText.tenant_id == tenant_id))

    user_ids_subq = select(models.User.id).where(models.User.tenant_id == tenant_id)
    session.exec(delete(models.PasswordResetToken).where(models.PasswordResetToken.user_id.in_(user_ids_subq)))
    session.exec(
        delete(models.UserOtpRecoveryCode).where(
            models.UserOtpRecoveryCode.user_id.in_(user_ids_subq)
        )
    )
    session.exec(
        delete(models.LoginEvent).where(
            (models.LoginEvent.tenant_id == tenant_id)
            | (models.LoginEvent.user_id.in_(user_ids_subq))
        )
    )

    for fl in session.exec(select(models.Floor).where(models.Floor.tenant_id == tenant_id)).all():
        fl.default_waiter_id = None
        session.add(fl)
    for tbl in session.exec(select(models.Table).where(models.Table.tenant_id == tenant_id)).all():
        tbl.assigned_waiter_id = None
        session.add(tbl)
    session.flush()

    session.exec(delete(models.Table).where(models.Table.tenant_id == tenant_id))
    session.exec(delete(models.Floor).where(models.Floor.tenant_id == tenant_id))

    session.exec(delete(models.User).where(models.User.tenant_id == tenant_id))

    tenant.default_tax_id = None
    tenant.default_kitchen_station_id = None
    tenant.default_bar_station_id = None
    session.add(tenant)
    session.flush()

    session.exec(delete(models.Tax).where(models.Tax.tenant_id == tenant_id))
    session.exec(delete(models.KitchenStation).where(models.KitchenStation.tenant_id == tenant_id))

    session.delete(tenant)
    session.flush()

    logger.info("Tenant data purged from database (tenant_id=%s)", tenant_id)
    return provider_tokens


def remove_tenant_files(uploads_dir: Path, tenant_id: int, provider_tokens: list[str]) -> None:
    """Remove uploaded files for a tenant and personal provider image dirs (after DB commit)."""
    uploads_dir = uploads_dir.resolve()
    tenant_dir = (uploads_dir / str(tenant_id)).resolve()
    try:
        if tenant_dir.is_dir() and tenant_dir.is_relative_to(uploads_dir):
            shutil.rmtree(tenant_dir, ignore_errors=True)
    except (OSError, ValueError):
        logger.warning("Could not remove tenant upload dir %s", tenant_dir, exc_info=True)

    providers_root = (uploads_dir / "providers").resolve()
    for token in provider_tokens:
        if not token or "/" in token or ".." in token:
            continue
        pdir = (providers_root / token).resolve()
        try:
            if pdir.is_dir() and pdir.is_relative_to(providers_root):
                shutil.rmtree(pdir, ignore_errors=True)
        except (OSError, ValueError):
            logger.warning("Could not remove provider upload dir %s", pdir, exc_info=True)


def bundle_to_json_bytes(bundle: dict[str, Any]) -> bytes:
    return json.dumps(bundle, indent=2, ensure_ascii=False).encode("utf-8")
