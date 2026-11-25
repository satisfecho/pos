"""Public careers intake + owner-only application management (#447)."""

from __future__ import annotations

import logging
import re
import uuid
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Annotated, Literal

from fastapi import (
    APIRouter,
    Depends,
    File,
    Form,
    HTTPException,
    Query,
    Request,
    Response,
    UploadFile,
)
from fastapi.responses import Response as FastAPIResponse
from pydantic import BaseModel, Field
from sqlmodel import Session, select

from app import models
from app.api_errors import api_error_payload
from app.messages import get_message
from app.careers_crypto import (
    decrypt_careers_file_bytes,
    decrypt_careers_pii,
    encrypt_careers_file_bytes,
    encrypt_careers_pii,
)
from app import careers_verify
from app.contact_validation import normalize_email_address, normalize_phone_e164
from app.db import get_session
from app.email_service import send_email, smtp_credentials_configured
from app.rate_limits import admin_user_limit, limiter, rate_limit_key
from app import security
from app.settings import settings

logger = logging.getLogger(__name__)

router = APIRouter()
public_router = APIRouter()

UPLOADS_DIR = Path(__file__).parent.parent / "uploads"
MAX_CV_BYTES = 5 * 1024 * 1024  # 5 MiB
MAX_WHY_TEXT = 8000
MAX_MESSAGE = 2000
ALLOWED_CV_TYPES = {
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
}
DEFAULT_RETENTION_DAYS = 180
MIN_RETENTION_DAYS = 30
MAX_RETENTION_DAYS = 730

CareerStatusLiteral = Literal["new", "contacted", "closed"]


def _client_ip(request: Request) -> str | None:
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()[:45]
    if request.client:
        return (request.client.host or "")[:45] or None
    return None


def _require_owner(user: models.User) -> int:
    if user.tenant_id is None:
        raise HTTPException(status_code=400, detail="User has no tenant")
    if user.role != models.UserRole.owner:
        raise HTTPException(status_code=403, detail="Owner only")
    return int(user.tenant_id)


def _retention_days(tenant: models.Tenant) -> int:
    raw = getattr(tenant, "careers_retention_days", None)
    try:
        n = int(raw) if raw is not None else DEFAULT_RETENTION_DAYS
    except (TypeError, ValueError):
        n = DEFAULT_RETENTION_DAYS
    return max(MIN_RETENTION_DAYS, min(MAX_RETENTION_DAYS, n))


def _careers_dir(tenant_id: int) -> Path:
    """Ensure uploads/{tenant}/careers exists and is writable by the app user (DOCKER_UID)."""
    d = UPLOADS_DIR / str(tenant_id) / "careers"
    try:
        d.mkdir(parents=True, exist_ok=True)
    except OSError as exc:
        logger.error(
            "careers: cannot create upload dir %s (%s); fix ownership of back/uploads to DOCKER_UID",
            d,
            exc,
        )
        raise HTTPException(
            status_code=503,
            detail="Careers CV storage is unavailable (uploads directory not writable)",
        ) from exc
    return d


def _delete_cv_file(tenant_id: int, filename: str | None) -> None:
    if not filename:
        return
    fn = filename.replace("\\", "/").strip("/")
    if not fn or "/" in fn or fn.startswith("."):
        return
    path = (_careers_dir(tenant_id) / fn).resolve()
    root = _careers_dir(tenant_id).resolve()
    if not str(path).startswith(str(root)):
        return
    try:
        path.unlink(missing_ok=True)
    except OSError:
        logger.warning("careers: could not delete CV file tenant=%s", tenant_id)


def purge_expired_career_applications(session: Session, tenant_id: int | None = None) -> int:
    """Delete expired applications (and CV files). Returns count removed."""
    now = datetime.now(timezone.utc)
    q = select(models.CareerApplication).where(models.CareerApplication.expires_at < now)
    if tenant_id is not None:
        q = q.where(models.CareerApplication.tenant_id == tenant_id)
    rows = list(session.exec(q).all())
    for row in rows:
        _delete_cv_file(row.tenant_id, row.cv_stored_filename)
        session.delete(row)
    if rows:
        session.commit()
    return len(rows)


