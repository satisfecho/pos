"""Tests for platform SaaS hard paywall (issue #296)."""

import time
import uuid
from datetime import datetime, timedelta, timezone
from unittest.mock import patch

import stripe
from fastapi import HTTPException
from fastapi.testclient import TestClient
from sqlmodel import Session

from app import models
from app.db import engine
from app.main import app
from app.saas_billing import (
    SAAS_STATUS_ACTIVE,
    SAAS_STATUS_CANCELED,
    SAAS_STATUS_GRANDFATHERED,
    SAAS_STATUS_NONE,
    SAAS_STATUS_PAST_DUE,
    SAAS_STATUS_TRIALING,
    construct_saas_webhook_event,
    initial_status_for_new_tenant,
    path_is_saas_exempt,
    process_saas_stripe_event,
    start_trial,
    tenant_has_saas_access,
)


def test_path_is_saas_exempt():
    assert path_is_saas_exempt("/saas/config")
    assert path_is_saas_exempt("/saas/webhook")
    assert path_is_saas_exempt("/users/me")
    assert path_is_saas_exempt("/onboarding/starter-products")
    assert path_is_saas_exempt("/products/1")
    assert path_is_saas_exempt("/token")
    assert not path_is_saas_exempt("/orders")
    assert not path_is_saas_exempt("/tables")
    assert not path_is_saas_exempt("/reports/sales")


def test_tenant_has_access_when_paywall_disabled():
    tenant = models.Tenant(name="X", saas_subscription_status=SAAS_STATUS_NONE)
    with patch("app.saas_billing.paywall_enabled", return_value=False):
        assert tenant_has_saas_access(tenant) is True


def test_tenant_none_blocked_when_paywall_on():
    tenant = models.Tenant(name="X", saas_subscription_status=SAAS_STATUS_NONE)
    with patch("app.saas_billing.paywall_enabled", return_value=True):
        assert tenant_has_saas_access(tenant) is False


def test_grandfathered_and_active_trial_allowed():
    with patch("app.saas_billing.paywall_enabled", return_value=True):
        g = models.Tenant(name="G", saas_subscription_status=SAAS_STATUS_GRANDFATHERED)
        assert tenant_has_saas_access(g) is True
        t = models.Tenant(
            name="T",
            saas_subscription_status=SAAS_STATUS_TRIALING,
            saas_trial_ends_at=datetime.now(timezone.utc) + timedelta(days=7),
        )
        assert tenant_has_saas_access(t) is True
        expired = models.Tenant(
            name="E",
            saas_subscription_status=SAAS_STATUS_TRIALING,
            saas_trial_ends_at=datetime.now(timezone.utc) - timedelta(days=1),
        )
        assert tenant_has_saas_access(expired) is False


def test_initial_status_depends_on_flag():
    with patch("app.saas_billing.paywall_enabled", return_value=True):
        assert initial_status_for_new_tenant() == SAAS_STATUS_NONE
    with patch("app.saas_billing.paywall_enabled", return_value=False):
        assert initial_status_for_new_tenant() == SAAS_STATUS_GRANDFATHERED


def test_start_trial_persists():
    with Session(engine) as session:
        tenant = models.Tenant(
            name=f"Paywall-{uuid.uuid4().hex[:8]}",
            saas_subscription_status=SAAS_STATUS_NONE,
        )
        session.add(tenant)
        session.commit()
        session.refresh(tenant)
        with patch("app.saas_billing.paywall_enabled", return_value=True):
            with patch("app.saas_billing.settings") as mock_settings:
                mock_settings.saas_trial_days = 14
                updated = start_trial(session, tenant)
        assert updated.saas_subscription_status == SAAS_STATUS_TRIALING
        assert updated.saas_trial_ends_at is not None
        with patch("app.saas_billing.paywall_enabled", return_value=True):
            assert tenant_has_saas_access(updated) is True


