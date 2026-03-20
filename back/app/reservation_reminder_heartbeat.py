"""
Autonomous reservation reminder heartbeat.

Runs inside the FastAPI process and periodically finds reservations due for
24h or 2h reminders (per tenant settings), sends email/WhatsApp, and marks
reminder_*_sent_at. No external cron required.
"""
import asyncio
import logging
from datetime import date, datetime, time, timedelta, timezone
from zoneinfo import ZoneInfo

from sqlmodel import Session, select

from . import models
from .db import engine
from . import email_service as email_svc
from . import whatsapp_service as whatsapp_svc
from .settings import settings

logger = logging.getLogger(__name__)

# How often the heartbeat runs (minutes)
HEARTBEAT_INTERVAL_MINUTES = 5

# Reminder windows: send when "now" (tenant TZ) falls in [target - window_end, target - window_start]
# e.g. 24h: send when now is between 24h30 and 23h30 before reservation (1h window)
REMINDER_24H_WINDOW_START_MINUTES = 30  # 24h - 30min before reservation
REMINDER_24H_WINDOW_END_MINUTES = 90    # 24h + 30min (window length 1h)
REMINDER_2H_WINDOW_START_MINUTES = 10   # 2h - 10min
REMINDER_2H_WINDOW_END_MINUTES = 30     # 2h + 10min (window length 20min)


def _tenant_now(tz_name: str | None) -> datetime:
    """Current time in tenant timezone (naive, for date/time comparison)."""
    if tz_name and tz_name.strip():
        try:
            tz = ZoneInfo(tz_name.strip())
            return datetime.now(tz).replace(tzinfo=None)
        except Exception:
            pass
    return datetime.utcnow().replace(tzinfo=None)


def _reservation_datetime_naive(reservation_date: date, reservation_time: time) -> datetime:
    """Combine reservation date and time into a naive datetime (tenant local)."""
    return datetime.combine(reservation_date, reservation_time)


def _due_for_24h_reminder(
    reservation_date: date,
    reservation_time: time,
    now_tenant: datetime,
) -> bool:
    """True if reservation is in the 24h-reminder window (23h–25h before)."""
    res_dt = _reservation_datetime_naive(reservation_date, reservation_time)
    target = res_dt - timedelta(hours=24)
    start = target - timedelta(minutes=REMINDER_24H_WINDOW_START_MINUTES)
    end = target + timedelta(minutes=REMINDER_24H_WINDOW_END_MINUTES)
    return start <= now_tenant < end


def _due_for_2h_reminder(
    reservation_date: date,
    reservation_time: time,
    now_tenant: datetime,
) -> bool:
    """True if reservation is in the 2h-reminder window (~1h50–2h10 before)."""
    res_dt = _reservation_datetime_naive(reservation_date, reservation_time)
    target = res_dt - timedelta(hours=2)
    start = target - timedelta(minutes=REMINDER_2H_WINDOW_START_MINUTES)
    end = target + timedelta(minutes=REMINDER_2H_WINDOW_END_MINUTES)
    return start <= now_tenant < end


def _collect_due_reminders(session: Session) -> list[tuple[models.Reservation, models.Tenant, str]]:
    """Returns list of (reservation, tenant, '24h'|'2h') that are due for a reminder."""
    tenants = session.exec(
        select(models.Tenant).where(
            (models.Tenant.reservation_reminder_24h_enabled == True)
            | (models.Tenant.reservation_reminder_2h_enabled == True)
        )
    ).all()
    out: list[tuple[models.Reservation, models.Tenant, str]] = []
    for tenant in tenants:
        now_tenant = _tenant_now(tenant.timezone)
        reservations = session.exec(
            select(models.Reservation).where(
                models.Reservation.tenant_id == tenant.id,
                models.Reservation.status == models.ReservationStatus.booked,
            )
        ).all()
        for r in reservations:
            if not r.reservation_date or not r.reservation_time:
                continue
            has_email = bool(r.customer_email and r.customer_email.strip())
            has_phone = bool(r.customer_phone and r.customer_phone.strip())
            whatsapp_ok = whatsapp_svc.is_whatsapp_configured()
            if not has_email and not (has_phone and whatsapp_ok):
                continue
            if (
                tenant.reservation_reminder_24h_enabled
                and r.reminder_24h_sent_at is None
                and _due_for_24h_reminder(r.reservation_date, r.reservation_time, now_tenant)
            ):
                out.append((r, tenant, "24h"))
            if (
                tenant.reservation_reminder_2h_enabled
                and r.reminder_2h_sent_at is None
                and _due_for_2h_reminder(r.reservation_date, r.reservation_time, now_tenant)
            ):
                out.append((r, tenant, "2h"))
    return out


