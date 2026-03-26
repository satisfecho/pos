"""Staff contract CRUD and signed-document upload (tenant-scoped, RBAC)."""

from __future__ import annotations

import logging
from datetime import datetime, timezone
from pathlib import Path
from typing import Annotated
from uuid import uuid4

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from fastapi.responses import FileResponse, HTMLResponse
from sqlalchemy import desc, func
from sqlmodel import Session, col, select

from . import models
from .db import get_session
from .permissions import Permission, has_permission, require_permission
from .staff_contract_template_merge import (
    fallback_contract_html,
    merge_placeholders,
    placeholder_values_for_contract,
    wrap_print_html,
)
logger = logging.getLogger(__name__)

UPLOADS_DIR = Path(__file__).resolve().parent.parent / "uploads"
MAX_CONTRACT_BYTES = 15 * 1024 * 1024

router = APIRouter()


def _require_tenant_user(user: models.User) -> None:
    if user.tenant_id is None:
        raise HTTPException(status_code=403, detail="Tenant staff only")


def _default_payment_for_kind(kind: models.StaffContractKind) -> models.StaffContractPaymentStructure:
    if kind == models.StaffContractKind.freelancer:
        return models.StaffContractPaymentStructure.invoice
    return models.StaffContractPaymentStructure.payroll


def _contract_doc_path(tenant_id: int, filename: str) -> Path:
    safe = Path(filename).name
    d = (UPLOADS_DIR / str(tenant_id) / "contracts").resolve()
    p = (d / safe).resolve()
    uploads_root = UPLOADS_DIR.resolve()
    if not p.is_relative_to(uploads_root):
        raise HTTPException(status_code=400, detail="Invalid file path")
    return p


def _serialize_contract(
    c: models.StaffContract,
    subject: models.User | None,
    actor: models.User,
    *,
    include_internal: bool,
    include_tax_for_others: bool,
) -> models.StaffContractRead:
    is_subject = c.subject_user_id == actor.id
    show_tax = include_tax_for_others or is_subject
    show_internal = include_internal

    gid = str(c.contract_group_id) if c.contract_group_id is not None else ""  # UUID -> str for JSON

    return models.StaffContractRead(
        id=c.id,
        tenant_id=c.tenant_id,
        contract_group_id=gid,
        version=c.version,
        subject_user_id=c.subject_user_id,
        subject_email=subject.email if subject else None,
        subject_full_name=subject.full_name if subject else None,
        kind=c.kind,
        status=c.status,
        role_title=c.role_title,
        start_date=c.start_date,
        end_date=c.end_date,
        compensation_summary=c.compensation_summary,
        tax_identifier_subject=c.tax_identifier_subject if show_tax else None,
        payment_structure=c.payment_structure,
        payment_terms=c.payment_terms,
        jurisdiction_note=c.jurisdiction_note,
        template_key=c.template_key,
        notes_internal=c.notes_internal if show_internal else None,
        has_document=bool(c.document_filename),
        document_uploaded_at=c.document_uploaded_at,
        created_by_user_id=c.created_by_user_id,
        created_at=c.created_at,
        updated_at=c.updated_at,
    )


@router.get("", response_model=list[models.StaffContractRead])
def list_staff_contracts(
    current_user: Annotated[models.User, Depends(require_permission(Permission.STAFF_CONTRACT_READ))],
    session: Session = Depends(get_session),
):
    _require_tenant_user(current_user)
    tid = current_user.tenant_id
    assert tid is not None

    manage = has_permission(current_user, Permission.STAFF_CONTRACT_MANAGE)
    stmt = select(models.StaffContract).where(models.StaffContract.tenant_id == tid)
    if not manage:
        stmt = stmt.where(models.StaffContract.subject_user_id == current_user.id)

    contracts = list(session.exec(stmt.order_by(desc(models.StaffContract.updated_at))).all())

    user_ids = {c.subject_user_id for c in contracts}
    user_map: dict[int, models.User] = {}
    if user_ids:
        users = session.exec(select(models.User).where(col(models.User.id).in_(user_ids))).all()
        user_map = {u.id: u for u in users}

    include_internal = manage
    include_tax = manage

    return [
        _serialize_contract(
            c,
            user_map.get(c.subject_user_id),
            current_user,
            include_internal=include_internal,
            include_tax_for_others=include_tax,
        )
        for c in contracts
    ]


