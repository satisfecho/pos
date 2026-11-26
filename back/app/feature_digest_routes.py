"""Platform feature digest APIs + public unsubscribe (#453)."""

from __future__ import annotations

import html
import logging
from datetime import datetime, timezone
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import HTMLResponse
from pydantic import BaseModel, Field
from sqlmodel import Session, select

from app import feature_digest as digest_svc
from app import models
from app.db import get_session
from app.platform_routes import _require_platform_operator

logger = logging.getLogger(__name__)

router = APIRouter()
public_router = APIRouter()


class PlatformMailSettingsPublic(BaseModel):
    smtp_host: str | None = None
    smtp_port: int | None = None
    smtp_use_tls: bool | None = None
    smtp_user: str | None = None
    smtp_password_set: bool = False
    email_from: str | None = None
    email_from_name: str | None = None
    locale: str = "en"
    smtp_configured: bool = False
    updated_at: str | None = None


class PlatformMailSettingsUpdate(BaseModel):
    smtp_host: str | None = None
    smtp_port: int | None = Field(default=None, ge=1, le=65535)
    smtp_use_tls: bool | None = None
    smtp_user: str | None = None
    smtp_password: str | None = None  # omit or empty = leave unchanged; blank clear not supported (use space?)
    email_from: str | None = None
    email_from_name: str | None = None
    locale: str | None = None
    clear_smtp_password: bool = False


class FeatureDigestAudience(BaseModel):
    subscribed_owners: int
    sample_emails: list[str] = Field(default_factory=list)


class FeatureDigestCampaignCreate(BaseModel):
    subject: str = Field(min_length=1, max_length=digest_svc.MAX_SUBJECT_LEN)
    body_html: str = Field(min_length=1, max_length=digest_svc.MAX_BODY_LEN)
    body_text: str | None = Field(default=None, max_length=digest_svc.MAX_BODY_LEN)
    send_now: bool = True


class FeatureDigestCampaignPublic(BaseModel):
    id: int
    subject: str
    status: str
    schedule_at: str
    recipient_count: int
    sent_count: int
    failed_count: int
    error_message: str | None = None
    created_at: str
    updated_at: str


def _settings_public(session: Session, row: models.PlatformMailSettings) -> PlatformMailSettingsPublic:
    return PlatformMailSettingsPublic(
        smtp_host=row.smtp_host,
        smtp_port=row.smtp_port,
        smtp_use_tls=row.smtp_use_tls,
        smtp_user=row.smtp_user,
        smtp_password_set=bool((row.smtp_password or "").strip()),
        email_from=row.email_from,
        email_from_name=row.email_from_name,
        locale=digest_svc.normalize_locale(row.locale),
        smtp_configured=digest_svc.platform_smtp_configured(session),
        updated_at=row.updated_at.isoformat() if row.updated_at else None,
    )


def _campaign_public(c: models.PlatformFeatureDigestCampaign) -> FeatureDigestCampaignPublic:
    return FeatureDigestCampaignPublic(
        id=int(c.id or 0),
        subject=c.subject,
        status=c.status,
        schedule_at=c.schedule_at.isoformat() if c.schedule_at else "",
        recipient_count=int(c.recipient_count or 0),
        sent_count=int(c.sent_count or 0),
        failed_count=int(c.failed_count or 0),
        error_message=c.error_message,
        created_at=c.created_at.isoformat() if c.created_at else "",
        updated_at=c.updated_at.isoformat() if c.updated_at else "",
    )


@router.get("/feature-digest/settings", response_model=PlatformMailSettingsPublic)
def get_feature_digest_settings(
    session: Annotated[Session, Depends(get_session)],
    _: Annotated[models.User, Depends(_require_platform_operator)],
) -> PlatformMailSettingsPublic:
    row = digest_svc.get_or_create_mail_settings(session)
    return _settings_public(session, row)


