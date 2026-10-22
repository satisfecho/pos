"""Newsletter campaigns: audience, consent gate, tracking (#435)."""

from __future__ import annotations

import unittest
from datetime import timedelta
from unittest.mock import AsyncMock, patch

from pg_client_mixin import PgClientTestCase

from app import models, security
from app.newsletter_html import is_safe_http_url, rewrite_links_for_tracking


def _bearer_headers(user: models.User) -> dict[str, str]:
    data = {
        "sub": user.email,
        "tenant_id": user.tenant_id,
        "provider_id": getattr(user, "provider_id", None),
        "token_version": user.token_version,
    }
    token = security.create_access_token(data, expires_delta=timedelta(minutes=30))
    return {"Authorization": f"Bearer {token}"}


class TestNewsletterHtml(unittest.TestCase):
    def test_safe_http_url(self):
        self.assertTrue(is_safe_http_url("https://example.org/menu"))
        self.assertFalse(is_safe_http_url("javascript:alert(1)"))
        self.assertFalse(is_safe_http_url("ftp://x"))

    def test_rewrite_links(self):
        html = '<p><a href="https://example.org/x">Go</a></p>'
        with patch("app.settings.settings") as s:
            s.public_app_base_url = "http://127.0.0.1:4202"
            s.root_path = ""
            out = rewrite_links_for_tracking(html, "tok123")
            self.assertIn("/public/newsletter/c/tok123", out)
            self.assertIn("example.org", out)
            unsafe = '<a href="javascript:alert(1)">x</a>'
            out2 = rewrite_links_for_tracking(unsafe, "tok123")
            self.assertIn("javascript:alert(1)", out2)


class TestNewsletterApi(PgClientTestCase):
    def setUp(self) -> None:
        super().setUp()
        tenant = models.Tenant(
            name="NL Test",
            smtp_host="smtp.test.local",
            smtp_port=587,
            smtp_user="nl@test.local",
            smtp_password="secret",
            email_from="nl@test.local",
        )
        self.session.add(tenant)
        self.session.commit()
        self.session.refresh(tenant)
        self.tenant_id = tenant.id

        self.owner = models.User(
            email="nl-owner@test.local",
            hashed_password=security.get_password_hash("secret"),
            full_name="Owner",
            tenant_id=self.tenant_id,
            role=models.UserRole.owner,
        )
        self.waiter = models.User(
            email="nl-waiter@test.local",
            hashed_password=security.get_password_hash("secret"),
            full_name="Waiter",
            tenant_id=self.tenant_id,
            role=models.UserRole.waiter,
        )
        self.session.add(self.owner)
        self.session.add(self.waiter)
        self.session.add(
            models.BillingCustomer(
                tenant_id=self.tenant_id,
                name="Guest A",
                email="guest-a@amvara.de",
            )
        )
        self.session.add(
            models.BillingCustomer(
                tenant_id=self.tenant_id,
                name="Guest B",
                email="guest-b@amvara.de",
            )
        )
        self.session.commit()
        self.session.refresh(self.owner)
        self.session.refresh(self.waiter)

    def test_waiter_forbidden(self):
        h = _bearer_headers(self.waiter)
        r = self.client.get("/tenant/newsletter/audience", headers=h)
        self.assertEqual(r.status_code, 403, r.text)

    def test_audience_counts(self):
        h = _bearer_headers(self.owner)
        r = self.client.get("/tenant/newsletter/audience", headers=h)
        self.assertEqual(r.status_code, 200, r.text)
        body = r.json()
        self.assertEqual(body["billing_customers"], 2)
        self.assertGreaterEqual(body["both"], 2)

    def test_create_requires_consent(self):
        h = _bearer_headers(self.owner)
        r = self.client.post(
            "/tenant/newsletter/campaigns",
            headers=h,
            json={
                "subject": "Hello",
                "body_html": "<p>Hi</p>",
                "audience_source": "billing_customers",
                "consent_confirmed": False,
                "send_now": True,
            },
        )
        self.assertEqual(r.status_code, 400, r.text)

    def test_create_campaign_queues_recipients(self):
        h = _bearer_headers(self.owner)
        r = self.client.post(
            "/tenant/newsletter/campaigns",
            headers=h,
            json={
                "subject": "Weekend special",
                "body_html": '<p>See <a href="https://example.org/menu">menu</a></p>',
                "audience_source": "billing_customers",
                "consent_confirmed": True,
                "send_now": True,
            },
        )
        self.assertEqual(r.status_code, 201, r.text)
        body = r.json()
        self.assertEqual(body["status"], "queued")
        self.assertEqual(body["recipient_count"], 2)

        listed = self.client.get("/tenant/newsletter/campaigns", headers=h)
        self.assertEqual(listed.status_code, 200)
        self.assertTrue(any(c["id"] == body["id"] for c in listed.json()))

    @patch("app.newsletter_routes.email_svc.send_email", new_callable=AsyncMock)
    def test_test_send(self, mock_send: AsyncMock):
        mock_send.return_value = True
        h = _bearer_headers(self.owner)
        r = self.client.post(
            "/tenant/newsletter/test-send",
            headers=h,
            json={
                "subject": "Test",
                "body_html": "<p>Preview</p>",
                "to_email": "ralf.roeber@amvara.de",
            },
        )
        self.assertEqual(r.status_code, 200, r.text)
        self.assertTrue(r.json()["ok"])
        mock_send.assert_awaited_once()

    def test_open_pixel_and_click(self):
        h = _bearer_headers(self.owner)
        created = self.client.post(
            "/tenant/newsletter/campaigns",
            headers=h,
            json={
                "subject": "Track me",
                "body_html": "<p>Hi</p>",
                "audience_source": "billing_customers",
                "consent_confirmed": True,
                "send_now": True,
            },
        )
        self.assertEqual(created.status_code, 201, created.text)
        cid = created.json()["id"]
        from sqlmodel import select

        recip = self.session.exec(
            select(models.NewsletterRecipient).where(
                models.NewsletterRecipient.campaign_id == cid
            )
        ).first()
        self.assertIsNotNone(recip)
        token = recip.tracking_token

        open_r = self.client.get(f"/public/newsletter/o/{token}")
        self.assertEqual(open_r.status_code, 200)
        self.assertEqual(open_r.headers.get("content-type"), "image/gif")

        self.session.refresh(recip)
        self.assertIsNotNone(recip.opened_at)

        click_r = self.client.get(
            f"/public/newsletter/c/{token}",
            params={"u": "https://example.org/ok"},
            follow_redirects=False,
        )
        self.assertEqual(click_r.status_code, 302)
        self.assertEqual(click_r.headers.get("location"), "https://example.org/ok")

        bad = self.client.get(
            f"/public/newsletter/c/{token}",
            params={"u": "javascript:alert(1)"},
            follow_redirects=False,
        )
        self.assertEqual(bad.status_code, 400)
