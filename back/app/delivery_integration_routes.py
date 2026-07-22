"""Admin API + public webhook ingest for delivery marketplace integrations."""

from __future__ import annotations

import secrets
from datetime import datetime, timezone
from typing import Annotated, Any

from fastapi import APIRouter, Body, Depends, HTTPException, Query, Request, Response
from pydantic import BaseModel
from sqlalchemy import delete, desc
from sqlmodel import Session, select

from app import models
from app.db import get_session
from app.delivery_adapters import PROVIDER_REGISTRY, get_adapter
from app.delivery_credentials import decrypt_credentials_json, encrypt_credentials_json
from app.delivery_order_service import create_order_from_delivery_payload
from app.permissions import Permission, require_permission
from app.rate_limits import public_menu_ip_limit

router = APIRouter()
public_router = APIRouter()


DELIVERY_PROVIDER_CATALOG: list[dict[str, str]] = [
    {"provider_key": "uber_eats", "display_name": "Uber Eats"},
    {"provider_key": "glovo", "display_name": "Glovo"},
    {"provider_key": "deliveroo", "display_name": "Deliveroo"},
]


class DeliveryIntegrationPublic(BaseModel):
    id: int
    tenant_id: int
    provider_key: str
    display_name: str
    connection_status: str
    enabled: bool
    external_store_id: str | None
    credentials_configured: bool
    webhook_url_hint: str
    webhook_ingest_token: str
    last_test_at: str | None = None
    last_test_ok: bool | None = None
    updated_at: str


def _display_name(provider_key: str) -> str:
    for row in DELIVERY_PROVIDER_CATALOG:
        if row["provider_key"] == provider_key:
            return row["display_name"]
    return provider_key


def _serialize_integration(row: models.DeliveryMarketplaceIntegration, request: Request) -> DeliveryIntegrationPublic:
    creds_set = bool((row.credentials_encrypted or "").strip())
    root = str(request.base_url).rstrip("/")
    hint = f"{root}/public/webhooks/delivery/{row.webhook_ingest_token}"
    return DeliveryIntegrationPublic(
        id=int(row.id or 0),
        tenant_id=row.tenant_id,
        provider_key=row.provider_key,
        display_name=_display_name(row.provider_key),
        connection_status=row.connection_status,
        enabled=bool(row.enabled),
        external_store_id=row.external_store_id,
        credentials_configured=creds_set,
        webhook_url_hint=hint,
        webhook_ingest_token=row.webhook_ingest_token,
        last_test_at=row.last_test_at.isoformat() if row.last_test_at else None,
        last_test_ok=row.last_test_ok,
        updated_at=row.updated_at.isoformat() if row.updated_at else "",
    )


@router.get("/delivery-integrations/catalog", response_model=list[dict])
def catalog_delivery_providers(
    current_user: Annotated[models.User, Depends(require_permission(Permission.SETTINGS_READ))],
):
    """Static provider metadata for the Integrations UI."""
    _ = current_user
    keys = [{**row, "configured": False} for row in DELIVERY_PROVIDER_CATALOG]
    stub = {"provider_key": "stub", "display_name": "Sandbox stub", "configured": False}
    return keys + [stub]


@router.get("/delivery-integrations", response_model=list[DeliveryIntegrationPublic])
def list_delivery_integrations(
    request: Request,
    current_user: Annotated[models.User, Depends(require_permission(Permission.SETTINGS_READ))],
    session: Session = Depends(get_session),
):
    rows = session.exec(
        select(models.DeliveryMarketplaceIntegration).where(
            models.DeliveryMarketplaceIntegration.tenant_id == current_user.tenant_id
        )
    ).all()
    return [_serialize_integration(r, request) for r in rows]


@router.put("/delivery-integrations", response_model=DeliveryIntegrationPublic)
def upsert_delivery_integration(
    request: Request,
    body: models.DeliveryIntegrationUpsert,
    current_user: Annotated[models.User, Depends(require_permission(Permission.SETTINGS_UPDATE))],
    session: Session = Depends(get_session),
):
    pk = (body.provider_key or "").strip().lower()
    if pk not in PROVIDER_REGISTRY:
        raise HTTPException(status_code=400, detail="Unknown provider_key")

    row = session.exec(
        select(models.DeliveryMarketplaceIntegration).where(
            models.DeliveryMarketplaceIntegration.tenant_id == current_user.tenant_id,
            models.DeliveryMarketplaceIntegration.provider_key == pk,
        )
    ).first()

    now = datetime.now(timezone.utc)
    if row is None:
        row = models.DeliveryMarketplaceIntegration(
            tenant_id=current_user.tenant_id,
            provider_key=pk,
            connection_status="disconnected",
            webhook_ingest_token=secrets.token_urlsafe(48)[:64],
            enabled=body.enabled,
            external_store_id=body.external_store_id,
            updated_at=now,
        )
        if body.credentials is not None:
            row.credentials_encrypted = encrypt_credentials_json(body.credentials)
        session.add(row)
        session.commit()
        session.refresh(row)
    else:
        row.enabled = body.enabled
        if body.external_store_id is not None:
            row.external_store_id = body.external_store_id
        if body.credentials is not None:
            row.credentials_encrypted = encrypt_credentials_json(body.credentials)
        row.updated_at = now
        session.add(row)
        session.commit()
        session.refresh(row)

    return _serialize_integration(row, request)


