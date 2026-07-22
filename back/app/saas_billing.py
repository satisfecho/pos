"""
Platform SaaS billing / hard paywall for restaurant (tenant) signups.

Separate from per-tenant Stripe keys used for guest order payments.
"""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any

import stripe
from fastapi import HTTPException, status
from sqlmodel import Session, select

from . import models
from .settings import settings

SAAS_STATUS_NONE = "none"
SAAS_STATUS_TRIALING = "trialing"
SAAS_STATUS_ACTIVE = "active"
SAAS_STATUS_CANCELED = "canceled"
SAAS_STATUS_PAST_DUE = "past_due"
SAAS_STATUS_GRANDFATHERED = "grandfathered"

ACTIVE_STATUSES = frozenset(
    {
        SAAS_STATUS_TRIALING,
        SAAS_STATUS_ACTIVE,
        SAAS_STATUS_GRANDFATHERED,
    }
)

# API path prefixes that remain usable without a SaaS subscription
# (signup priming, auth, paywall itself, public guest flows).
SAAS_EXEMPT_PREFIXES = (
    "/health",
    "/docs",
    "/redoc",
    "/openapi.json",
    "/token",
    "/refresh",
    "/logout",
    "/register",
    "/onboarding",
    "/saas",
    "/password-reset",
    "/public",
    "/menu",
    "/book",
    "/waitlist",
    "/feedback",
    "/reservation",
    "/platform",
    "/provider",
    "/courier",
    "/uploads",
    "/products",  # guided signup seeds / photos before paywall
    "/users/me",
)


def paywall_enabled() -> bool:
    return bool(getattr(settings, "saas_paywall_enabled", False))


def initial_status_for_new_tenant() -> str:
    """New tenants need commitment when paywall is on; otherwise grandfather."""
    return SAAS_STATUS_NONE if paywall_enabled() else SAAS_STATUS_GRANDFATHERED


def _aware(dt: datetime | None) -> datetime | None:
    if dt is None:
        return None
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt


def tenant_has_saas_access(tenant: models.Tenant | None) -> bool:
    if not paywall_enabled():
        return True
    if tenant is None:
        return True
    status_val = (tenant.saas_subscription_status or SAAS_STATUS_NONE).strip().lower()
    if status_val == SAAS_STATUS_GRANDFATHERED:
        return True
    if status_val == SAAS_STATUS_ACTIVE:
        ends = _aware(tenant.saas_subscription_ends_at)
        if ends is None or ends > datetime.now(timezone.utc):
            return True
        return False
    if status_val == SAAS_STATUS_TRIALING:
        ends = _aware(tenant.saas_trial_ends_at)
        if ends is not None and ends > datetime.now(timezone.utc):
            return True
        return False
    return False


def path_is_saas_exempt(path: str) -> bool:
    """Return True if this API path may be called without SaaS entitlement."""
    # Strip optional ROOT_PATH mount (e.g. /api)
    root = (settings.root_path or "").rstrip("/")
    if root and path.startswith(root + "/"):
        path = path[len(root) :] or "/"
    elif root and path == root:
        path = "/"
    if not path.startswith("/"):
        path = "/" + path
    # Exact /users/me and nested otp under me
    if path == "/users/me" or path.startswith("/users/me/"):
        return True
    for prefix in SAAS_EXEMPT_PREFIXES:
        if path == prefix or path.startswith(prefix + "/"):
            return True
    return False


def ensure_tenant_saas_access(session: Session, tenant_id: int | None) -> None:
    if not paywall_enabled() or tenant_id is None:
        return
    tenant = session.get(models.Tenant, tenant_id)
    if tenant_has_saas_access(tenant):
        return
    raise HTTPException(
        status_code=status.HTTP_402_PAYMENT_REQUIRED,
        detail={
            "code": "saas_subscription_required",
            "message": "A subscription or free trial is required to use the staff app.",
        },
    )


def plan_config() -> dict[str, Any]:
    price_cents = int(getattr(settings, "saas_plan_price_cents", 4900) or 4900)
    trial_days = int(getattr(settings, "saas_trial_days", 14) or 14)
    currency = (getattr(settings, "saas_plan_currency", None) or "eur").lower()
    price_id = (getattr(settings, "saas_stripe_price_id", None) or "").strip()
    secret = (settings.stripe_secret_key or "").strip()
    return {
        "enabled": paywall_enabled(),
        "trial_days": trial_days,
        "price_cents": price_cents,
        "currency": currency,
        "stripe_checkout_available": bool(secret and price_id),
    }


