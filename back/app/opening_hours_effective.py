"""
Resolve effective opening hours for a tenant on a calendar date.

Baseline: tenant.opening_hours applies until superseded by the latest
opening_hours_baseline_schedule row with effective_from <= date.

Date overrides: narrowest covering range wins (tie-break: higher id).
"""

from __future__ import annotations

import json
from datetime import date, time
from typing import TYPE_CHECKING, List, Tuple

from sqlalchemy import desc
from sqlmodel import Session, select

from . import models

if TYPE_CHECKING:
    pass

_DAY_NAMES = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]


def _parse_hh_mm_to_time(value) -> time | None:
    if value is None:
        return None
    s = str(value).strip()
    if not s:
        return None
    parts = s.split(":")
    try:
        h = int(parts[0])
        m = int(parts[1]) if len(parts) > 1 else 0
        return time(h, m)
    except (ValueError, IndexError):
        return None


def _service_windows_from_day_hours(day_hours: dict) -> List[Tuple[time, time]]:
    """Service intervals (open, close) for one weekday. Empty list = closed or unparseable."""
    if not day_hours or day_hours.get("closed"):
        return []
    if day_hours.get("hasBreak"):
        mo = _parse_hh_mm_to_time(day_hours.get("morningOpen") or day_hours.get("open"))
        mc = _parse_hh_mm_to_time(day_hours.get("morningClose"))
        eo = _parse_hh_mm_to_time(day_hours.get("eveningOpen"))
        ec = _parse_hh_mm_to_time(day_hours.get("eveningClose") or day_hours.get("close"))
        if not all((mo, mc, eo, ec)):
            return []
        return [(mo, mc), (eo, ec)]
    o = _parse_hh_mm_to_time(day_hours.get("open"))
    c = _parse_hh_mm_to_time(day_hours.get("eveningClose") or day_hours.get("close"))
    if not o or not c:
        return []
    return [(o, c)]


def _legacy_windows_from_tenant_only(tenant: models.Tenant, res_date: date) -> List[Tuple[time, time]] | None:
    """Same behaviour as historical main.py when no DB session is available."""
    if not tenant.opening_hours or not str(tenant.opening_hours).strip():
        return None
    try:
        oh = json.loads(tenant.opening_hours)
    except (json.JSONDecodeError, TypeError):
        return None
    day_key = _DAY_NAMES[res_date.weekday()]
    day_hours = oh.get(day_key)
    if not isinstance(day_hours, dict):
        return []
    return _service_windows_from_day_hours(day_hours)


def _baseline_weekly_json(session: Session, tenant: models.Tenant, res_date: date) -> str | None:
    row = session.exec(
        select(models.OpeningHoursBaselineSchedule)
        .where(models.OpeningHoursBaselineSchedule.tenant_id == tenant.id)
        .where(models.OpeningHoursBaselineSchedule.effective_from <= res_date)
        .order_by(desc(models.OpeningHoursBaselineSchedule.effective_from))
    ).first()
    if row:
        return row.opening_hours
    return tenant.opening_hours


def _pick_override_for_date(
    session: Session, tenant_id: int, res_date: date
) -> models.OpeningHoursDateOverride | None:
    rows = session.exec(
        select(models.OpeningHoursDateOverride).where(
            models.OpeningHoursDateOverride.tenant_id == tenant_id,
            models.OpeningHoursDateOverride.date_from <= res_date,
            models.OpeningHoursDateOverride.date_to >= res_date,
        )
    ).all()
    if not rows:
        return None

    def span_days(r: models.OpeningHoursDateOverride) -> int:
        return (r.date_to - r.date_from).days

    rows.sort(key=lambda r: (span_days(r), -(r.id or 0)))
    return rows[0]


def _windows_from_weekly_json_str(weekly_json: str | None, res_date: date) -> List[Tuple[time, time]] | None:
    if weekly_json is None or not str(weekly_json).strip():
        return None
    try:
        oh = json.loads(weekly_json)
    except (json.JSONDecodeError, TypeError):
        return None
    day_key = _DAY_NAMES[res_date.weekday()]
    day_hours = oh.get(day_key)
    if not isinstance(day_hours, dict):
        return []
    return _service_windows_from_day_hours(day_hours)


def opening_service_windows_for_date(
    session: Session | None,
    tenant: models.Tenant,
    res_date: date,
) -> List[Tuple[time, time]] | None:
    """
    None = opening hours not configured (do not enforce).
    [] = closed.
    Else: list of (open, close) segments.
    """
    if session is None:
        return _legacy_windows_from_tenant_only(tenant, res_date)

    baseline = _baseline_weekly_json(session, tenant, res_date)
    override = _pick_override_for_date(session, tenant.id, res_date)
    weekly_source: str | None = baseline

    if override is not None:
        if override.closed:
            return []
        if override.opening_hours and str(override.opening_hours).strip():
            weekly_source = override.opening_hours
        else:
            weekly_source = baseline

    return _windows_from_weekly_json_str(weekly_source, res_date)


def effective_weekly_json_preview(
    session: Session | None,
    tenant: models.Tenant,
    res_date: date,
) -> str | None:
    """Weekly JSON string used for res_date after baseline + override (for UI preview). None if unset."""
    if session is None:
        return tenant.opening_hours if tenant.opening_hours and str(tenant.opening_hours).strip() else None

    baseline = _baseline_weekly_json(session, tenant, res_date)
    override = _pick_override_for_date(session, tenant.id, res_date)
    if override is not None:
        if override.closed:
            return None
        if override.opening_hours and str(override.opening_hours).strip():
            return override.opening_hours.strip()
    return baseline if baseline and str(baseline).strip() else None