@router.post("/delivery-integrations/{integration_id}/test")
def test_delivery_integration(
    integration_id: int,
    current_user: Annotated[models.User, Depends(require_permission(Permission.SETTINGS_UPDATE))],
    session: Session = Depends(get_session),
):
    row = session.exec(
        select(models.DeliveryMarketplaceIntegration).where(
            models.DeliveryMarketplaceIntegration.id == integration_id,
            models.DeliveryMarketplaceIntegration.tenant_id == current_user.tenant_id,
        )
    ).first()
    if not row:
        raise HTTPException(status_code=404, detail="Integration not found")

    try:
        adapter = get_adapter(row.provider_key)
    except KeyError:
        raise HTTPException(status_code=400, detail="Adapter not registered")

    ok, msg = adapter.test_connection(session, row)
    row.last_test_at = datetime.now(timezone.utc)
    row.last_test_ok = ok
    row.connection_status = "connected" if ok else "error"
    session.add(row)
    session.commit()

    log = models.DeliveryIntegrationEventLog(
        tenant_id=current_user.tenant_id,
        integration_id=row.id,
        provider_key=row.provider_key,
        event_type="test_connection",
        summary="test_connection",
        detail={"ok": ok, "message": msg},
        success=ok,
        error_message=None if ok else msg,
    )
    session.add(log)
    session.commit()

    return {"ok": ok, "message": msg}


class DeliveryMappingsPut(BaseModel):
    mappings: list[models.DeliveryCatalogMappingWrite]


@router.get("/delivery-integrations/{integration_id}/mappings")
def list_delivery_mappings(
    integration_id: int,
    current_user: Annotated[models.User, Depends(require_permission(Permission.SETTINGS_READ))],
    session: Session = Depends(get_session),
):
    row = session.exec(
        select(models.DeliveryMarketplaceIntegration).where(
            models.DeliveryMarketplaceIntegration.id == integration_id,
            models.DeliveryMarketplaceIntegration.tenant_id == current_user.tenant_id,
        )
    ).first()
    if not row:
        raise HTTPException(status_code=404, detail="Integration not found")

    maps = session.exec(
        select(models.DeliveryCatalogMapping).where(
            models.DeliveryCatalogMapping.integration_id == integration_id,
            models.DeliveryCatalogMapping.tenant_id == current_user.tenant_id,
        )
    ).all()
    return [
        {
            "id": m.id,
            "external_item_id": m.external_item_id,
            "product_id": m.product_id,
            "notes": m.notes,
        }
        for m in maps
    ]


@router.put("/delivery-integrations/{integration_id}/mappings")
def replace_delivery_mappings(
    integration_id: int,
    body: DeliveryMappingsPut,
    current_user: Annotated[models.User, Depends(require_permission(Permission.SETTINGS_UPDATE))],
    session: Session = Depends(get_session),
):
    row = session.exec(
        select(models.DeliveryMarketplaceIntegration).where(
            models.DeliveryMarketplaceIntegration.id == integration_id,
            models.DeliveryMarketplaceIntegration.tenant_id == current_user.tenant_id,
        )
    ).first()
    if not row:
        raise HTTPException(status_code=404, detail="Integration not found")

    session.exec(
        delete(models.DeliveryCatalogMapping).where(
            models.DeliveryCatalogMapping.integration_id == integration_id,
            models.DeliveryCatalogMapping.tenant_id == current_user.tenant_id,
        )
    )
    session.commit()

    now = datetime.now(timezone.utc)
    for m in body.mappings:
        ext = (m.external_item_id or "").strip()
        if not ext:
            continue
        pid = m.product_id
        if pid is not None:
            prod = session.get(models.Product, pid)
            if not prod or prod.tenant_id != current_user.tenant_id:
                raise HTTPException(status_code=400, detail=f"Invalid product_id {pid}")
        session.add(
            models.DeliveryCatalogMapping(
                tenant_id=current_user.tenant_id,
                integration_id=integration_id,
                external_item_id=ext[:256],
                product_id=pid,
                notes=m.notes,
                created_at=now,
                updated_at=now,
            )
        )
    session.commit()
    return {"ok": True, "count": len(body.mappings)}


