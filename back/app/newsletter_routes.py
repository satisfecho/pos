"""Staff newsletter compose/send APIs + public open/click tracking (#435)."""

from __future__ import annotations

import logging
import secrets
from datetime import datetime, timezone
from typing import Annotated, Literal
from urllib.parse import unquote

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from pydantic import BaseModel, Field
from sqlalchemy import desc
from sqlmodel import Session, select

from app import models
from app.contact_validation import normalize_email_address
from app.db import get_session
from app.newsletter_html import (
    MAX_NEWSLETTER_BODY_LEN,
    MAX_NEWSLETTER_SUBJECT_LEN,
    PIXEL_GIF,
    is_safe_http_url,
    plain_fallback,
    wrap_newsletter_document,
)
from app import email_service as email_svc
from app.permissions import Permission, require_permission

logger = logging.getLogger(__name__)

router = APIRouter()
public_router = APIRouter()

AudienceSource = Literal["billing_customers", "reservations", "both"]


class NewsletterAudienceResponse(BaseModel):
    billing_customers: int
    reservations: int
    both: int
    sample_emails: list[str] = Field(default_factory=list)


class NewsletterCampaignCreate(BaseModel):
    subject: str = Field(min_length=1, max_length=MAX_NEWSLETTER_SUBJECT_LEN)
    body_html: str = Field(min_length=1, max_length=MAX_NEWSLETTER_BODY_LEN)
    body_text: str | None = Field(default=None, max_length=MAX_NEWSLETTER_BODY_LEN)
    audience_source: AudienceSource = "billing_customers"
    consent_confirmed: bool = False
    schedule_at: datetime | None = None
    send_now: bool = True


class NewsletterTestSend(BaseModel):
    subject: str = Field(min_length=1, max_length=MAX_NEWSLETTER_SUBJECT_LEN)
    body_html: str = Field(min_length=1, max_length=MAX_NEWSLETTER_BODY_LEN)
    body_text: str | None = Field(default=None, max_length=MAX_NEWSLETTER_BODY_LEN)
    to_email: str | None = Field(default=None, max_length=320)


class NewsletterCampaignPublic(BaseModel):
    id: int
    subject: str
    audience_source: str
    status: str
    schedule_at: str
    recipient_count: int
    sent_count: int
    failed_count: int
    open_count: int
    click_count: int
    error_message: str | None = None
    created_at: str
    updated_at: str


def _require_tenant(user: models.User) -> int:
    if user.tenant_id is None:
        raise HTTPException(status_code=400, detail="User has no tenant")
    return user.tenant_id


def _safe_norm_email(raw: str | None) -> str | None:
    try:
        return normalize_email_address(raw or "")
    except ValueError:
        return None


def _collect_audience_emails(
    session: Session, tenant_id: int, source: AudienceSource
) -> list[str]:
    emails: set[str] = set()
    if source in ("billing_customers", "both"):
        rows = session.exec(
            select(models.BillingCustomer.email).where(
                models.BillingCustomer.tenant_id == tenant_id,
                models.BillingCustomer.email.is_not(None),
            )
        ).all()
        for raw in rows:
            norm = _safe_norm_email(raw)
            if norm:
                emails.add(norm)
    if source in ("reservations", "both"):
        rows = session.exec(
            select(models.Reservation.customer_email).where(
                models.Reservation.tenant_id == tenant_id,
                models.Reservation.customer_email.is_not(None),
            )
        ).all()
        for raw in rows:
            norm = _safe_norm_email(raw)
            if norm:
                emails.add(norm)
    return sorted(emails)


def _campaign_public(c: models.NewsletterCampaign) -> NewsletterCampaignPublic:
    return NewsletterCampaignPublic(
        id=c.id or 0,
        subject=c.subject,
        audience_source=c.audience_source,
        status=c.status,
        schedule_at=c.schedule_at.isoformat() if c.schedule_at else "",
        recipient_count=c.recipient_count,
        sent_count=c.sent_count,
        failed_count=c.failed_count,
        open_count=c.open_count,
        click_count=c.click_count,
        error_message=c.error_message,
        created_at=c.created_at.isoformat() if c.created_at else "",
        updated_at=c.updated_at.isoformat() if c.updated_at else "",
    )


@router.get("/newsletter/audience", response_model=NewsletterAudienceResponse)
def newsletter_audience(
    session: Annotated[Session, Depends(get_session)],
    current_user: Annotated[models.User, Depends(require_permission(Permission.SETTINGS_READ))],
) -> NewsletterAudienceResponse:
    tenant_id = _require_tenant(current_user)
    billing = _collect_audience_emails(session, tenant_id, "billing_customers")
    reservations = _collect_audience_emails(session, tenant_id, "reservations")
    both = _collect_audience_emails(session, tenant_id, "both")
    sample = both[:5]
    return NewsletterAudienceResponse(
        billing_customers=len(billing),
        reservations=len(reservations),
        both=len(both),
        sample_emails=sample,
    )