@router.put("/feature-digest/settings", response_model=PlatformMailSettingsPublic)
def put_feature_digest_settings(
    body: PlatformMailSettingsUpdate,
    session: Annotated[Session, Depends(get_session)],
    _: Annotated[models.User, Depends(_require_platform_operator)],
) -> PlatformMailSettingsPublic:
    row = digest_svc.get_or_create_mail_settings(session)
    if body.smtp_host is not None:
        row.smtp_host = body.smtp_host.strip() or None
    if body.smtp_port is not None:
        row.smtp_port = body.smtp_port
    if body.smtp_use_tls is not None:
        row.smtp_use_tls = body.smtp_use_tls
    if body.smtp_user is not None:
        row.smtp_user = body.smtp_user.strip() or None
    if body.clear_smtp_password:
        row.smtp_password = None
    elif body.smtp_password is not None and body.smtp_password != "":
        row.smtp_password = body.smtp_password
    if body.email_from is not None:
        row.email_from = body.email_from.strip() or None
    if body.email_from_name is not None:
        row.email_from_name = body.email_from_name.strip() or None
    if body.locale is not None:
        row.locale = digest_svc.normalize_locale(body.locale)
    row.updated_at = datetime.now(timezone.utc)
    session.add(row)
    session.commit()
    session.refresh(row)
    return _settings_public(session, row)


@router.get("/feature-digest/audience", response_model=FeatureDigestAudience)
def get_feature_digest_audience(
    session: Annotated[Session, Depends(get_session)],
    _: Annotated[models.User, Depends(_require_platform_operator)],
) -> FeatureDigestAudience:
    owners = digest_svc.subscribed_owner_audience(session)
    samples = [u.email for u in owners[:5]]
    return FeatureDigestAudience(subscribed_owners=len(owners), sample_emails=samples)


@router.get("/feature-digest/campaigns", response_model=list[FeatureDigestCampaignPublic])
def list_feature_digest_campaigns(
    session: Annotated[Session, Depends(get_session)],
    _: Annotated[models.User, Depends(_require_platform_operator)],
) -> list[FeatureDigestCampaignPublic]:
    rows = session.exec(
        select(models.PlatformFeatureDigestCampaign)
        .order_by(models.PlatformFeatureDigestCampaign.id.desc())  # type: ignore[attr-defined]
        .limit(50)
    ).all()
    return [_campaign_public(c) for c in rows]


@router.post(
    "/feature-digest/campaigns",
    response_model=FeatureDigestCampaignPublic,
    status_code=status.HTTP_201_CREATED,
)
def create_feature_digest_campaign(
    body: FeatureDigestCampaignCreate,
    session: Annotated[Session, Depends(get_session)],
    current_user: Annotated[models.User, Depends(_require_platform_operator)],
) -> FeatureDigestCampaignPublic:
    if not digest_svc.platform_smtp_configured(session):
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Platform SMTP is not configured",
        )
    owners = digest_svc.subscribed_owner_audience(session)
    if not owners:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No subscribed verified owners to send to",
        )

    now = datetime.now(timezone.utc)
    campaign = models.PlatformFeatureDigestCampaign(
        subject=body.subject.strip(),
        body_html=body.body_html.strip(),
        body_text=(body.body_text.strip() if body.body_text else None),
        status="queued",
        schedule_at=now if body.send_now else now,
        recipient_count=len(owners),
        created_by_user_id=current_user.id,
        created_at=now,
        updated_at=now,
    )
    session.add(campaign)
    session.commit()
    session.refresh(campaign)

    for owner in owners:
        digest_svc.ensure_unsub_token(owner, session, commit=False)
        recip = models.PlatformFeatureDigestRecipient(
            campaign_id=int(campaign.id or 0),
            user_id=owner.id,
            email=owner.email,
            status="pending",
            created_at=now,
        )
        session.add(recip)
    session.commit()
    session.refresh(campaign)
    logger.info(
        "platform feature digest campaign queued id=%s recipients=%s",
        campaign.id,
        campaign.recipient_count,
    )
    return _campaign_public(campaign)


@public_router.get("/public/feature-digest/unsubscribe/{token}", response_class=HTMLResponse)
def public_feature_digest_unsubscribe(
    token: str,
    session: Annotated[Session, Depends(get_session)],
) -> HTMLResponse:
    ok = digest_svc.apply_unsubscribe(session, token)
    title = "Unsubscribed" if ok else "Link not found"
    if ok:
        msg = "You have been unsubscribed from the Satisfecho monthly feature digest. You will no longer receive these emails."
    else:
        msg = "This unsubscribe link is invalid or already used. If you still receive digests, contact support."
    body = f"""<!DOCTYPE html>
<html><head><meta charset="utf-8"/><title>{html.escape(title)}</title></head>
<body style="font-family:Arial,sans-serif;max-width:560px;margin:40px auto;padding:0 16px;color:#222;">
  <h1 style="font-size:1.35rem;">{html.escape(title)}</h1>
  <p>{html.escape(msg)}</p>
</body></html>
"""
    return HTMLResponse(content=body, status_code=200 if ok else 404)