def test_webhook_past_due_without_confirm_checkout():
    """Cancel/past_due can be applied from webhook alone (no browser confirm)."""
    with Session(engine) as session:
        tenant = models.Tenant(
            name=f"WhPastDue-{uuid.uuid4().hex[:8]}",
            saas_subscription_status=SAAS_STATUS_ACTIVE,
            saas_stripe_customer_id=f"cus_{uuid.uuid4().hex[:10]}",
            saas_stripe_subscription_id=f"sub_{uuid.uuid4().hex[:10]}",
        )
        session.add(tenant)
        session.commit()
        session.refresh(tenant)
        sub_id = tenant.saas_stripe_subscription_id
        period_end = int(time.time()) + 86400
        event = {
            "id": f"evt_{uuid.uuid4().hex[:12]}",
            "type": "customer.subscription.updated",
            "data": {
                "object": {
                    "id": sub_id,
                    "object": "subscription",
                    "customer": tenant.saas_stripe_customer_id,
                    "status": "past_due",
                    "current_period_end": period_end,
                    "metadata": {"tenant_id": str(tenant.id)},
                }
            },
        }
        result = process_saas_stripe_event(session, event)
        assert result["handled"] is True
        assert result["status"] == SAAS_STATUS_PAST_DUE
        session.refresh(tenant)
        assert tenant.saas_subscription_status == SAAS_STATUS_PAST_DUE
        with patch("app.saas_billing.paywall_enabled", return_value=True):
            assert tenant_has_saas_access(tenant) is False


def test_webhook_subscription_deleted_cancels():
    with Session(engine) as session:
        tenant = models.Tenant(
            name=f"WhCancel-{uuid.uuid4().hex[:8]}",
            saas_subscription_status=SAAS_STATUS_ACTIVE,
            saas_stripe_subscription_id=f"sub_{uuid.uuid4().hex[:10]}",
            saas_stripe_customer_id=f"cus_{uuid.uuid4().hex[:10]}",
        )
        session.add(tenant)
        session.commit()
        session.refresh(tenant)
        event = {
            "id": f"evt_{uuid.uuid4().hex[:12]}",
            "type": "customer.subscription.deleted",
            "data": {
                "object": {
                    "id": tenant.saas_stripe_subscription_id,
                    "object": "subscription",
                    "customer": tenant.saas_stripe_customer_id,
                    "status": "canceled",
                    "canceled_at": int(time.time()),
                }
            },
        }
        result = process_saas_stripe_event(session, event)
        assert result["handled"] is True
        session.refresh(tenant)
        assert tenant.saas_subscription_status == SAAS_STATUS_CANCELED
        with patch("app.saas_billing.paywall_enabled", return_value=True):
            assert tenant_has_saas_access(tenant) is False


def test_webhook_checkout_completed_resolves_tenant_by_reference():
    with Session(engine) as session:
        tenant = models.Tenant(
            name=f"WhCheckout-{uuid.uuid4().hex[:8]}",
            saas_subscription_status=SAAS_STATUS_NONE,
        )
        session.add(tenant)
        session.commit()
        session.refresh(tenant)
        period_end = int(time.time()) + 30 * 86400
        event = {
            "id": f"evt_{uuid.uuid4().hex[:12]}",
            "type": "checkout.session.completed",
            "data": {
                "object": {
                    "id": f"cs_{uuid.uuid4().hex[:10]}",
                    "object": "checkout.session",
                    "mode": "subscription",
                    "status": "complete",
                    "payment_status": "paid",
                    "client_reference_id": str(tenant.id),
                    "customer": f"cus_{uuid.uuid4().hex[:10]}",
                    "subscription": {
                        "id": f"sub_{uuid.uuid4().hex[:10]}",
                        "object": "subscription",
                        "status": "active",
                        "current_period_end": period_end,
                        "metadata": {"tenant_id": str(tenant.id)},
                    },
                    "metadata": {"tenant_id": str(tenant.id)},
                }
            },
        }
        result = process_saas_stripe_event(session, event)
        assert result["handled"] is True
        session.refresh(tenant)
        assert tenant.saas_subscription_status == SAAS_STATUS_ACTIVE
        assert tenant.saas_stripe_subscription_id
        assert tenant.saas_stripe_customer_id
        with patch("app.saas_billing.paywall_enabled", return_value=True):
            assert tenant_has_saas_access(tenant) is True