def _serialize_application(row: models.CareerApplication) -> dict:
    pii = decrypt_careers_pii(row.pii_encrypted) or {}
    return {
        "id": row.id,
        "status": row.status.value if hasattr(row.status, "value") else str(row.status),
        "name": pii.get("name") or "",
        "email": pii.get("email") or "",
        "phone": pii.get("phone") or "",
        "message": pii.get("message") or "",
        "cv_original_name": pii.get("cv_original_name"),
        "has_cv": bool(row.cv_stored_filename),
        "expires_at": row.expires_at.isoformat() if row.expires_at else None,
        "created_at": row.created_at.isoformat() if row.created_at else None,
        "updated_at": row.updated_at.isoformat() if row.updated_at else None,
    }


class CareerStatusUpdate(BaseModel):
    status: CareerStatusLiteral


class CareerNotifyAllBody(BaseModel):
    role_title: str = Field(min_length=1, max_length=200)
    message: str | None = Field(default=None, max_length=4000)


class CareerRequestCodeBody(BaseModel):
    email: str = Field(min_length=3, max_length=320)


class CareerConfirmCodeBody(BaseModel):
    email: str = Field(min_length=3, max_length=320)
    code: str = Field(min_length=6, max_length=6)


@public_router.get("/public/tenants/{tenant_ref}/careers")
@limiter.limit(
    f"{getattr(settings, 'rate_limit_public_menu_per_minute', 60)}/minute",
    key_func=rate_limit_key,
)
def get_public_careers_info(
    request: Request,
    response: Response,
    tenant_ref: str,
    session: Session = Depends(get_session),
    lang: str = Query(default="en"),
) -> dict:
    """Public careers page config when enabled; 404 when disabled or unknown tenant."""
    from app.tenant_public_slug import resolve_tenant_by_ref

    tenant = resolve_tenant_by_ref(session, tenant_ref)
    if not tenant:
        raise HTTPException(status_code=404, detail=api_error_payload("tenant_not_found", lang))
    if not bool(getattr(tenant, "careers_enabled", False)):
        raise HTTPException(status_code=404, detail=api_error_payload("careers_disabled", lang))
    retention = _retention_days(tenant)
    why = (getattr(tenant, "careers_why_text", None) or "").strip() or None
    return {
        "tenant_id": tenant.id,
        "tenant_name": tenant.name,
        "enabled": True,
        "why_text": why,
        "retention_days": retention,
        "public_background_color": tenant.public_background_color,
        "public_primary_color": getattr(tenant, "public_primary_color", None),
        "logo_filename": tenant.logo_filename,
        "header_background_filename": tenant.header_background_filename,
        "address": tenant.address,
        "public_google_maps_url": tenant.public_google_maps_url,
        "public_openstreetmap_url": tenant.public_openstreetmap_url,
        "public_slug": getattr(tenant, "public_slug", None),
    }


@public_router.post("/public/tenants/{tenant_ref}/careers/applications/request-code")
@limiter.limit(
    f"{getattr(settings, 'rate_limit_careers_code_per_hour', 5)}/hour",
    key_func=rate_limit_key,
)
async def request_careers_verification_code(
    request: Request,
    response: Response,
    tenant_ref: str,
    body: CareerRequestCodeBody,
    session: Session = Depends(get_session),
    lang: str = Query(default="en"),
) -> dict:
    """Email a 6-digit code; no application or CV is stored yet (#448)."""
    from app.tenant_public_slug import resolve_tenant_by_ref

    tenant = resolve_tenant_by_ref(session, tenant_ref)
    if not tenant:
        raise HTTPException(status_code=404, detail=api_error_payload("tenant_not_found", lang))
    if not bool(getattr(tenant, "careers_enabled", False)):
        raise HTTPException(status_code=404, detail=api_error_payload("careers_disabled", lang))
    try:
        cemail = normalize_email_address(body.email)
    except ValueError:
        raise HTTPException(status_code=400, detail=api_error_payload("invalid_email", lang))

    _challenge, raw_code, email_sent = await careers_verify.issue_and_send_code(
        tenant=tenant,
        email=cemail,
        session=session,
        lang=lang,
        client_ip=_client_ip(request),
    )
    out: dict = {
        "ok": True,
        "email_sent": bool(email_sent),
        "message": get_message("careers_verification_sent", lang),
    }
    # Local/smoke only: expose code when email could not be sent and not production
    if (
        not settings.is_production
        and not email_sent
        and raw_code
        and len(raw_code) == careers_verify.CODE_DIGITS
    ):
        out["dev_code"] = raw_code
    return out


