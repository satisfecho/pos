"""CRUD for per-tenant staff contract templates (settings; STAFF_CONTRACT_MANAGE)."""

from __future__ import annotations

import re
from datetime import datetime, timezone
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select

from . import models
from .db import get_session
from .permissions import Permission, require_permission
from .staff_contract_template_presets import list_presets_for_tenant

router = APIRouter()

_TEMPLATE_KEY_RE = re.compile(r"^[a-zA-Z0-9][a-zA-Z0-9_-]{0,62}$")
_LOCALE_RE = re.compile(r"^[a-zA-Z]{2,3}([_-][a-zA-Z0-9]{1,8}){0,3}$")


def _require_tenant_user(user: models.User) -> None:
    if user.tenant_id is None:
        raise HTTPException(status_code=403, detail="Tenant staff only")


def _validate_template_key(key: str) -> None:
    if not _TEMPLATE_KEY_RE.match(key or ""):
        raise HTTPException(
            status_code=400,
            detail="template_key must be 1–64 chars: start with letter or digit, then letters, digits, _ or -",
        )


def _normalize_locale(raw: str | None) -> str | None:
    if raw is None:
        return None
    s = raw.strip()
    if not s:
        return None
    if len(s) > 16:
        raise HTTPException(status_code=400, detail="locale must be at most 16 characters")
    if not _LOCALE_RE.match(s):
        raise HTTPException(
            status_code=400,
            detail="locale must look like a BCP 47 tag (e.g. es, en, en-IN)",
        )
    return s


def _to_read(row: models.StaffContractTemplate) -> models.StaffContractTemplateRead:
    return models.StaffContractTemplateRead(
        id=row.id,
        tenant_id=row.tenant_id,
        template_key=row.template_key,
        name=row.name,
        body=row.body,
        locale=row.locale,
        kind=row.kind,
        created_at=row.created_at,
        updated_at=row.updated_at,
    )


def _usage_count(session: Session, tenant_id: int, template_key: str) -> int:
    rows = session.exec(
        select(models.StaffContract.id).where(
            models.StaffContract.tenant_id == tenant_id,
            models.StaffContract.template_key == template_key,
        )
    ).all()
    return len(rows)


@router.get("", response_model=list[models.StaffContractTemplateRead])
def list_staff_contract_templates(
    current_user: Annotated[models.User, Depends(require_permission(Permission.STAFF_CONTRACT_MANAGE))],
    session: Session = Depends(get_session),
):
    _require_tenant_user(current_user)
    tid = current_user.tenant_id
    assert tid is not None
    rows = session.exec(
        select(models.StaffContractTemplate)
        .where(models.StaffContractTemplate.tenant_id == tid)
        .order_by(models.StaffContractTemplate.name)
    ).all()
    return [_to_read(r) for r in rows]


@router.get("/presets", response_model=list[models.StaffContractTemplatePresetRead])
def list_contract_template_presets(
    current_user: Annotated[models.User, Depends(require_permission(Permission.STAFF_CONTRACT_MANAGE))],
    session: Session = Depends(get_session),
):
    _require_tenant_user(current_user)
    tid = current_user.tenant_id
    assert tid is not None
    tenant = session.get(models.Tenant, tid)
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")
    return list_presets_for_tenant(session, tenant)


@router.post("/import-preset", response_model=models.StaffContractTemplateRead)
def import_staff_contract_template_from_preset(
    body: models.StaffContractTemplateImportPreset,
    current_user: Annotated[models.User, Depends(require_permission(Permission.STAFF_CONTRACT_MANAGE))],
    session: Session = Depends(get_session),
):
    _require_tenant_user(current_user)
    tid = current_user.tenant_id
    assert tid is not None
    preset = session.get(models.StaffContractTemplatePreset, body.preset_id)
    if not preset:
        raise HTTPException(status_code=404, detail="Preset not found")

    key = (body.template_key or preset.template_key or "").strip()
    _validate_template_key(key)

    exists = session.exec(
        select(models.StaffContractTemplate).where(
            models.StaffContractTemplate.tenant_id == tid,
            models.StaffContractTemplate.template_key == key,
        )
    ).first()
    if exists:
        raise HTTPException(status_code=409, detail="template_key already exists for this tenant")

    loc = _normalize_locale(preset.locale)
    now = datetime.now(timezone.utc)
    row = models.StaffContractTemplate(
        tenant_id=tid,
        template_key=key,
        name=preset.name.strip(),
        body=preset.body or "",
        locale=loc,
        kind=preset.kind,
        created_at=now,
        updated_at=now,
    )
    session.add(row)
    session.commit()
    session.refresh(row)
    return _to_read(row)


