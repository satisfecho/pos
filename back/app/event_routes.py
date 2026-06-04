"""Events module API: staff guest-list management + public token RSVP + QR check-in."""

from __future__ import annotations

import uuid
from datetime import date, datetime, time, timezone
from typing import Annotated

from fastapi import (
    APIRouter,
    Body,
    Depends,
    File,
    HTTPException,
    Query,
    Request,
    Response,
    UploadFile,
)
from fastapi.responses import StreamingResponse
from sqlmodel import Session, func, select

from . import models
from .db import get_session
from .event_guest_import import (
    MAX_GUEST_IMPORT_ROWS,
    build_guest_preview,
    build_template_xlsx,
    confirm_guest_import,
    parse_spreadsheet,
)
from .permissions import Permission, require_permission
from .rate_limits import admin_user_limit, public_menu_ip_limit
from .settings import settings

router = APIRouter()
public_router = APIRouter()

_XLSX_MEDIA = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"


# ---------- helpers ----------


def _parse_date(value: str | None) -> date | None:
    if not value:
        return None
    try:
        return date.fromisoformat(value.strip())
    except ValueError:
        raise HTTPException(status_code=400, detail="invalid_event_date")


def _parse_time(value: str | None) -> time | None:
    if not value:
        return None
    try:
        return time.fromisoformat(value.strip())
    except ValueError:
        raise HTTPException(status_code=400, detail="invalid_event_time")


def _invite_url(token: str | None) -> str | None:
    if not token:
        return None
    base = (settings.public_app_base_url or "").rstrip("/")
    return f"{base}/invitacion?token={token}"


def _guest_to_dict(g: models.EventGuest) -> dict:
    return {
        "id": g.id,
        "event_id": g.event_id,
        "name": g.name,
        "phone": g.phone,
        "email": g.email,
        "party_size": g.party_size,
        "table_label": g.table_label,
        "notes": g.notes,
        "status": g.status.value if isinstance(g.status, models.InvitationStatus) else g.status,
        "token": g.token,
        "invite_url": _invite_url(g.token),
        "invited_at": g.invited_at,
        "responded_at": g.responded_at,
        "checked_in_at": g.checked_in_at,
        "created_at": g.created_at,
        "updated_at": g.updated_at,
    }


def _event_counts(session: Session, tenant_id: int, event_id: int) -> dict:
    rows = session.exec(
        select(models.EventGuest.status, func.count(), func.coalesce(func.sum(models.EventGuest.party_size), 0))
        .where(
            models.EventGuest.tenant_id == tenant_id,
            models.EventGuest.event_id == event_id,
        )
        .group_by(models.EventGuest.status)
    ).all()
    by_status = {s.value: 0 for s in models.InvitationStatus}
    total = 0
    confirmed_heads = 0
    for status_val, count, heads in rows:
        key = status_val.value if isinstance(status_val, models.InvitationStatus) else status_val
        by_status[key] = count
        total += count
        if key == models.InvitationStatus.confirmed.value:
            confirmed_heads = int(heads or 0)
    checked_in = session.exec(
        select(func.count()).where(
            models.EventGuest.tenant_id == tenant_id,
            models.EventGuest.event_id == event_id,
            models.EventGuest.checked_in_at.is_not(None),
        )
    ).one()
    return {
        "total": total,
        "pending": by_status.get("pending", 0),
        "confirmed": by_status.get("confirmed", 0),
        "declined": by_status.get("declined", 0),
        "maybe": by_status.get("maybe", 0),
        "confirmed_heads": confirmed_heads,  # confirmed guests + companions
        "checked_in": int(checked_in or 0),
    }


def _event_to_dict(event: models.Event, counts: dict | None = None) -> dict:
    return {
        "id": event.id,
        "title": event.title,
        "event_date": event.event_date.isoformat() if event.event_date else None,
        "event_time": event.event_time.strftime("%H:%M") if event.event_time else None,
        "location": event.location,
        "notes": event.notes,
        "status": event.status.value if isinstance(event.status, models.EventStatus) else event.status,
        "created_at": event.created_at,
        "updated_at": event.updated_at,
        "counts": counts,
    }


def _get_event(session: Session, tenant_id: int, event_id: int) -> models.Event:
    event = session.exec(
        select(models.Event).where(
            models.Event.id == event_id, models.Event.tenant_id == tenant_id
        )
    ).first()
    if not event:
        raise HTTPException(status_code=404, detail="event_not_found")
    return event