@router.post("", response_model=models.StaffContractRead)
def create_staff_contract(
    body: models.StaffContractCreate,
    current_user: Annotated[models.User, Depends(require_permission(Permission.STAFF_CONTRACT_MANAGE))],
    session: Session = Depends(get_session),
):
    _require_tenant_user(current_user)
    tid = current_user.tenant_id
    assert tid is not None

    subj = session.get(models.User, body.subject_user_id)
    if not subj or subj.tenant_id != tid:
        raise HTTPException(status_code=400, detail="Subject user must belong to this tenant")

    pay = body.payment_structure or _default_payment_for_kind(body.kind)

    gid = uuid4()
    now = datetime.now(timezone.utc)
    row = models.StaffContract(
        tenant_id=tid,
        contract_group_id=gid,
        version=1,
        subject_user_id=body.subject_user_id,
        kind=body.kind,
        status=body.status,
        role_title=body.role_title,
        start_date=body.start_date,
        end_date=body.end_date,
        compensation_summary=body.compensation_summary,
        tax_identifier_subject=body.tax_identifier_subject,
        payment_structure=pay,
        payment_terms=body.payment_terms,
        jurisdiction_note=body.jurisdiction_note,
        template_key=body.template_key,
        notes_internal=body.notes_internal,
        created_by_user_id=current_user.id,
        created_at=now,
        updated_at=now,
    )
    session.add(row)
    session.commit()
    session.refresh(row)
    return _serialize_contract(row, subj, current_user, include_internal=True, include_tax_for_others=True)


def _get_contract(session: Session, contract_id: int, tenant_id: int) -> models.StaffContract | None:
    return session.exec(
        select(models.StaffContract).where(
            models.StaffContract.id == contract_id,
            models.StaffContract.tenant_id == tenant_id,
        )
    ).first()


def _can_access_contract(actor: models.User, c: models.StaffContract) -> bool:
    if has_permission(actor, Permission.STAFF_CONTRACT_MANAGE):
        return True
    return c.subject_user_id == actor.id


@router.get("/{contract_id}", response_model=models.StaffContractRead)
def get_staff_contract(
    contract_id: int,
    current_user: Annotated[models.User, Depends(require_permission(Permission.STAFF_CONTRACT_READ))],
    session: Session = Depends(get_session),
):
    _require_tenant_user(current_user)
    tid = current_user.tenant_id
    assert tid is not None
    c = _get_contract(session, contract_id, tid)
    if not c or not _can_access_contract(current_user, c):
        raise HTTPException(status_code=404, detail="Contract not found")

    subj = session.get(models.User, c.subject_user_id)
    manage = has_permission(current_user, Permission.STAFF_CONTRACT_MANAGE)
    return _serialize_contract(
        c,
        subj,
        current_user,
        include_internal=manage,
        include_tax_for_others=manage,
    )


@router.get("/{contract_id}/print", response_class=HTMLResponse)
def print_staff_contract_html(
    contract_id: int,
    current_user: Annotated[models.User, Depends(require_permission(Permission.STAFF_CONTRACT_READ))],
    session: Session = Depends(get_session),
):
    """Print-ready HTML: merges tenant template (if template_key matches) with contract fields."""
    _require_tenant_user(current_user)
    tid = current_user.tenant_id
    assert tid is not None
    c = _get_contract(session, contract_id, tid)
    if not c or not _can_access_contract(current_user, c):
        raise HTTPException(status_code=404, detail="Contract not found")

    subj = session.get(models.User, c.subject_user_id)
    if not subj:
        raise HTTPException(status_code=404, detail="Subject user not found")

    tenant = session.get(models.Tenant, tid)
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")

    values = placeholder_values_for_contract(tenant, c, subj)
    inner: str
    if c.template_key:
        tpl = session.exec(
            select(models.StaffContractTemplate).where(
                models.StaffContractTemplate.tenant_id == tid,
                models.StaffContractTemplate.template_key == c.template_key,
            )
        ).first()
        if tpl:
            inner = merge_placeholders(tpl.body, values)
        else:
            inner = fallback_contract_html(values)
    else:
        inner = fallback_contract_html(values)

    return HTMLResponse(content=wrap_print_html(inner, values))


@router.patch("/{contract_id}", response_model=models.StaffContractRead)
def update_staff_contract(
    contract_id: int,
    body: models.StaffContractUpdate,
    current_user: Annotated[models.User, Depends(require_permission(Permission.STAFF_CONTRACT_MANAGE))],
    session: Session = Depends(get_session),
):
    _require_tenant_user(current_user)
    tid = current_user.tenant_id
    assert tid is not None
    c = _get_contract(session, contract_id, tid)
    if not c:
        raise HTTPException(status_code=404, detail="Contract not found")

    data = body.model_dump(exclude_unset=True)
    for k, v in data.items():
        setattr(c, k, v)
    c.updated_at = datetime.now(timezone.utc)
    session.add(c)
    session.commit()
    session.refresh(c)
    subj = session.get(models.User, c.subject_user_id)
    return _serialize_contract(c, subj, current_user, include_internal=True, include_tax_for_others=True)