@router.get("/newsletter/campaigns", response_model=list[NewsletterCampaignPublic])
def list_newsletter_campaigns(
    session: Annotated[Session, Depends(get_session)],
    current_user: Annotated[models.User, Depends(require_permission(Permission.SETTINGS_READ))],
    limit: int = Query(default=50, ge=1, le=100),
) -> list[NewsletterCampaignPublic]:
    tenant_id = _require_tenant(current_user)
    rows = session.exec(
        select(models.NewsletterCampaign)
        .where(models.NewsletterCampaign.tenant_id == tenant_id)
        .order_by(desc(models.NewsletterCampaign.created_at))
        .limit(limit)
    ).all()
    return [_campaign_public(c) for c in rows]


@router.get("/newsletter/campaigns/{campaign_id}", response_model=NewsletterCampaignPublic)
def get_newsletter_campaign(
    campaign_id: int,
    session: Annotated[Session, Depends(get_session)],
    current_user: Annotated[models.User, Depends(require_permission(Permission.SETTINGS_READ))],
) -> NewsletterCampaignPublic:
    tenant_id = _require_tenant(current_user)
    c = session.get(models.NewsletterCampaign, campaign_id)
    if c is None or c.tenant_id != tenant_id:
        raise HTTPException(status_code=404, detail="Campaign not found")
    return _campaign_public(c)


@router.post(
    "/newsletter/campaigns",
    response_model=NewsletterCampaignPublic,
    status_code=status.HTTP_201_CREATED,
)
def create_newsletter_campaign(
    body: NewsletterCampaignCreate,
    session: Annotated[Session, Depends(get_session)],
    current_user: Annotated[models.User, Depends(require_permission(Permission.SETTINGS_UPDATE))],
) -> NewsletterCampaignPublic:
    tenant_id = _require_tenant(current_user)
    if not body.consent_confirmed:
        raise HTTPException(
            status_code=400,
            detail="Confirm that recipients have opted in to marketing email (consent_confirmed).",
        )
    subject = body.subject.strip()
    body_html = body.body_html.strip()
    if not subject or not body_html:
        raise HTTPException(status_code=400, detail="Subject and body are required")

    tenant = session.get(models.Tenant, tenant_id)
    if tenant is None:
        raise HTTPException(status_code=404, detail="Tenant not found")
    if not email_svc.smtp_credentials_configured(tenant):
        raise HTTPException(
            status_code=400,
            detail="SMTP is not configured. Set credentials under Settings → Email.",
        )

    emails = _collect_audience_emails(session, tenant_id, body.audience_source)
    if not emails:
        raise HTTPException(status_code=400, detail="No recipient emails for the selected audience")

    now = datetime.now(timezone.utc)
    schedule_at = now if body.send_now else (body.schedule_at or now)
    if schedule_at.tzinfo is None:
        schedule_at = schedule_at.replace(tzinfo=timezone.utc)

    campaign = models.NewsletterCampaign(
        tenant_id=tenant_id,
        subject=subject,
        body_html=body_html,
        body_text=(body.body_text or "").strip() or None,
        audience_source=body.audience_source,
        status="queued",
        schedule_at=schedule_at,
        consent_confirmed=True,
        recipient_count=len(emails),
        created_by_user_id=current_user.id,
        created_at=now,
        updated_at=now,
    )
    session.add(campaign)
    session.flush()

    for email in emails:
        session.add(
            models.NewsletterRecipient(
                campaign_id=campaign.id,
                email=email,
                tracking_token=secrets.token_urlsafe(24),
                status="pending",
                created_at=now,
            )
        )
    session.commit()
    session.refresh(campaign)
    logger.info(
        "newsletter campaign created id=%s tenant_id=%s recipients=%s (emails not logged)",
        campaign.id,
        tenant_id,
        len(emails),
    )
    return _campaign_public(campaign)