def _get_guest(session: Session, tenant_id: int, event_id: int, guest_id: int) -> models.EventGuest:
    guest = session.exec(
        select(models.EventGuest).where(
            models.EventGuest.id == guest_id,
            models.EventGuest.event_id == event_id,
            models.EventGuest.tenant_id == tenant_id,
        )
    ).first()
    if not guest:
        raise HTTPException(status_code=404, detail="guest_not_found")
    return guest


# ---------- staff: events ----------


@router.get("")
@admin_user_limit()
def list_events(
    request: Request,
    response: Response,
    current_user: Annotated[models.User, Depends(require_permission(Permission.EVENT_READ))],
    session: Session = Depends(get_session),
) -> list[dict]:
    events = session.exec(
        select(models.Event)
        .where(models.Event.tenant_id == current_user.tenant_id)
        .order_by(models.Event.event_date.is_(None), models.Event.event_date.desc(), models.Event.id.desc())
    ).all()
    return [
        _event_to_dict(e, _event_counts(session, current_user.tenant_id, e.id)) for e in events
    ]


@router.post("")
@admin_user_limit()
def create_event(
    request: Request,
    response: Response,
    body: models.EventCreate,
    current_user: Annotated[models.User, Depends(require_permission(Permission.EVENT_WRITE))],
    session: Session = Depends(get_session),
) -> dict:
    title = (body.title or "").strip()
    if not title:
        raise HTTPException(status_code=400, detail="title_required")
    event = models.Event(
        tenant_id=current_user.tenant_id,
        title=title,
        event_date=_parse_date(body.event_date),
        event_time=_parse_time(body.event_time),
        location=(body.location or "").strip() or None,
        notes=(body.notes or "").strip() or None,
    )
    session.add(event)
    session.commit()
    session.refresh(event)
    return _event_to_dict(event, _event_counts(session, current_user.tenant_id, event.id))


@router.get("/guest-template")
def download_guest_template(
    current_user: Annotated[models.User, Depends(require_permission(Permission.EVENT_READ))],
) -> StreamingResponse:
    data = build_template_xlsx()
    return StreamingResponse(
        iter([data]),
        media_type=_XLSX_MEDIA,
        headers={"Content-Disposition": 'attachment; filename="plantilla-invitados.xlsx"'},
    )


@router.get("/{event_id}")
@admin_user_limit()
def get_event(
    request: Request,
    response: Response,
    event_id: int,
    current_user: Annotated[models.User, Depends(require_permission(Permission.EVENT_READ))],
    session: Session = Depends(get_session),
) -> dict:
    event = _get_event(session, current_user.tenant_id, event_id)
    return _event_to_dict(event, _event_counts(session, current_user.tenant_id, event_id))


@router.put("/{event_id}")
@admin_user_limit()
def update_event(
    request: Request,
    response: Response,
    event_id: int,
    body: models.EventUpdate,
    current_user: Annotated[models.User, Depends(require_permission(Permission.EVENT_WRITE))],
    session: Session = Depends(get_session),
) -> dict:
    event = _get_event(session, current_user.tenant_id, event_id)
    if body.title is not None:
        title = body.title.strip()
        if not title:
            raise HTTPException(status_code=400, detail="title_required")
        event.title = title
    if body.event_date is not None:
        event.event_date = _parse_date(body.event_date)
    if body.event_time is not None:
        event.event_time = _parse_time(body.event_time)
    if body.location is not None:
        event.location = body.location.strip() or None
    if body.notes is not None:
        event.notes = body.notes.strip() or None
    if body.status is not None:
        event.status = body.status
    event.updated_at = datetime.now(timezone.utc)
    session.add(event)
    session.commit()
    session.refresh(event)
    return _event_to_dict(event, _event_counts(session, current_user.tenant_id, event_id))


@router.post("/{event_id}/cancel")
@admin_user_limit()
def cancel_event(
    request: Request,
    response: Response,
    event_id: int,
    current_user: Annotated[models.User, Depends(require_permission(Permission.EVENT_WRITE))],
    session: Session = Depends(get_session),
) -> dict:
    event = _get_event(session, current_user.tenant_id, event_id)
    event.status = models.EventStatus.cancelled
    event.updated_at = datetime.now(timezone.utc)
    session.add(event)
    session.commit()
    session.refresh(event)
    return _event_to_dict(event, _event_counts(session, current_user.tenant_id, event_id))


