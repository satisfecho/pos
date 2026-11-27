"""Platform monthly feature digest (#453)."""

from __future__ import annotations

import unittest
from datetime import timedelta
from unittest.mock import AsyncMock, patch

from pg_client_mixin import PgClientTestCase

from app import feature_digest as digest_svc
from app import models, security


def _platform_headers(user: models.User) -> dict[str, str]:
    data = {
        "sub": user.email,
        "tenant_id": None,
        "provider_id": None,
        "token_version": user.token_version,
        "is_platform_operator": True,
    }
    token = security.create_access_token(data, expires_delta=timedelta(minutes=30))
    return {"Authorization": f"Bearer {token}"}


class TestFeatureDigestHelpers(unittest.TestCase):
    def test_normalize_locale(self):
        self.assertEqual(digest_svc.normalize_locale("en"), "en")
        self.assertEqual(digest_svc.normalize_locale("xx"), "en")
        self.assertEqual(digest_svc.normalize_locale("de"), "de")

    def test_wrap_includes_unsubscribe(self):
        html = digest_svc.wrap_digest_html(
            "<p>Hello</p>", unsubscribe_href="https://satisfecho.de/public/feature-digest/unsubscribe/tok"
        )
        self.assertIn("unsubscribe/tok", html)
        self.assertIn("Hello", html)


class TestFeatureDigestApi(PgClientTestCase):
    def setUp(self) -> None:
        super().setUp()
        self.operator = models.User(
            email="platform-digest-ops@amvara.de",
            hashed_password=security.get_password_hash("secret"),
            full_name="Ops",
            role=models.UserRole.platform_operator,
            tenant_id=None,
            provider_id=None,
            email_verified=True,
        )
        self.session.add(self.operator)

        tenant = models.Tenant(name="Digest Cafe")
        self.session.add(tenant)
        self.session.commit()
        self.session.refresh(tenant)

        self.owner = models.User(
            email="digest-owner@amvara.de",
            hashed_password=security.get_password_hash("secret"),
            full_name="Owner",
            tenant_id=tenant.id,
            role=models.UserRole.owner,
            email_verified=True,
            feature_digest_subscribed=True,
        )
        self.session.add(self.owner)
        self.session.commit()
        self.session.refresh(self.owner)
        self.session.refresh(self.operator)

    def test_settings_and_audience(self):
        h = _platform_headers(self.operator)
        r = self.client.get("/platform/feature-digest/settings", headers=h)
        self.assertEqual(r.status_code, 200, r.text)
        self.assertEqual(r.json().get("locale"), "en")

        r = self.client.put(
            "/platform/feature-digest/settings",
            headers=h,
            json={
                "locale": "es",
                "smtp_host": "smtp.test.local",
                "smtp_port": 587,
                "smtp_use_tls": True,
                "smtp_user": "platform@amvara.de",
                "smtp_password": "secret",
                "email_from": "platform@amvara.de",
                "email_from_name": "Satisfecho",
            },
        )
        self.assertEqual(r.status_code, 200, r.text)
        body = r.json()
        self.assertEqual(body["locale"], "es")
        self.assertTrue(body["smtp_password_set"])
        self.assertTrue(body["smtp_configured"])
        self.assertNotIn("smtp_password", body)

        r = self.client.get("/platform/feature-digest/audience", headers=h)
        self.assertEqual(r.status_code, 200, r.text)
        self.assertGreaterEqual(r.json()["subscribed_owners"], 1)

    def test_unsubscribe(self):
        token = digest_svc.ensure_unsub_token(self.owner, self.session)
        r = self.client.get(f"/public/feature-digest/unsubscribe/{token}")
        self.assertEqual(r.status_code, 200, r.text)
        self.session.refresh(self.owner)
        self.assertFalse(self.owner.feature_digest_subscribed)

        r = self.client.get("/public/feature-digest/unsubscribe/not-a-real-token")
        self.assertEqual(r.status_code, 404)

    @patch("app.email_service.send_email", new_callable=AsyncMock)
    def test_queue_campaign(self, mock_send):
        mock_send.return_value = True
        h = _platform_headers(self.operator)
        self.client.put(
            "/platform/feature-digest/settings",
            headers=h,
            json={
                "smtp_user": "platform@amvara.de",
                "smtp_password": "secret",
                "email_from": "platform@amvara.de",
            },
        )
        r = self.client.post(
            "/platform/feature-digest/campaigns",
            headers=h,
            json={
                "subject": "What is new",
                "body_html": "<p>New kitchen SLA</p>",
                "send_now": True,
            },
        )
        self.assertEqual(r.status_code, 201, r.text)
        self.assertEqual(r.json()["status"], "queued")
        self.assertGreaterEqual(r.json()["recipient_count"], 1)