@public_router.post("/public/tenants/{tenant_ref}/careers/applications/confirm-code")
@limiter.limit(
    f"{getattr(settings, 'rate_limit_careers_code_per_hour', 5)}/hour",
    key_func=rate_limit_key,
)
def confirm_careers_verification_code(
    request: Request,
    response: Response,
    tenant_ref: str,
    body: CareerConfirmCodeBody,
    session: Session = Depends(get_session),
    lang: str = Query(default="en"),
) -> dict:
    """Confirm 6-digit code; returns a short-lived submit_token for the final POST (#448)."""
    from app.tenant_public_slug import resolve_tenant_by_ref

    tenant = resolve_tenant_by_ref(session, tenant_ref)
    if not tenant:
        raise HTTPException(status_code=404, detail=api_error_payload("tenant_not_found", lang))
    if not bool(getattr(tenant, "careers_enabled", False)):
        raise HTTPException(status_code=404, detail=api_error_payload("careers_disabled", lang))
    try:
        cemail = normalize_email_address(body.email)
    except ValueError:
        raise HTTPException(status_code=400, detail=api_error_payload("invalid_email", lang))
    code = (body.code or "").strip()
    if len(code) != 6 or not code.isdigit():
        raise HTTPException(
            status_code=400, detail=api_error_payload("careers_verification_invalid", lang)
        )
    result = careers_verify.confirm_code(
        session=session, tenant_id=int(tenant.id), email=cemail, code=code
    )
    if not result:
        raise HTTPException(
            status_code=400, detail=api_error_payload("careers_verification_invalid", lang)
        )
    _challenge, submit_token = result
    return {"ok": True, "submit_token": submit_token}