@router.post("/newsletter/campaigns/{campaign_id}/cancel", response_model=NewsletterCampaignPublic)
def cancel_newsletter_campaign(
    campaign_id: int,
    session: Annotated[Session, Depends(get_session)],
    current_user: Annotated[models.User, Depends(require_permission(Permission.SETTINGS_UPDATE))],
) -> NewsletterCampaignPublic:
    tenant_id = _require_tenant(current_user)
    c = session.get(models.NewsletterCampaign, campaign_id)
    if c is None or c.tenant_id != tenant_id:
        raise HTTPException(status_code=404, detail="Campaign not found")
    if c.status not in ("queued", "sending"):
        raise HTTPException(status_code=400, detail="Only queued/sending campaigns can be cancelled")
    c.status = "cancelled"
    c.updated_at = datetime.now(timezone.utc)
    # Mark remaining pending as skipped
    pending = session.exec(
        select(models.NewsletterRecipient).where(
            models.NewsletterRecipient.campaign_id == c.id,
            models.NewsletterRecipient.status == "pending",
        )
    ).all()
    for r in pending:
        r.status = "skipped"
        session.add(r)
    session.add(c)
    session.commit()
    session.refresh(c)
    return _campaign_public(c)


@router.post("/newsletter/test-send")
async def newsletter_test_send(
    body: NewsletterTestSend,
    session: Annotated[Session, Depends(get_session)],
    current_user: Annotated[models.User, Depends(require_permission(Permission.SETTINGS_UPDATE))],
) -> dict:
    """Send one preview email immediately (does not create a campaign)."""
    tenant_id = _require_tenant(current_user)
    tenant = session.get(models.Tenant, tenant_id)
    if tenant is None:
        raise HTTPException(status_code=404, detail="Tenant not found")
    if not email_svc.smtp_credentials_configured(tenant):
        raise HTTPException(
            status_code=400,
            detail="SMTP is not configured. Set credentials under Settings → Email.",
        )
    to_raw = (body.to_email or current_user.email or "").strip()
    to_email = _safe_norm_email(to_raw)
    if not to_email:
        raise HTTPException(status_code=400, detail="Valid to_email required")

    token = secrets.token_urlsafe(24)
    html_doc = wrap_newsletter_document(
        body.body_html.strip(), tenant=tenant, tracking_token=token
    )
    text = plain_fallback(body.body_html, body.body_text)
    ok = await email_svc.send_email(
        to_email,
        body.subject.strip(),
        html_doc,
        text_content=text,
        tenant=tenant,
    )
    if not ok:
        raise HTTPException(status_code=502, detail="Failed to send test email (check SMTP)")
    return {"ok": True, "to_email": to_email}


@public_router.get("/public/newsletter/o/{token}")
def newsletter_open_pixel(
    token: str,
    session: Annotated[Session, Depends(get_session)],
) -> Response:
    """1x1 GIF open tracker — token only, no PII in URL."""
    tok = (token or "").strip()
    if not tok or len(tok) > 64:
        return Response(content=PIXEL_GIF, media_type="image/gif")
    recip = session.exec(
        select(models.NewsletterRecipient).where(
            models.NewsletterRecipient.tracking_token == tok
        )
    ).first()
    if recip is not None and recip.opened_at is None:
        now = datetime.now(timezone.utc)
        recip.opened_at = now
        session.add(recip)
        campaign = session.get(models.NewsletterCampaign, recip.campaign_id)
        if campaign is not None:
            campaign.open_count = int(campaign.open_count or 0) + 1
            campaign.updated_at = now
            session.add(campaign)
        try:
            session.commit()
        except Exception:
            session.rollback()
            logger.exception("newsletter open tracking commit failed")
    return Response(
        content=PIXEL_GIF,
        media_type="image/gif",
        headers={"Cache-Control": "no-store, no-cache, must-revalidate"},
    )


@public_router.get("/public/newsletter/c/{token}")
def newsletter_click_redirect(
    token: str,
    session: Annotated[Session, Depends(get_session)],
    u: str = Query(default=""),
) -> Response:
    """Click redirect — validates http(s) target; increments click counters."""
    from fastapi.responses import RedirectResponse

    target = unquote((u or "").strip())
    if not is_safe_http_url(target):
        raise HTTPException(status_code=400, detail="Invalid link")

    tok = (token or "").strip()
    if tok and len(tok) <= 64:
        recip = session.exec(
            select(models.NewsletterRecipient).where(
                models.NewsletterRecipient.tracking_token == tok
            )
        ).first()
        if recip is not None:
            now = datetime.now(timezone.utc)
            first_open = recip.opened_at is None
            recip.click_count = int(recip.click_count or 0) + 1
            if first_open:
                recip.opened_at = now
            session.add(recip)
            campaign = session.get(models.NewsletterCampaign, recip.campaign_id)
            if campaign is not None:
                campaign.click_count = int(campaign.click_count or 0) + 1
                if first_open:
                    campaign.open_count = int(campaign.open_count or 0) + 1
                campaign.updated_at = now
                session.add(campaign)
            try:
                session.commit()
            except Exception:
                session.rollback()
                logger.exception("newsletter click tracking commit failed")

    return RedirectResponse(url=target, status_code=302)