def subscription_payload(tenant: models.Tenant) -> dict[str, Any]:
    cfg = plan_config()
    status_val = (tenant.saas_subscription_status or SAAS_STATUS_NONE).strip().lower()
    has_access = tenant_has_saas_access(tenant)
    return {
        **cfg,
        "status": status_val,
        "has_access": has_access,
        "trial_ends_at": tenant.saas_trial_ends_at.isoformat()
        if tenant.saas_trial_ends_at
        else None,
        "subscription_ends_at": tenant.saas_subscription_ends_at.isoformat()
        if tenant.saas_subscription_ends_at
        else None,
    }


def start_trial(session: Session, tenant: models.Tenant) -> models.Tenant:
    if not paywall_enabled():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"code": "paywall_disabled", "message": "SaaS paywall is not enabled."},
        )
    status_val = (tenant.saas_subscription_status or SAAS_STATUS_NONE).strip().lower()
    if status_val in (SAAS_STATUS_ACTIVE, SAAS_STATUS_GRANDFATHERED):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"code": "already_subscribed", "message": "Tenant already has access."},
        )
    if status_val == SAAS_STATUS_TRIALING and tenant_has_saas_access(tenant):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"code": "trial_already_active", "message": "Trial is already active."},
        )
    # One trial per tenant: do not restart after expiry
    if tenant.saas_trial_ends_at is not None and status_val == SAAS_STATUS_TRIALING:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "code": "trial_already_used",
                "message": "Free trial was already used. Please subscribe.",
            },
        )

    trial_days = int(getattr(settings, "saas_trial_days", 14) or 14)
    now = datetime.now(timezone.utc)
    tenant.saas_subscription_status = SAAS_STATUS_TRIALING
    tenant.saas_trial_ends_at = now + timedelta(days=trial_days)
    session.add(tenant)
    session.commit()
    session.refresh(tenant)
    return tenant


def create_checkout_session(
    session: Session,
    tenant: models.Tenant,
    user: models.User,
    success_url: str,
    cancel_url: str,
) -> str:
    cfg = plan_config()
    if not cfg["stripe_checkout_available"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "code": "stripe_not_configured",
                "message": "Platform Stripe is not configured for SaaS checkout.",
            },
        )
    price_id = settings.saas_stripe_price_id.strip()
    secret = settings.stripe_secret_key.strip()
    trial_days = int(cfg["trial_days"])

    # Offer trial in Checkout only if tenant has never started one.
    # Always attach tenant_id on the Subscription so billing webhooks can resolve the tenant.
    subscription_data: dict[str, Any] = {
        "metadata": {
            "tenant_id": str(tenant.id),
            "user_id": str(user.id),
        },
    }
    if tenant.saas_trial_ends_at is None and (
        (tenant.saas_subscription_status or "").lower()
        in (SAAS_STATUS_NONE, SAAS_STATUS_CANCELED, "")
    ):
        subscription_data["trial_period_days"] = trial_days

    try:
        params: dict[str, Any] = {
            "mode": "subscription",
            "line_items": [{"price": price_id, "quantity": 1}],
            "success_url": success_url,
            "cancel_url": cancel_url,
            "client_reference_id": str(tenant.id),
            "metadata": {
                "tenant_id": str(tenant.id),
                "user_id": str(user.id),
            },
            "subscription_data": subscription_data,
            "api_key": secret,
        }
        if user.email:
            params["customer_email"] = user.email
        checkout = stripe.checkout.Session.create(**params)
    except stripe.error.StripeError as e:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail={"code": "stripe_error", "message": str(e.user_message or e)},
        ) from e

    url = getattr(checkout, "url", None)
    if not url:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail={"code": "stripe_error", "message": "No checkout URL returned."},
        )
    return str(url)


def _stripe_status_to_saas(stripe_status: str | None) -> str | None:
    """Map Stripe Subscription.status to our saas_subscription_status, or None if ignored."""
    if not stripe_status:
        return None
    s = str(stripe_status).strip().lower()
    if s == "trialing":
        return SAAS_STATUS_TRIALING
    if s == "active":
        return SAAS_STATUS_ACTIVE
    if s == "past_due":
        return SAAS_STATUS_PAST_DUE
    if s in ("canceled", "unpaid", "incomplete_expired"):
        return SAAS_STATUS_CANCELED
    # incomplete / paused / etc. — do not invent a status
    return None


def _obj_get(obj: Any, key: str, default: Any = None) -> Any:
    if obj is None:
        return default
    if isinstance(obj, dict):
        return obj.get(key, default)
    return getattr(obj, key, default)