@public_router.post("/public/tenants/{tenant_ref}/careers/applications")
@limiter.limit(
    f"{getattr(settings, 'rate_limit_careers_per_hour', 10)}/hour",
    key_func=rate_limit_key,
)
async def submit_public_career_application(
    request: Request,
    response: Response,
    tenant_ref: str,
    name: Annotated[str, Form()],
    email: Annotated[str, Form()],
    phone: Annotated[str, Form()],
    submit_token: Annotated[str, Form()],
    message: Annotated[str | None, Form()] = None,
    cv: Annotated[UploadFile | None, File()] = None,
    session: Session = Depends(get_session),
    lang: str = Query(default="en"),
) -> dict:
    """Submit a careers application (multipart) after email code confirmation (#448)."""
    from app.tenant_public_slug import resolve_tenant_by_ref

    tenant = resolve_tenant_by_ref(session, tenant_ref)
    if not tenant:
        raise HTTPException(status_code=404, detail=api_error_payload("tenant_not_found", lang))
    if not bool(getattr(tenant, "careers_enabled", False)):
        raise HTTPException(status_code=404, detail=api_error_payload("careers_disabled", lang))

    purge_expired_career_applications(session, tenant.id)

    cname = (name or "").replace("\x00", "").strip()[:200]
    if len(cname) < 2:
        raise HTTPException(status_code=400, detail=api_error_payload("invalid_name", lang))
    try:
        cemail = normalize_email_address(email)
    except ValueError:
        raise HTTPException(status_code=400, detail=api_error_payload("invalid_email", lang))
    try:
        cphone = normalize_phone_e164(phone, settings.default_phone_country)
    except ValueError:
        raise HTTPException(status_code=400, detail=api_error_payload("invalid_phone", lang))

    token = (submit_token or "").strip()
    if not token:
        raise HTTPException(
            status_code=400, detail=api_error_payload("careers_verification_required", lang)
        )
    if not careers_verify.consume_submit_token(
        session=session, tenant_id=int(tenant.id), email=cemail, submit_token=token
    ):
        raise HTTPException(
            status_code=400, detail=api_error_payload("careers_submit_token_invalid", lang)
        )

    msg = None
    if message is not None and str(message).strip():
        msg = str(message).replace("\x00", "").strip()[:MAX_MESSAGE]

    cv_stored = None
    cv_ctype = None
    cv_orig = None
    if cv is not None and (cv.filename or "").strip():
        contents = await cv.read()
        if len(contents) > MAX_CV_BYTES:
            raise HTTPException(status_code=400, detail=api_error_payload("cv_too_large", lang))
        ctype = (cv.content_type or "").split(";")[0].strip().lower()
        # Allow by extension when browser sends octet-stream
        orig = (cv.filename or "cv.pdf").replace("\x00", "").strip()[:200]
        ext = Path(orig).suffix.lower()
        if ctype not in ALLOWED_CV_TYPES and ext not in {".pdf", ".doc", ".docx"}:
            raise HTTPException(status_code=400, detail=api_error_payload("cv_invalid_type", lang))
        if not contents:
            raise HTTPException(status_code=400, detail=api_error_payload("cv_empty", lang))
        stored_name = f"{uuid.uuid4().hex}.bin"
        enc = encrypt_careers_file_bytes(contents)
        path = _careers_dir(int(tenant.id)) / stored_name
        path.write_bytes(enc)
        cv_stored = stored_name
        cv_ctype = ctype or "application/octet-stream"
        cv_orig = orig

    pii = {
        "name": cname,
        "email": cemail,
        "phone": cphone,
        "message": msg or "",
    }
    if cv_orig:
        pii["cv_original_name"] = cv_orig

    retention = _retention_days(tenant)
    now = datetime.now(timezone.utc)
    row = models.CareerApplication(
        tenant_id=int(tenant.id),
        status=models.CareerApplicationStatus.new,
        pii_encrypted=encrypt_careers_pii(pii),
        cv_stored_filename=cv_stored,
        cv_content_type=cv_ctype,
        expires_at=now + timedelta(days=retention),
        client_ip=_client_ip(request),
        client_user_agent=(request.headers.get("user-agent") or "")[:512] or None,
        created_at=now,
        updated_at=now,
    )
    session.add(row)
    session.commit()
    session.refresh(row)
    # Do not log PII / CV
    logger.info(
        "careers: application created tenant_id=%s id=%s has_cv=%s",
        tenant.id,
        row.id,
        bool(cv_stored),
    )
    return {"ok": True, "id": row.id, "retention_days": retention}


@router.get("/careers/applications")
@admin_user_limit()
def list_career_applications(
    request: Request,
    response: Response,
    session: Session = Depends(get_session),
    current_user: Annotated[models.User, Depends(security.get_current_user)] = ...,
) -> list[dict]:
    """Owner-only list of decrypted applications for the tenant (expired purged first)."""
    tid = _require_owner(current_user)
    purge_expired_career_applications(session, tid)
    rows = session.exec(
        select(models.CareerApplication)
        .where(models.CareerApplication.tenant_id == tid)
        .order_by(models.CareerApplication.created_at.desc())
    ).all()
    return [_serialize_application(r) for r in rows]


@router.patch("/careers/applications/{application_id}")
@admin_user_limit()
def update_career_application_status(
    request: Request,
    response: Response,
    application_id: int,
    body: CareerStatusUpdate,
    session: Session = Depends(get_session),
    current_user: Annotated[models.User, Depends(security.get_current_user)] = ...,
) -> dict:
    tid = _require_owner(current_user)
    row = session.get(models.CareerApplication, application_id)
    if not row or row.tenant_id != tid:
        raise HTTPException(status_code=404, detail="Application not found")
    row.status = models.CareerApplicationStatus(body.status)
    row.updated_at = datetime.now(timezone.utc)
    session.add(row)
    session.commit()
    session.refresh(row)
    return _serialize_application(row)