async def _send_one_reminder(
    reservation: models.Reservation,
    tenant: models.Tenant,
) -> None:
    """Send email and/or WhatsApp for one reservation (same logic as POST send-reminder)."""
    has_email = bool(reservation.customer_email and reservation.customer_email.strip())
    has_phone = bool(reservation.customer_phone and reservation.customer_phone.strip())
    whatsapp_ok = whatsapp_svc.is_whatsapp_configured()
    tenant_name = tenant.name if tenant else "Restaurant"
    date_str = reservation.reservation_date.isoformat() if reservation.reservation_date else ""
    time_str = reservation.reservation_time.strftime("%H:%M") if reservation.reservation_time else ""
    default_country = settings.default_phone_country or "ES"
    view_url = None
    if reservation.token and settings.public_app_base_url:
        base = settings.public_app_base_url.rstrip("/")
        view_url = f"{base}/reservation?token={reservation.token}"

    if has_email:
        await email_svc.send_reservation_reminder(
            to_email=reservation.customer_email.strip(),
            customer_name=reservation.customer_name,
            reservation_date=date_str,
            reservation_time=time_str,
            party_size=reservation.party_size,
            tenant_name=tenant_name,
            view_url=view_url,
            tenant=tenant,
        )
    if has_phone and whatsapp_ok:
        await whatsapp_svc.send_reservation_reminder_whatsapp_async(
            to_phone=reservation.customer_phone.strip(),
            customer_name=reservation.customer_name,
            reservation_date=date_str,
            reservation_time=time_str,
            party_size=reservation.party_size,
            tenant_name=tenant_name,
            default_country=default_country,
        )


async def _tick_async() -> int:
    """One tick: get due reminders (sync DB), then send each (async) and update DB."""
    with Session(engine) as session:
        due = _collect_due_reminders(session)
        # Load full objects so we can use them after session closes
        due = [(r, tenant, kind) for r, tenant, kind in due]
    count = 0
    for reservation, tenant, kind in due:
        try:
            await _send_one_reminder(reservation, tenant)
        except Exception as e:
            logger.warning(
                "Reservation reminder heartbeat: failed to send %s for reservation id=%s: %s",
                kind,
                reservation.id,
                e,
                exc_info=True,
            )
            continue
        with Session(engine) as session:
            r = session.get(models.Reservation, reservation.id)
            if r:
                if kind == "24h":
                    r.reminder_24h_sent_at = datetime.now(timezone.utc)
                else:
                    r.reminder_2h_sent_at = datetime.now(timezone.utc)
                session.add(r)
                session.commit()
        count += 1
        logger.info(
            "Reservation reminder heartbeat: sent %s reminder for reservation id=%s tenant_id=%s",
            kind,
            reservation.id,
            tenant.id,
        )
    return count


async def reservation_reminder_heartbeat_loop(
    interval_minutes: int = HEARTBEAT_INTERVAL_MINUTES,
    stop: asyncio.Event | None = None,
) -> None:
    """
    Background loop: every interval_minutes, run one tick (find due reminders, send, update).
    Stops when stop is set.
    """
    stop_ev = stop or asyncio.Event()
    while not stop_ev.is_set():
        try:
            n = await _tick_async()
            if n > 0:
                logger.info("Reservation reminder heartbeat: sent %d reminder(s) this tick", n)
        except Exception as e:
            logger.warning(
                "Reservation reminder heartbeat tick failed: %s",
                e,
                exc_info=True,
            )
        try:
            await asyncio.wait_for(stop_ev.wait(), timeout=interval_minutes * 60.0)
        except asyncio.TimeoutError:
            pass  # interval elapsed, loop again
