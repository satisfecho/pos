"""Shared JSON shape for WorkSession (clock in/out, reports)."""

from __future__ import annotations

from datetime import datetime, timezone

from sqlmodel import Session, select

from app import models

# Default “normal day” length for overtime visibility (not persisted; not legal advice).
WORK_SESSION_CONTRACT_THRESHOLD_MINUTES = 480


def _total_break_seconds(
    session: Session | None,
    ws: models.WorkSession,
    *,
    now_utc: datetime,
) -> int:
    """Sum completed and in-progress break intervals for this session."""
    if session is None:
        return 0
    rows = session.exec(
        select(models.WorkSessionBreak).where(models.WorkSessionBreak.work_session_id == ws.id)
    ).all()
    total = 0
    for br in rows:
        if br.ended_at is not None and br.started_at is not None:
            total += max(0, int((br.ended_at - br.started_at).total_seconds()))
        elif br.started_at is not None:
            total += max(0, int((now_utc - br.started_at).total_seconds()))
    return total


def serialize_work_session(
    ws: models.WorkSession,
    user_name: str,
    *,
    now_utc: datetime | None = None,
    session: Session | None = None,
) -> dict:
    """Build API dict. Open sessions include active work time (excluding breaks) and over-contract flag."""
    now = now_utc if now_utc is not None else datetime.now(timezone.utc)
    break_sec = _total_break_seconds(session, ws, now_utc=now)

    on_break = getattr(ws, "break_started_at", None) is not None

    duration_minutes: int | None = None
    if ws.ended_at is not None and ws.started_at is not None:
        gross = max(0, int((ws.ended_at - ws.started_at).total_seconds() // 60))
        duration_minutes = max(0, gross - break_sec // 60)

    open_work_minutes: int | None = None
    open_duration_minutes: int | None = None
    over_contract = False
    if ws.ended_at is None and ws.started_at is not None:
        wall_sec = max(0, int((now - ws.started_at).total_seconds()))
        work_sec = max(0, wall_sec - break_sec)
        open_work_minutes = work_sec // 60
        open_duration_minutes = open_work_minutes
        over_contract = open_work_minutes >= WORK_SESSION_CONTRACT_THRESHOLD_MINUTES

    return {
        "id": ws.id,
        "tenant_id": ws.tenant_id,
        "user_id": ws.user_id,
        "user_name": user_name,
        "started_at": ws.started_at.isoformat() if ws.started_at else None,
        "ended_at": ws.ended_at.isoformat() if ws.ended_at else None,
        "duration_minutes": duration_minutes,
        "open_duration_minutes": open_duration_minutes,
        "contract_threshold_minutes": WORK_SESSION_CONTRACT_THRESHOLD_MINUTES,
        "over_contract": over_contract,
        "start_ip": ws.start_ip,
        "end_ip": ws.end_ip,
        "on_break": on_break,
        "break_started_at": ws.break_started_at.isoformat() if getattr(ws, "break_started_at", None) else None,
        "break_seconds_total": break_sec,
    }


def work_session_net_duration_minutes(ws: models.WorkSession, session: Session) -> int | None:
    """Net worked minutes for a closed session (breaks excluded). None if still open or missing times."""
    if ws.ended_at is None or ws.started_at is None:
        return None
    break_sec = _total_break_seconds(session, ws, now_utc=ws.ended_at)
    gross = max(0, int((ws.ended_at - ws.started_at).total_seconds() // 60))
    return max(0, gross - break_sec // 60)