@router.delete("/{event_id}")
@admin_user_limit()
def delete_event(
    request: Request,
    response: Response,
    event_id: int,
    current_user: Annotated[models.User, Depends(require_permission(Permission.EVENT_WRITE))],
    session: Session = Depends(get_session),
) -> dict:
    event = _get_event(session, current_user.tenant_id, event_id)
    for guest in session.exec(
        select(models.EventGuest).where(
            models.EventGuest.event_id == event_id,
            models.EventGuest.tenant_id == current_user.tenant_id,
        )
    ).all():
        session.delete(guest)
    # Flush guest deletes before removing the event (no ORM relationship defines order;
    # the FK has no ON DELETE CASCADE under create_all, so delete children first).
    session.flush()
    session.delete(event)
    session.commit()
    return {"status": "deleted", "id": event_id}


# ---------- staff: guests ----------


@router.get("/{event_id}/guests")
@admin_user_limit()
def list_guests(
    request: Request,
    response: Response,
    event_id: int,
    current_user: Annotated[models.User, Depends(require_permission(Permission.EVENT_READ))],
    session: Session = Depends(get_session),
    status: str | None = Query(None),
    search: str | None = Query(None),
) -> list[dict]:
    _get_event(session, current_user.tenant_id, event_id)
    query = select(models.EventGuest).where(
        models.EventGuest.tenant_id == current_user.tenant_id,
        models.EventGuest.event_id == event_id,
    )
    if status:
        query = query.where(models.EventGuest.status == status)
    if search:
        like = f"%{search.strip()}%"
        query = query.where(models.EventGuest.name.ilike(like))
    guests = session.exec(query.order_by(models.EventGuest.name)).all()
    return [_guest_to_dict(g) for g in guests]


@router.post("/{event_id}/guests")
@admin_user_limit()
def add_guest(
    request: Request,
    response: Response,
    event_id: int,
    body: models.EventGuestCreate,
    current_user: Annotated[models.User, Depends(require_permission(Permission.EVENT_WRITE))],
    session: Session = Depends(get_session),
) -> dict:
    _get_event(session, current_user.tenant_id, event_id)
    name = (body.name or "").strip()
    if not name:
        raise HTTPException(status_code=400, detail="name_required")
    guest = models.EventGuest(
        tenant_id=current_user.tenant_id,
        event_id=event_id,
        name=name,
        phone=(body.phone or "").strip() or None,
        email=(body.email or "").strip() or None,
        party_size=body.party_size if (body.party_size and body.party_size >= 1) else 1,
        table_label=(body.table_label or "").strip() or None,
        notes=(body.notes or "").strip() or None,
        token=uuid.uuid4().hex,
    )
    session.add(guest)
    session.commit()
    session.refresh(guest)
    return _guest_to_dict(guest)


@router.put("/{event_id}/guests/{guest_id}")
@admin_user_limit()
def update_guest(
    request: Request,
    response: Response,
    event_id: int,
    guest_id: int,
    body: models.EventGuestUpdate,
    current_user: Annotated[models.User, Depends(require_permission(Permission.EVENT_WRITE))],
    session: Session = Depends(get_session),
) -> dict:
    guest = _get_guest(session, current_user.tenant_id, event_id, guest_id)
    if body.name is not None:
        name = body.name.strip()
        if not name:
            raise HTTPException(status_code=400, detail="name_required")
        guest.name = name
    if body.phone is not None:
        guest.phone = body.phone.strip() or None
    if body.email is not None:
        guest.email = body.email.strip() or None
    if body.party_size is not None:
        guest.party_size = body.party_size if body.party_size >= 1 else 1
    if body.table_label is not None:
        guest.table_label = body.table_label.strip() or None
    if body.notes is not None:
        guest.notes = body.notes.strip() or None
    guest.updated_at = datetime.now(timezone.utc)
    session.add(guest)
    session.commit()
    session.refresh(guest)
    return _guest_to_dict(guest)


@router.delete("/{event_id}/guests/{guest_id}")
@admin_user_limit()
def delete_guest(
    request: Request,
    response: Response,
    event_id: int,
    guest_id: int,
    current_user: Annotated[models.User, Depends(require_permission(Permission.EVENT_WRITE))],
    session: Session = Depends(get_session),
) -> dict:
    guest = _get_guest(session, current_user.tenant_id, event_id, guest_id)
    session.delete(guest)
    session.commit()
    return {"status": "deleted", "id": guest_id}