def apply_stripe_subscription_object(
    session: Session,
    tenant: models.Tenant,
    sub: Any,
    *,
    commit: bool = True,
) -> models.Tenant:
    """Sync tenant SaaS fields from a Stripe Subscription object (dict or StripeObject)."""
    # Never demote grandfathered tenants that never went through platform Checkout
    current = (tenant.saas_subscription_status or "").strip().lower()
    if current == SAAS_STATUS_GRANDFATHERED and not tenant.saas_stripe_subscription_id:
        return tenant

    sub_id = _obj_get(sub, "id")
    customer_id = _obj_get(sub, "customer")
    stripe_status = _obj_get(sub, "status")
    mapped = _stripe_status_to_saas(stripe_status)
    if mapped is None and stripe_status:
        # Unknown status: still store ids, leave status unchanged unless canceled via deleted
        mapped = None

    if sub_id:
        tenant.saas_stripe_subscription_id = str(sub_id)
    if customer_id:
        tenant.saas_stripe_customer_id = str(customer_id)

    if mapped is not None:
        tenant.saas_subscription_status = mapped

    trial_end = _obj_get(sub, "trial_end")
    if trial_end:
        tenant.saas_trial_ends_at = datetime.fromtimestamp(int(trial_end), tz=timezone.utc)

    period_end = _obj_get(sub, "current_period_end")
    if period_end:
        tenant.saas_subscription_ends_at = datetime.fromtimestamp(
            int(period_end), tz=timezone.utc
        )

    # Canceled subscriptions: clear period end access window if Stripe cancelled_at set
    if mapped == SAAS_STATUS_CANCELED:
        canceled_at = _obj_get(sub, "canceled_at") or _obj_get(sub, "ended_at")
        if canceled_at and not period_end:
            tenant.saas_subscription_ends_at = datetime.fromtimestamp(
                int(canceled_at), tz=timezone.utc
            )

    session.add(tenant)
    if commit:
        session.commit()
        session.refresh(tenant)
    return tenant


def find_tenant_for_stripe_subscription(
    session: Session,
    *,
    subscription_id: str | None = None,
    customer_id: str | None = None,
    tenant_id: int | None = None,
) -> models.Tenant | None:
    if tenant_id is not None:
        tenant = session.get(models.Tenant, tenant_id)
        if tenant:
            return tenant
    if subscription_id:
        tenant = session.exec(
            select(models.Tenant).where(
                models.Tenant.saas_stripe_subscription_id == str(subscription_id)
            )
        ).first()
        if tenant:
            return tenant
    if customer_id:
        tenant = session.exec(
            select(models.Tenant).where(
                models.Tenant.saas_stripe_customer_id == str(customer_id)
            )
        ).first()
        if tenant:
            return tenant
    return None


def apply_checkout_session_to_tenant(
    session: Session,
    tenant: models.Tenant,
    checkout: Any,
    *,
    secret: str | None = None,
) -> models.Tenant:
    """Apply a Checkout Session (retrieve or webhook) onto the tenant; optional Subscription fetch."""
    customer_id = _obj_get(checkout, "customer")
    subscription_id = _obj_get(checkout, "subscription")
    if customer_id:
        tenant.saas_stripe_customer_id = str(customer_id)
    if subscription_id:
        tenant.saas_stripe_subscription_id = str(subscription_id)

    # Default optimistic active until we see Subscription details
    tenant.saas_subscription_status = SAAS_STATUS_ACTIVE

    api_key = (secret or settings.stripe_secret_key or "").strip()
    sub_obj = None
    if subscription_id:
        # Expanded Subscription object (webhook) or retrieve by id (confirm-checkout)
        if hasattr(subscription_id, "status") or (
            isinstance(subscription_id, dict) and "status" in subscription_id
        ):
            sub_obj = subscription_id
        elif api_key:
            try:
                sub_obj = stripe.Subscription.retrieve(str(subscription_id), api_key=api_key)
            except stripe.error.StripeError:
                sub_obj = None

    if sub_obj is not None:
        return apply_stripe_subscription_object(session, tenant, sub_obj, commit=True)

    session.add(tenant)
    session.commit()
    session.refresh(tenant)
    return tenant


def confirm_checkout_session(session: Session, tenant: models.Tenant, session_id: str) -> models.Tenant:
    """Fast path after Checkout redirect; webhook remains source of truth for later lifecycle."""
    secret = (settings.stripe_secret_key or "").strip()
    if not secret:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"code": "stripe_not_configured", "message": "Platform Stripe is not configured."},
        )
    try:
        checkout = stripe.checkout.Session.retrieve(session_id, api_key=secret)
    except stripe.error.StripeError as e:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail={"code": "stripe_error", "message": str(e.user_message or e)},
        ) from e

    ref = str(_obj_get(checkout, "client_reference_id") or "")
    meta = _obj_get(checkout, "metadata") or {}
    meta_tid = ""
    if isinstance(meta, dict):
        meta_tid = str(meta.get("tenant_id") or "")
    if ref and ref != str(tenant.id) and meta_tid != str(tenant.id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"code": "checkout_tenant_mismatch", "message": "Checkout session does not match tenant."},
        )
    if _obj_get(checkout, "payment_status") not in ("paid", "no_payment_required"):
        # Subscription with trial may be no_payment_required
        if _obj_get(checkout, "status") != "complete":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={"code": "checkout_incomplete", "message": "Checkout is not complete."},
            )

    return apply_checkout_session_to_tenant(session, tenant, checkout, secret=secret)