@router.delete("/careers/applications/{application_id}")
@admin_user_limit()
def delete_career_application(
    request: Request,
    response: Response,
    application_id: int,
    session: Session = Depends(get_session),
    current_user: Annotated[models.User, Depends(security.get_current_user)] = ...,
) -> dict:
    tid = _require_owner(current_user)
    row = session.get(models.CareerApplication, application_id)
    if not row or row.tenant_id != tid:
        raise HTTPException(status_code=404, detail="Application not found")
    _delete_cv_file(tid, row.cv_stored_filename)
    session.delete(row)
    session.commit()
    return {"ok": True}


@router.get("/careers/applications/{application_id}/cv")
@admin_user_limit()
def download_career_cv(
    request: Request,
    response: Response,
    application_id: int,
    session: Session = Depends(get_session),
    current_user: Annotated[models.User, Depends(security.get_current_user)] = ...,
):
    """Owner-only: decrypt and download CV file."""
    tid = _require_owner(current_user)
    row = session.get(models.CareerApplication, application_id)
    if not row or row.tenant_id != tid or not row.cv_stored_filename:
        raise HTTPException(status_code=404, detail="CV not found")
    path = _careers_dir(tid) / row.cv_stored_filename
    if not path.is_file():
        raise HTTPException(status_code=404, detail="CV not found")
    plain = decrypt_careers_file_bytes(path.read_bytes())
    if plain is None:
        raise HTTPException(status_code=500, detail="CV decrypt failed")
    pii = decrypt_careers_pii(row.pii_encrypted) or {}
    download_name = pii.get("cv_original_name") or "cv.bin"
    download_name = re.sub(r"[^\w.\-]+", "_", str(download_name))[:180] or "cv.bin"
    media = row.cv_content_type or "application/octet-stream"
    return FastAPIResponse(
        content=plain,
        media_type=media,
        headers={"Content-Disposition": f'attachment; filename="{download_name}"'},
    )


@router.post("/careers/notify-all")
@admin_user_limit()
async def notify_all_career_candidates(
    request: Request,
    response: Response,
    body: CareerNotifyAllBody,
    session: Session = Depends(get_session),
    current_user: Annotated[models.User, Depends(security.get_current_user)] = ...,
) -> dict:
    """Email all active candidates: role opened - please update CV if interested."""
    tid = _require_owner(current_user)
    tenant = session.get(models.Tenant, tid)
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")
    if not smtp_credentials_configured(tenant):
        raise HTTPException(status_code=400, detail="SMTP not configured")

    purge_expired_career_applications(session, tid)
    rows = list(
        session.exec(
            select(models.CareerApplication).where(models.CareerApplication.tenant_id == tid)
        ).all()
    )
    role = body.role_title.replace("\x00", "").strip()[:200]
    extra = (body.message or "").replace("\x00", "").strip()[:4000]
    venue = tenant.name or "Restaurant"
    sent = 0
    failed = 0
    for row in rows:
        pii = decrypt_careers_pii(row.pii_encrypted) or {}
        to_email = (pii.get("email") or "").strip()
        if not to_email:
            failed += 1
            continue
        cname = (pii.get("name") or "candidate").strip() or "candidate"
        subject = f"{venue}: open role - {role}"
        text_lines = [
            f"Hello {cname},",
            "",
            f"{venue} has an open role: {role}.",
            "If you are interested, please reply with an updated CV (or re-apply on our careers page).",
        ]
        if extra:
            text_lines.extend(["", extra])
        text_lines.extend(["", f"- {venue}"])
        text_body = "\n".join(text_lines)
        html_body = "<br>".join(text_lines)
        try:
            ok = await send_email(to_email, subject, html_body, text_body, tenant=tenant)
            if ok:
                sent += 1
                if row.status == models.CareerApplicationStatus.new:
                    row.status = models.CareerApplicationStatus.contacted
                    row.updated_at = datetime.now(timezone.utc)
                    session.add(row)
            else:
                failed += 1
        except Exception:
            logger.exception("careers: notify-all send failed application_id=%s", row.id)
            failed += 1
    session.commit()
    return {"ok": True, "sent": sent, "failed": failed, "total": len(rows)}