def test_construct_webhook_rejects_bad_signature():
    with patch("app.saas_billing.settings") as mock_settings:
        mock_settings.saas_stripe_webhook_secret = "whsec_test_secret"
        try:
            construct_saas_webhook_event(b'{"id":"evt_x"}', "t=1,v1=bad")
            assert False, "expected HTTPException"
        except HTTPException as e:
            assert e.status_code == 400
            assert e.detail["code"] == "invalid_signature"


def test_construct_webhook_not_configured():
    with patch("app.saas_billing.settings") as mock_settings:
        mock_settings.saas_stripe_webhook_secret = ""
        try:
            construct_saas_webhook_event(b"{}", "t=1,v1=x")
            assert False, "expected HTTPException"
        except HTTPException as e:
            assert e.status_code == 503
            assert e.detail["code"] == "webhook_not_configured"


def test_webhook_route_signature_failure():
    """POST /saas/webhook returns 400 when signature verification fails."""
    with patch("app.saas_routes.construct_saas_webhook_event") as mock_construct:
        mock_construct.side_effect = HTTPException(
            status_code=400,
            detail={
                "code": "invalid_signature",
                "message": "Webhook signature verification failed.",
            },
        )
        with TestClient(app) as client:
            r = client.post(
                "/saas/webhook",
                content=b'{"type":"customer.subscription.updated"}',
                headers={"Stripe-Signature": "t=1,v1=bad"},
            )
        assert r.status_code == 400
        assert r.json()["detail"]["code"] == "invalid_signature"


def test_webhook_route_happy_path():
    with Session(engine) as session:
        tenant = models.Tenant(
            name=f"WhRoute-{uuid.uuid4().hex[:8]}",
            saas_subscription_status=SAAS_STATUS_ACTIVE,
            saas_stripe_subscription_id=f"sub_{uuid.uuid4().hex[:10]}",
            saas_stripe_customer_id=f"cus_{uuid.uuid4().hex[:10]}",
        )
        session.add(tenant)
        session.commit()
        session.refresh(tenant)
        tid = tenant.id
        sub_id = tenant.saas_stripe_subscription_id
        cust_id = tenant.saas_stripe_customer_id

    fake_event = {
        "id": f"evt_{uuid.uuid4().hex[:12]}",
        "type": "customer.subscription.updated",
        "data": {
            "object": {
                "id": sub_id,
                "object": "subscription",
                "customer": cust_id,
                "status": "past_due",
                "current_period_end": int(time.time()) + 86400,
            }
        },
    }

    with patch("app.saas_routes.construct_saas_webhook_event", return_value=fake_event):
        with TestClient(app) as client:
            r = client.post(
                "/saas/webhook",
                content=b"{}",
                headers={"Stripe-Signature": "t=1,v1=ok"},
            )
    assert r.status_code == 200
    body = r.json()
    assert body["received"] is True
    assert body["handled"] is True
    assert body["status"] == SAAS_STATUS_PAST_DUE

    with Session(engine) as session:
        t = session.get(models.Tenant, tid)
        assert t is not None
        assert t.saas_subscription_status == SAAS_STATUS_PAST_DUE


def test_construct_webhook_valid_signature_roundtrip():
    """Generate a real Stripe-signed payload and verify construct accepts it."""
    secret = "whsec_test_valid_signature_secret"
    payload = (
        b'{"id":"evt_test","object":"event","type":"customer.subscription.updated",'
        b'"data":{"object":{}}}'
    )
    timestamp = int(time.time())
    signed = stripe.WebhookSignature._compute_signature(  # noqa: SLF001
        f"{timestamp}.{payload.decode('utf-8')}", secret
    )
    header = f"t={timestamp},v1={signed}"
    with patch("app.saas_billing.settings") as mock_settings:
        mock_settings.saas_stripe_webhook_secret = secret
        event = construct_saas_webhook_event(payload, header)
    assert event["type"] == "customer.subscription.updated"