@router.post("/{contract_id}/new-version", response_model=models.StaffContractRead)
def new_version_staff_contract(
    contract_id: int,
    current_user: Annotated[models.User, Depends(require_permission(Permission.STAFF_CONTRACT_MANAGE))],
    session: Session = Depends(get_session),
):
    _require_tenant_user(current_user)
    tid = current_user.tenant_id
    assert tid is not None
    c = _get_contract(session, contract_id, tid)
    if not c:
        raise HTTPException(status_code=404, detail="Contract not found")

    max_v = session.exec(
        select(func.max(models.StaffContract.version)).where(
            models.StaffContract.tenant_id == tid,
            models.StaffContract.contract_group_id == c.contract_group_id,
        )
    ).first()

    next_v = (max_v or 0) + 1

    now = datetime.now(timezone.utc)
    row = models.StaffContract(
        tenant_id=tid,
        contract_group_id=c.contract_group_id,
        version=next_v,
        subject_user_id=c.subject_user_id,
        kind=c.kind,
        status=models.StaffContractStatus.draft,
        role_title=c.role_title,
        start_date=c.start_date,
        end_date=c.end_date,
        compensation_summary=c.compensation_summary,
        tax_identifier_subject=c.tax_identifier_subject,
        payment_structure=c.payment_structure,
        payment_terms=c.payment_terms,
        jurisdiction_note=c.jurisdiction_note,
        template_key=c.template_key,
        notes_internal=c.notes_internal,
        document_filename=None,
        document_uploaded_at=None,
        created_by_user_id=current_user.id,
        created_at=now,
        updated_at=now,
    )
    session.add(row)
    session.commit()
    session.refresh(row)
    subj = session.get(models.User, row.subject_user_id)
    return _serialize_contract(row, subj, current_user, include_internal=True, include_tax_for_others=True)


@router.post("/{contract_id}/document", response_model=models.StaffContractRead)
async def upload_staff_contract_document(
    contract_id: int,
    file: Annotated[UploadFile, File()],
    current_user: Annotated[models.User, Depends(require_permission(Permission.STAFF_CONTRACT_MANAGE))],
    session: Session = Depends(get_session),
):
    _require_tenant_user(current_user)
    tid = current_user.tenant_id
    assert tid is not None
    c = _get_contract(session, contract_id, tid)
    if not c:
        raise HTTPException(status_code=404, detail="Contract not found")

    contents = await file.read()
    if len(contents) > MAX_CONTRACT_BYTES:
        raise HTTPException(status_code=400, detail="File too large (max 15MB)")
    if len(contents) < 5 or not contents.startswith(b"%PDF"):
        raise HTTPException(status_code=400, detail="Only PDF uploads are accepted")

    tenant_dir = UPLOADS_DIR / str(tid) / "contracts"
    tenant_dir.mkdir(parents=True, exist_ok=True)
    new_name = f"{uuid4().hex}.pdf"
    out = tenant_dir / new_name
    out.write_bytes(contents)

    c.document_filename = new_name
    c.document_uploaded_at = datetime.now(timezone.utc)
    c.updated_at = c.document_uploaded_at
    session.add(c)
    session.commit()
    session.refresh(c)
    subj = session.get(models.User, c.subject_user_id)
    return _serialize_contract(c, subj, current_user, include_internal=True, include_tax_for_others=True)


@router.get("/{contract_id}/document")
def download_staff_contract_document(
    contract_id: int,
    current_user: Annotated[models.User, Depends(require_permission(Permission.STAFF_CONTRACT_READ))],
    session: Session = Depends(get_session),
):
    _require_tenant_user(current_user)
    tid = current_user.tenant_id
    assert tid is not None
    c = _get_contract(session, contract_id, tid)
    if not c or not _can_access_contract(current_user, c):
        raise HTTPException(status_code=404, detail="Contract not found")
    if not c.document_filename:
        raise HTTPException(status_code=404, detail="No document uploaded")

    path = _contract_doc_path(tid, c.document_filename)
    if not path.is_file():
        raise HTTPException(status_code=404, detail="File missing on server")

    return FileResponse(
        path,
        media_type="application/pdf",
        filename=f"contract-{c.id}-v{c.version}.pdf",
    )