@router.post("", response_model=models.StaffContractTemplateRead)
def create_staff_contract_template(
    body: models.StaffContractTemplateCreate,
    current_user: Annotated[models.User, Depends(require_permission(Permission.STAFF_CONTRACT_MANAGE))],
    session: Session = Depends(get_session),
):
    _require_tenant_user(current_user)
    tid = current_user.tenant_id
    assert tid is not None
    _validate_template_key(body.template_key)
    loc = _normalize_locale(body.locale)

    exists = session.exec(
        select(models.StaffContractTemplate).where(
            models.StaffContractTemplate.tenant_id == tid,
            models.StaffContractTemplate.template_key == body.template_key,
        )
    ).first()
    if exists:
        raise HTTPException(status_code=409, detail="template_key already exists for this tenant")

    now = datetime.now(timezone.utc)
    row = models.StaffContractTemplate(
        tenant_id=tid,
        template_key=body.template_key.strip(),
        name=body.name.strip(),
        body=body.body or "",
        locale=loc,
        kind=body.kind,
        created_at=now,
        updated_at=now,
    )
    session.add(row)
    session.commit()
    session.refresh(row)
    return _to_read(row)


@router.get("/{template_id}", response_model=models.StaffContractTemplateRead)
def get_staff_contract_template(
    template_id: int,
    current_user: Annotated[models.User, Depends(require_permission(Permission.STAFF_CONTRACT_MANAGE))],
    session: Session = Depends(get_session),
):
    _require_tenant_user(current_user)
    tid = current_user.tenant_id
    assert tid is not None
    row = session.get(models.StaffContractTemplate, template_id)
    if not row or row.tenant_id != tid:
        raise HTTPException(status_code=404, detail="Template not found")
    return _to_read(row)


@router.patch("/{template_id}", response_model=models.StaffContractTemplateRead)
def update_staff_contract_template(
    template_id: int,
    body: models.StaffContractTemplateUpdate,
    current_user: Annotated[models.User, Depends(require_permission(Permission.STAFF_CONTRACT_MANAGE))],
    session: Session = Depends(get_session),
):
    _require_tenant_user(current_user)
    tid = current_user.tenant_id
    assert tid is not None
    row = session.get(models.StaffContractTemplate, template_id)
    if not row or row.tenant_id != tid:
        raise HTTPException(status_code=404, detail="Template not found")

    data = body.model_dump(exclude_unset=True)
    if "name" in data and data["name"] is not None:
        row.name = data["name"].strip()
    if "body" in data and data["body"] is not None:
        row.body = data["body"]
    if "locale" in data:
        row.locale = _normalize_locale(data["locale"]) if data["locale"] is not None else None
    if "kind" in data:
        row.kind = data["kind"]
    row.updated_at = datetime.now(timezone.utc)
    session.add(row)
    session.commit()
    session.refresh(row)
    return _to_read(row)


@router.delete("/{template_id}")
def delete_staff_contract_template(
    template_id: int,
    current_user: Annotated[models.User, Depends(require_permission(Permission.STAFF_CONTRACT_MANAGE))],
    session: Session = Depends(get_session),
):
    _require_tenant_user(current_user)
    tid = current_user.tenant_id
    assert tid is not None
    row = session.get(models.StaffContractTemplate, template_id)
    if not row or row.tenant_id != tid:
        raise HTTPException(status_code=404, detail="Template not found")

    n = _usage_count(session, tid, row.template_key)
    if n > 0:
        raise HTTPException(
            status_code=409,
            detail=f"Template is in use by {n} contract record(s); clear template_key or archive first",
        )

    session.delete(row)
    session.commit()
    return {"ok": True}