@router.put("/{event_id}/guests/{guest_id}/status")
@admin_user_limit()
def set_guest_status(
    request: Request,
    response: Response,
    event_id: int,
    guest_id: int,
    body: models.EventGuestStatusUpdate,
    current_user: Annotated[models.User, Depends(require_permission(Permission.EVENT_WRITE))],
    session: Session = Depends(get_session),
) -> dict:
    guest = _get_guest(session, current_user.tenant_id, event_id, guest_id)
    guest.status = body.status
    if body.status != models.InvitationStatus.pending:
        guest.responded_at = datetime.now(timezone.utc)
    guest.updated_at = datetime.now(timezone.utc)
    session.add(guest)
    session.commit()
    session.refresh(guest)
    return _guest_to_dict(guest)


@router.post("/{event_id}/guests/{guest_id}/invited")
@admin_user_limit()
def mark_guest_invited(
    request: Request,
    response: Response,
    event_id: int,
    guest_id: int,
    current_user: Annotated[models.User, Depends(require_permission(Permission.EVENT_WRITE))],
    session: Session = Depends(get_session),
) -> dict:
    """Record that the invitation was sent (e.g. after opening the WhatsApp share link)."""
    guest = _get_guest(session, current_user.tenant_id, event_id, guest_id)
    if not guest.invited_at:
        guest.invited_at = datetime.now(timezone.utc)
        guest.updated_at = guest.invited_at
        session.add(guest)
        session.commit()
        session.refresh(guest)
    return _guest_to_dict(guest)


# ---------- staff: check-in ----------


def _do_checkin(session: Session, guest: models.EventGuest) -> dict:
    already = guest.checked_in_at is not None
    if not already:
        guest.checked_in_at = datetime.now(timezone.utc)
        guest.updated_at = guest.checked_in_at
        session.add(guest)
        session.commit()
        session.refresh(guest)
    return {"already_checked_in": already, "guest": _guest_to_dict(guest)}


@router.post("/{event_id}/guests/{guest_id}/checkin")
@admin_user_limit()
def checkin_guest(
    request: Request,
    response: Response,
    event_id: int,
    guest_id: int,
    current_user: Annotated[models.User, Depends(require_permission(Permission.EVENT_WRITE))],
    session: Session = Depends(get_session),
) -> dict:
    guest = _get_guest(session, current_user.tenant_id, event_id, guest_id)
    return _do_checkin(session, guest)


@router.post("/{event_id}/checkin")
@admin_user_limit()
def checkin_by_token(
    request: Request,
    response: Response,
    event_id: int,
    current_user: Annotated[models.User, Depends(require_permission(Permission.EVENT_WRITE))],
    session: Session = Depends(get_session),
    token: str = Query(..., min_length=8),
) -> dict:
    """Door check-in via scanned QR token. Confirms the guest belongs to THIS event/tenant."""
    guest = session.exec(
        select(models.EventGuest).where(
            models.EventGuest.token == token,
            models.EventGuest.tenant_id == current_user.tenant_id,
        )
    ).first()
    if not guest or guest.event_id != event_id:
        raise HTTPException(status_code=404, detail="guest_not_in_event")
    return _do_checkin(session, guest)


# ---------- staff: import / export ----------


@router.post("/{event_id}/guests/import/preview")
@admin_user_limit()
def import_preview(
    request: Request,
    response: Response,
    event_id: int,
    current_user: Annotated[models.User, Depends(require_permission(Permission.EVENT_WRITE))],
    file: Annotated[UploadFile, File()],
    session: Session = Depends(get_session),
) -> dict:
    _get_event(session, current_user.tenant_id, event_id)
    contents = file.file.read()
    if not contents:
        raise HTTPException(status_code=400, detail="empty_file")
    try:
        raw_rows = parse_spreadsheet(contents, file.filename or "")
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    if not raw_rows:
        raise HTTPException(status_code=400, detail="no_rows")
    if len(raw_rows) > MAX_GUEST_IMPORT_ROWS:
        raise HTTPException(status_code=400, detail="too_many_rows")
    items = [models.EventGuestImportItem(**row) for row in raw_rows]
    preview = build_guest_preview(session, current_user.tenant_id, event_id, items)
    return preview.model_dump()


@router.post("/{event_id}/guests/import/confirm")
@admin_user_limit()
def import_confirm(
    request: Request,
    response: Response,
    event_id: int,
    body: models.EventGuestImportConfirm,
    current_user: Annotated[models.User, Depends(require_permission(Permission.EVENT_WRITE))],
    session: Session = Depends(get_session),
) -> dict:
    _get_event(session, current_user.tenant_id, event_id)
    valid = [g for g in body.guests if (g.name or "").strip()]
    if not valid:
        raise HTTPException(status_code=400, detail="no_valid_rows")
    if len(valid) > MAX_GUEST_IMPORT_ROWS:
        raise HTTPException(status_code=400, detail="too_many_rows")
    result = confirm_guest_import(
        session, current_user.tenant_id, event_id, valid, skip_duplicates=body.skip_duplicates
    )
    result["counts"] = _event_counts(session, current_user.tenant_id, event_id)
    return result


