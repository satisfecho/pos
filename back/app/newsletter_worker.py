"""Background worker: send queued newsletter recipients at ~30 messages/minute (#435)."""

from __future__ import annotations

import asyncio
import logging
from datetime import datetime, timezone

from sqlmodel import Session, select

from app import email_service as email_svc
from app import models
from app.db import engine
from app.newsletter_html import plain_fallback, wrap_newsletter_document

logger = logging.getLogger(__name__)

# 30 messages per minute ≈ 2 seconds between sends
SEND_INTERVAL_SECONDS = 2.0
TICK_IDLE_SECONDS = 5.0


def _finalize_if_done(session: Session, campaign: models.NewsletterCampaign) -> None:
    pending = session.exec(
        select(models.NewsletterRecipient).where(
            models.NewsletterRecipient.campaign_id == campaign.id,
            models.NewsletterRecipient.status == "pending",
        )
    ).first()
    if pending is not None:
        return
    if campaign.status == "cancelled":
        return
    now = datetime.now(timezone.utc)
    if int(campaign.failed_count or 0) > 0 and int(campaign.sent_count or 0) == 0:
        campaign.status = "failed"
        campaign.error_message = campaign.error_message or "All recipients failed"
    else:
        campaign.status = "sent"
        if int(campaign.failed_count or 0) == 0:
            campaign.error_message = None
    campaign.updated_at = now
    session.add(campaign)
    session.commit()


def _pick_next_recipient(session: Session) -> tuple[models.NewsletterCampaign, models.NewsletterRecipient] | None:
    now = datetime.now(timezone.utc)
    campaigns = session.exec(
        select(models.NewsletterCampaign)
        .where(
            models.NewsletterCampaign.status.in_(("queued", "sending")),  # type: ignore[attr-defined]
            models.NewsletterCampaign.schedule_at <= now,
        )
        .order_by(models.NewsletterCampaign.schedule_at)
        .limit(20)
    ).all()
    for campaign in campaigns:
        recip = session.exec(
            select(models.NewsletterRecipient)
            .where(
                models.NewsletterRecipient.campaign_id == campaign.id,
                models.NewsletterRecipient.status == "pending",
            )
            .order_by(models.NewsletterRecipient.id)
            .limit(1)
        ).first()
        if recip is not None:
            return campaign, recip
        _finalize_if_done(session, campaign)
    return None


async def _send_one(
    session: Session,
    campaign: models.NewsletterCampaign,
    recip: models.NewsletterRecipient,
) -> None:
    now = datetime.now(timezone.utc)
    if campaign.status == "queued":
        campaign.status = "sending"
        campaign.updated_at = now
        session.add(campaign)
        session.commit()

    tenant = session.get(models.Tenant, campaign.tenant_id)
    if tenant is None or not email_svc.smtp_credentials_configured(tenant):
        recip.status = "failed"
        recip.error_message = "SMTP not configured"
        campaign.failed_count = int(campaign.failed_count or 0) + 1
        campaign.updated_at = now
        session.add(recip)
        session.add(campaign)
        session.commit()
        _finalize_if_done(session, campaign)
        return

    html_doc = wrap_newsletter_document(
        campaign.body_html,
        tenant=tenant,
        tracking_token=recip.tracking_token,
    )
    text = plain_fallback(campaign.body_html, campaign.body_text)
    ok = await email_svc.send_email(
        recip.email,
        campaign.subject,
        html_doc,
        text_content=text,
        tenant=tenant,
    )
    now = datetime.now(timezone.utc)
    if ok:
        recip.status = "sent"
        recip.sent_at = now
        campaign.sent_count = int(campaign.sent_count or 0) + 1
    else:
        recip.status = "failed"
        recip.error_message = "SMTP send failed"
        campaign.failed_count = int(campaign.failed_count or 0) + 1
    campaign.updated_at = now
    session.add(recip)
    session.add(campaign)
    session.commit()
    # Do not log recipient email
    logger.info(
        "newsletter send campaign_id=%s recipient_id=%s ok=%s",
        campaign.id,
        recip.id,
        ok,
    )
    _finalize_if_done(session, campaign)


async def newsletter_worker_loop(*, stop: asyncio.Event) -> None:
    logger.info(
        "Newsletter worker started (interval=%.1fs, ~%d/min)",
        SEND_INTERVAL_SECONDS,
        int(60 / SEND_INTERVAL_SECONDS),
    )
    while not stop.is_set():
        try:
            with Session(engine) as session:
                picked = _pick_next_recipient(session)
                if picked is None:
                    try:
                        await asyncio.wait_for(stop.wait(), timeout=TICK_IDLE_SECONDS)
                    except asyncio.TimeoutError:
                        pass
                    continue
                campaign, recip = picked
                await _send_one(session, campaign, recip)
            try:
                await asyncio.wait_for(stop.wait(), timeout=SEND_INTERVAL_SECONDS)
            except asyncio.TimeoutError:
                pass
        except asyncio.CancelledError:
            raise
        except Exception:
            logger.exception("newsletter worker tick failed")
            try:
                await asyncio.wait_for(stop.wait(), timeout=TICK_IDLE_SECONDS)
            except asyncio.TimeoutError:
                pass
    logger.info("Newsletter worker stopped")
