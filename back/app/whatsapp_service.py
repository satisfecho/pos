"""
WhatsApp sending via Twilio for reservation reminders.
Uses Twilio REST API; when configured, reminders can be sent via WhatsApp when customer_phone is present.
"""

import asyncio
import logging
from typing import TYPE_CHECKING, Optional

import requests

from .phone_utils import normalize_phone_to_e164
from .settings import settings

if TYPE_CHECKING:
    from .models import Tenant

logger = logging.getLogger(__name__)


def _whatsapp_configured() -> bool:
    return bool(
        settings.twilio_account_sid
        and settings.twilio_auth_token
        and settings.twilio_whatsapp_from
    )


def _from_number() -> str:
    """Twilio WhatsApp 'From' must be whatsapp:+1234567890."""
    raw = settings.twilio_whatsapp_from.strip()
    if not raw.startswith("whatsapp:"):
        raw = ("whatsapp:" + raw) if raw.startswith("+") else ("whatsapp:+" + raw)
    return raw


def _to_number(e164: str) -> str:
    if e164.startswith("whatsapp:"):
        return e164
    return "whatsapp:" + e164 if e164.startswith("+") else "whatsapp:+" + e164


def send_reservation_reminder_whatsapp(
    to_phone: str,
    customer_name: str,
    reservation_date: str,
    reservation_time: str,
    party_size: int,
    tenant_name: str,
    default_country: str = "ES",
) -> bool:
    """
    Send a reservation reminder via Twilio WhatsApp.
    Uses a plain text body; for production you may need a pre-approved template (ContentSid).

    Returns True if sent successfully, False otherwise.
    """
    if not _whatsapp_configured():
        logger.warning("WhatsApp (Twilio) not configured; skipping WhatsApp reminder")
        return False

    e164 = normalize_phone_to_e164(to_phone, default_country=default_country)
    if not e164:
        logger.warning("Could not normalize phone to E.164: %s", to_phone[:20])
        return False

    body = (
        f"Hi {customer_name}, reminder: your reservation at {tenant_name} "
        f"on {reservation_date} at {reservation_time}, party of {party_size}. See you soon!"
    )

    url = (
        f"https://api.twilio.com/2010-04-01/Accounts/{settings.twilio_account_sid}/Messages.json"
    )
    auth = (settings.twilio_account_sid, settings.twilio_auth_token)
    data = {
        "From": _from_number(),
        "To": _to_number(e164),
        "Body": body,
    }

    try:
        resp = requests.post(url, auth=auth, data=data, timeout=15)
        if resp.status_code in (200, 201):
            logger.info("WhatsApp reminder sent to %s", e164)
            return True
        logger.error(
            "Twilio WhatsApp send failed: %s %s",
            resp.status_code,
            resp.text[:500],
        )
        return False
    except Exception as e:
        logger.exception("WhatsApp send error: %s", e)
        return False


async def send_reservation_reminder_whatsapp_async(
    to_phone: str,
    customer_name: str,
    reservation_date: str,
    reservation_time: str,
    party_size: int,
    tenant_name: str,
    default_country: str = "ES",
) -> bool:
    """Async wrapper: runs sync Twilio request in thread so it doesn't block the event loop."""
    return await asyncio.to_thread(
        send_reservation_reminder_whatsapp,
        to_phone,
        customer_name,
        reservation_date,
        reservation_time,
        party_size,
        tenant_name,
        default_country,
    )


def is_whatsapp_configured() -> bool:
    """Public helper for endpoints to decide whether to attempt WhatsApp send."""
    return _whatsapp_configured()