@router.get("/{event_id}/guests/export")
def export_guests(
    event_id: int,
    current_user: Annotated[models.User, Depends(require_permission(Permission.EVENT_READ))],
    session: Session = Depends(get_session),
) -> StreamingResponse:
    from openpyxl import Workbook
    from openpyxl.styles import Font

    event = _get_event(session, current_user.tenant_id, event_id)
    guests = session.exec(
        select(models.EventGuest)
        .where(
            models.EventGuest.tenant_id == current_user.tenant_id,
            models.EventGuest.event_id == event_id,
        )
        .order_by(models.EventGuest.name)
    ).all()

    status_label = {
        "pending": "Pendiente",
        "confirmed": "Confirmado",
        "declined": "No asiste",
        "maybe": "Tal vez",
    }
    wb = Workbook()
    ws = wb.active
    ws.title = (event.title or "Evento")[:31]
    headers = ["Nombre", "Telefono", "Email", "Acompanantes", "Mesa", "Estado", "Llego", "Notas"]
    ws.append(headers)
    for cell in ws[1]:
        cell.font = Font(bold=True)
    for g in guests:
        status_val = g.status.value if isinstance(g.status, models.InvitationStatus) else g.status
        ws.append([
            g.name,
            g.phone or "",
            g.email or "",
            g.party_size,
            g.table_label or "",
            status_label.get(status_val, status_val),
            "Si" if g.checked_in_at else "",
            g.notes or "",
        ])
    import io as _io

    buf = _io.BytesIO()
    wb.save(buf)
    buf.seek(0)
    fname = f"invitados-evento-{event_id}.xlsx"
    return StreamingResponse(
        iter([buf.getvalue()]),
        media_type=_XLSX_MEDIA,
        headers={"Content-Disposition": f'attachment; filename="{fname}"'},
    )


# ---------- public: invitation by token (no auth) ----------


@public_router.get("/public/events/invitation/by-token")
@public_menu_ip_limit()
def public_get_invitation(
    request: Request,
    response: Response,
    session: Session = Depends(get_session),
    token: str = Query(..., min_length=8),
) -> dict:
    guest = session.exec(
        select(models.EventGuest).where(models.EventGuest.token == token)
    ).first()
    if not guest:
        raise HTTPException(status_code=404, detail="invitation_not_found")
    event = session.exec(
        select(models.Event).where(models.Event.id == guest.event_id)
    ).first()
    if not event or event.status == models.EventStatus.cancelled:
        raise HTTPException(status_code=404, detail="event_not_available")
    tenant = session.exec(
        select(models.Tenant).where(models.Tenant.id == guest.tenant_id)
    ).first()
    status_val = guest.status.value if isinstance(guest.status, models.InvitationStatus) else guest.status
    return {
        "guest_name": guest.name,
        "status": status_val,
        "party_size": guest.party_size,
        "checked_in": guest.checked_in_at is not None,
        "event": {
            "title": event.title,
            "event_date": event.event_date.isoformat() if event.event_date else None,
            "event_time": event.event_time.strftime("%H:%M") if event.event_time else None,
            "location": event.location,
        },
        "tenant": {
            "id": tenant.id if tenant else None,
            "name": tenant.name if tenant else None,
        },
    }


@public_router.post("/public/events/invitation/{token}/respond")
@public_menu_ip_limit()
def public_respond_invitation(
    request: Request,
    response: Response,
    token: str,
    body: models.PublicInvitationRespond,
    session: Session = Depends(get_session),
) -> dict:
    if body.status == models.InvitationStatus.pending:
        raise HTTPException(status_code=400, detail="invalid_response")
    guest = session.exec(
        select(models.EventGuest).where(models.EventGuest.token == token)
    ).first()
    if not guest:
        raise HTTPException(status_code=404, detail="invitation_not_found")
    event = session.exec(
        select(models.Event).where(models.Event.id == guest.event_id)
    ).first()
    if not event or event.status == models.EventStatus.cancelled:
        raise HTTPException(status_code=404, detail="event_not_available")
    guest.status = body.status
    guest.responded_at = datetime.now(timezone.utc)
    guest.updated_at = guest.responded_at
    session.add(guest)
    session.commit()
    session.refresh(guest)
    return {"status": guest.status.value, "guest_name": guest.name}