@router.get("/delivery-integrations/{integration_id}/events")
def list_delivery_events(
    integration_id: int,
    current_user: Annotated[models.User, Depends(require_permission(Permission.SETTINGS_READ))],
    session: Session = Depends(get_session),
    limit: int = Query(50, ge=1, le=200),
):
    row = session.exec(
        select(models.DeliveryMarketplaceIntegration).where(
            models.DeliveryMarketplaceIntegration.id == integration_id,
            models.DeliveryMarketplaceIntegration.tenant_id == current_user.tenant_id,
        )
    ).first()
    if not row:
        raise HTTPException(status_code=404, detail="Integration not found")

    logs = session.exec(
        select(models.DeliveryIntegrationEventLog)
        .where(
            models.DeliveryIntegrationEventLog.tenant_id == current_user.tenant_id,
            models.DeliveryIntegrationEventLog.integration_id == integration_id,
        )
        .order_by(desc(models.DeliveryIntegrationEventLog.created_at))
        .limit(limit)
    ).all()

    return [
        {
            "id": ev.id,
            "event_type": ev.event_type,
            "summary": ev.summary,
            "detail": ev.detail,
            "success": ev.success,
            "error_message": ev.error_message,
            "created_at": ev.created_at.isoformat() if ev.created_at else None,
        }
        for ev in logs
    ]


@public_router.post("/public/webhooks/delivery/{webhook_token}")
@public_menu_ip_limit()
def ingest_delivery_webhook(
    request: Request,
    response: Response,
    webhook_token: str,
    session: Session = Depends(get_session),
    payload: dict[str, Any] | None = Body(default=None),
):
    """
    Provider-agnostic ingest URL (token identifies tenant integration).
    Body must match adapter stub schema until real OAuth/API signatures are added.
    Rate-limited with the shared public-menu IP bucket (RATE_LIMIT_PUBLIC_MENU_PER_MINUTE).
    """
    body = payload if isinstance(payload, dict) else {}

    row = session.exec(
        select(models.DeliveryMarketplaceIntegration).where(
            models.DeliveryMarketplaceIntegration.webhook_ingest_token == webhook_token
        )
    ).first()
    if not row:
        raise HTTPException(status_code=404, detail="Unknown webhook")

    if not row.enabled:
        raise HTTPException(status_code=503, detail="Integration disabled")

    try:
        adapter = get_adapter(row.provider_key)
    except KeyError:
        raise HTTPException(status_code=500, detail="Adapter missing")

    tenant_id = row.tenant_id
    provider_label = _display_name(row.provider_key)

    try:
        normalized = adapter.parse_webhook_order(body)
    except Exception as e:
        log = models.DeliveryIntegrationEventLog(
            tenant_id=tenant_id,
            integration_id=row.id,
            provider_key=row.provider_key,
            event_type="webhook_parse_error",
            summary="invalid_payload",
            detail={"keys": list(body.keys())[:40]},
            success=False,
            error_message=str(e),
        )
        session.add(log)
        session.commit()
        raise HTTPException(status_code=400, detail=str(e))

    ext_ref = normalized["external_order_ref"]
    mapped_lines: list[dict[str, Any]] = []
    missing: list[str] = []

    for line in normalized["lines"]:
        eid = line["external_item_id"]
        qty = line["quantity"]
        m = session.exec(
            select(models.DeliveryCatalogMapping).where(
                models.DeliveryCatalogMapping.integration_id == row.id,
                models.DeliveryCatalogMapping.external_item_id == eid,
                models.DeliveryCatalogMapping.tenant_id == tenant_id,
            )
        ).first()
        if not m or m.product_id is None:
            missing.append(eid)
            continue
        mapped_lines.append({"product_id": m.product_id, "quantity": qty})

    if missing:
        log = models.DeliveryIntegrationEventLog(
            tenant_id=tenant_id,
            integration_id=row.id,
            provider_key=row.provider_key,
            event_type="import_error",
            summary=f"unmapped_items:{','.join(missing[:20])}",
            detail={"external_order_ref": ext_ref, "missing_external_item_ids": missing},
            success=False,
            error_message="Catalog mapping missing for one or more lines",
        )
        session.add(log)
        session.commit()
        raise HTTPException(status_code=422, detail="Unmapped catalog items")

    order, outcome = create_order_from_delivery_payload(
        session,
        tenant_id=tenant_id,
        integration=row,
        external_order_ref=str(ext_ref),
        lines=mapped_lines,
        customer_name=normalized.get("customer_name"),
        provider_label=provider_label,
    )

    ok = outcome.get("status") != "error"
    log = models.DeliveryIntegrationEventLog(
        tenant_id=tenant_id,
        integration_id=row.id,
        provider_key=row.provider_key,
        event_type="webhook_order",
        summary=f"order outcome={outcome.get('status')}",
        detail={"outcome": outcome, "external_order_ref": ext_ref},
        success=ok,
        error_message=None if ok else str(outcome.get("detail")),
    )
    session.add(log)
    session.commit()

    return {"received": True, **outcome}
