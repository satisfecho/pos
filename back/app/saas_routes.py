"""Platform SaaS subscription / hard-paywall API for restaurant tenants."""

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel, Field
from sqlmodel import Session

from . import models
from .db import get_session
from .saas_billing import (
    confirm_checkout_session,
    construct_saas_webhook_event,
    create_checkout_session,
    plan_config,
    process_saas_stripe_event,
    start_trial,
    subscription_payload,
)
from .security import get_current_user

router = APIRouter()


class CheckoutBody(BaseModel):
    success_url: str = Field(min_length=8, max_length=2048)
    cancel_url: str = Field(min_length=8, max_length=2048)


class ConfirmCheckoutBody(BaseModel):
    session_id: str = Field(min_length=8, max_length=255)


def _require_tenant_owner(
    current_user: Annotated[models.User, Depends(get_current_user)],
) -> models.User:
    if current_user.tenant_id is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Restaurant account required",
        )
    if current_user.role not in (models.UserRole.owner, models.UserRole.admin):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only owner or admin can manage subscription",
        )
    return current_user


@router.get("/config")
def saas_config() -> dict:
    """Public plan defaults (used by signup / paywall UI)."""
    return plan_config()


@router.get("/subscription")
def get_subscription(
    current_user: Annotated[models.User, Depends(get_current_user)],
    session: Session = Depends(get_session),
) -> dict:
    if current_user.tenant_id is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Restaurant account required",
        )
    tenant = session.get(models.Tenant, current_user.tenant_id)
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")
    return subscription_payload(tenant)


@router.post("/start-trial")
def post_start_trial(
    current_user: Annotated[models.User, Depends(_require_tenant_owner)],
    session: Session = Depends(get_session),
) -> dict:
    tenant = session.get(models.Tenant, current_user.tenant_id)
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")
    tenant = start_trial(session, tenant)
    return subscription_payload(tenant)


@router.post("/checkout-session")
def post_checkout_session(
    body: CheckoutBody,
    current_user: Annotated[models.User, Depends(_require_tenant_owner)],
    session: Session = Depends(get_session),
) -> dict:
    tenant = session.get(models.Tenant, current_user.tenant_id)
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")
    url = create_checkout_session(
        session,
        tenant,
        current_user,
        success_url=body.success_url.strip(),
        cancel_url=body.cancel_url.strip(),
    )
    return {"url": url}


@router.post("/confirm-checkout")
def post_confirm_checkout(
    body: ConfirmCheckoutBody,
    current_user: Annotated[models.User, Depends(_require_tenant_owner)],
    session: Session = Depends(get_session),
) -> dict:
    tenant = session.get(models.Tenant, current_user.tenant_id)
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")
    tenant = confirm_checkout_session(session, tenant, body.session_id.strip())
    return subscription_payload(tenant)


@router.post("/webhook")
async def saas_stripe_webhook(
    request: Request,
    session: Session = Depends(get_session),
) -> dict:
    """
    Stripe billing webhook for platform SaaS subscriptions.

    Verifies Stripe-Signature with SAAS_STRIPE_WEBHOOK_SECRET.
    Syncs cancel / past_due / renewals without relying on confirm-checkout.
    """
    payload = await request.body()
    sig = request.headers.get("stripe-signature") or request.headers.get("Stripe-Signature") or ""
    event = construct_saas_webhook_event(payload, sig)
    result = process_saas_stripe_event(session, event)
    return {"received": True, **result}
