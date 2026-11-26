"""Background worker: send queued platform feature digests (~30/min) (#453)."""

from __future__ import annotations

import asyncio
import logging
from datetime import datetime, timezone

from sqlmodel import Session, select

from app import email_service as email_svc
from app import feature_digest as digest_svc
from app import models
from app.db import engine
from app.newsletter_html import plain_fallback

logger = logging.getLogger(__name__)

SEND_INTERVAL_SECONDS = 2.0
TICK_IDLE_SECONDS = 5.0


def _finalize_if_done(session: Session, campaign: models.PlatformFeatureDigestCampaign) -> None:
    pending = session.exec(
        select(models.PlatformFeatureDigestRecipient).where(
            models.PlatformFeatureDigestRecipient.campaign_id == campaign.id,
            models.PlatformFeatureDigestRecipient.status == "pending",
        )
    ).first()
    if pending is not None:
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


def _pick_next(
    session: Session,
) -> tuple[models.PlatformFeatureDigestCampaign, models.PlatformFeatureDigestRecipient] | None:
    now = datetime.now(timezone.utc)
    campaigns = session.exec(
        select(models.PlatformFeatureDigestCampaign)
        .where(
            models.PlatformFeatureDigestCampaign.status.in_(("queued", "sending")),  # type: ignore[attr-defined]
            models.PlatformFeatureDigestCampaign.schedule_at <= now,
        )
        .order_by(models.PlatformFeatureDigestCampaign.schedule_at)
        .limit(20)
    ).all()
    for campaign in campaigns:
        recip = session.exec(
            select(models.PlatformFeatureDigestRecipient)
            .where(
                models.PlatformFeatureDigestRecipient.campaign_id == campaign.id,
                models.PlatformFeatureDigestRecipient.status == "pending",
            )
            .order_by(models.PlatformFeatureDigestRecipient.id)
            .limit(1)
        ).first()
        if recip is not None:
            return campaign, recip
        _finalize_if_done(session, campaign)
    return None


async def _send_one(
    session: Session,
    campaign: models.PlatformFeatureDigestCampaign,
    recip: models.PlatformFeatureDigestRecipient,
) -> None:
    now = datetime.now(timezone.utc)
    if campaign.status == "queued":
        campaign.status = "sending"
        campaign.updated_at = now
        session.add(campaign)
        session.commit()

    if not digest_svc.platform_smtp_configured(session):
        recip.status = "failed"
        recip.error_message = "Platform SMTP not configured"
        campaign.failed_count = int(campaign.failed_count or 0) + 1
        campaign.updated_at = now
        session.add(recip)
        session.add(campaign)
        session.commit()
        _finalize_if_done(session, campaign)
        return

    mail_row = digest_svc.get_or_create_mail_settings(session)
    lang = digest_svc.normalize_locale(mail_row.locale)

    unsub_token = ""
    if recip.user_id:
        user = session.get(models.User, recip.user_id)
        if user is not None:
            if not bool(getattr(user, "feature_digest_subscribed", True)):
                recip.status = "skipped"
                recip.error_message = "unsubscribed"
                campaign.updated_at = now
                # Do not count as failed; reduce effective pending by marking skipped
                session.add(recip)
                session.add(campaign)
                session.commit()
                _finalize_if_done(session, campaign)
                return
            unsub_token = digest_svc.ensure_unsub_token(user, session)

    unsub_href = digest_svc.unsubscribe_url(unsub_token) if unsub_token else "#"
    html_doc = digest_svc.wrap_digest_html(
        campaign.body_html, unsubscribe_href=unsub_href, lang=lang
    )
    text = plain_fallback(campaign.body_html, campaign.body_text)
    if unsub_token:
        text = f"{text}\n\nUnsubscribe: {unsub_href}"

    smtp_cfg = digest_svc.platform_smtp_config(session)
    ok = await email_svc.send_email(
        recip.email,
        campaign.subject,
        html_doc,
        text_content=text,
        smtp_cfg=smtp_cfg,
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
    _finalize_if_done(session, campaign)


async def feature_digest_worker_loop(*, stop: asyncio.Event) -> None:
    logger.info("Platform feature digest worker started (~30/min)")
    while not stop.is_set():
        try:
            with Session(engine) as session:
                picked = _pick_next(session)
                if picked is None:
                    await asyncio.wait(
                        [asyncio.create_task(stop.wait())],
                        timeout=TICK_IDLE_SECONDS,
                    )
                    continue
                campaign, recip = picked
                await _send_one(session, campaign, recip)
            await asyncio.wait(
                [asyncio.create_task(stop.wait())],
                timeout=SEND_INTERVAL_SECONDS,
            )
        except asyncio.CancelledError:
            raise
        except Exception:
            logger.exception("platform feature digest worker tick failed")
            await asyncio.wait(
                [asyncio.create_task(stop.wait())],
                timeout=TICK_IDLE_SECONDS,
            )
    logger.info("Platform feature digest worker stopped")