def construct_saas_webhook_event(payload: bytes, sig_header: str) -> Any:
    """Verify Stripe signature and return the event. Raises HTTPException on failure."""
    wh_secret = (getattr(settings, "saas_stripe_webhook_secret", None) or "").strip()
    if not wh_secret:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail={
                "code": "webhook_not_configured",
                "message": "SAAS_STRIPE_WEBHOOK_SECRET is not configured.",
            },
        )
    if not sig_header:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"code": "missing_signature", "message": "Stripe-Signature header required."},
        )
    try:
        return stripe.Webhook.construct_event(payload, sig_header, wh_secret)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"code": "invalid_payload", "message": "Invalid webhook payload."},
        ) from e
    except stripe.error.SignatureVerificationError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"code": "invalid_signature", "message": "Webhook signature verification failed."},
        ) from e


def process_saas_stripe_event(session: Session, event: Any) -> dict[str, Any]:
    """
    Apply a verified Stripe event to tenant SaaS fields.

    Handles checkout.session.completed and customer.subscription.* lifecycle events.
    Returns a small result dict for logging/tests (no secrets).
    """
    event_type = str(_obj_get(event, "type") or "")
    data_object = _obj_get(_obj_get(event, "data"), "object") or {}

    if event_type == "checkout.session.completed":
        mode = str(_obj_get(data_object, "mode") or "")
        if mode and mode != "subscription":
            return {"handled": False, "reason": "not_subscription_checkout", "type": event_type}

        tid: int | None = None
        ref = str(_obj_get(data_object, "client_reference_id") or "").strip()
        meta = _obj_get(data_object, "metadata") or {}
        if ref.isdigit():
            tid = int(ref)
        elif isinstance(meta, dict) and str(meta.get("tenant_id") or "").isdigit():
            tid = int(str(meta.get("tenant_id")))

        sub_id = _obj_get(data_object, "subscription")
        cust_id = _obj_get(data_object, "customer")
        if hasattr(sub_id, "id"):
            sub_id = _obj_get(sub_id, "id")
        if hasattr(cust_id, "id"):
            cust_id = _obj_get(cust_id, "id")

        tenant = find_tenant_for_stripe_subscription(
            session,
            subscription_id=str(sub_id) if sub_id else None,
            customer_id=str(cust_id) if cust_id else None,
            tenant_id=tid,
        )
        if not tenant:
            return {"handled": False, "reason": "tenant_not_found", "type": event_type}

        apply_checkout_session_to_tenant(session, tenant, data_object)
        return {
            "handled": True,
            "type": event_type,
            "tenant_id": tenant.id,
            "status": tenant.saas_subscription_status,
        }

    if event_type.startswith("customer.subscription."):
        sub = data_object
        sub_id = _obj_get(sub, "id")
        cust_id = _obj_get(sub, "customer")
        meta = _obj_get(sub, "metadata") or {}
        tid = None
        if isinstance(meta, dict) and str(meta.get("tenant_id") or "").isdigit():
            tid = int(str(meta.get("tenant_id")))

        tenant = find_tenant_for_stripe_subscription(
            session,
            subscription_id=str(sub_id) if sub_id else None,
            customer_id=str(cust_id) if cust_id else None,
            tenant_id=tid,
        )
        if not tenant:
            return {"handled": False, "reason": "tenant_not_found", "type": event_type}

        if event_type == "customer.subscription.deleted":
            if isinstance(sub, dict):
                apply_stripe_subscription_object(
                    session, tenant, {**sub, "status": "canceled"}
                )
            else:
                apply_stripe_subscription_object(session, tenant, sub)
                if tenant.saas_subscription_status != SAAS_STATUS_CANCELED:
                    tenant.saas_subscription_status = SAAS_STATUS_CANCELED
                    session.add(tenant)
                    session.commit()
                    session.refresh(tenant)
        else:
            apply_stripe_subscription_object(session, tenant, sub)

        return {
            "handled": True,
            "type": event_type,
            "tenant_id": tenant.id,
            "status": tenant.saas_subscription_status,
        }

    return {"handled": False, "reason": "ignored_event_type", "type": event_type}
