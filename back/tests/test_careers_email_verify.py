"""Careers public apply: email confirmation before store (#448)."""

import sys
import unittest
from pathlib import Path
from unittest.mock import AsyncMock, patch

from pg_client_mixin import PgClientTestCase

_ROOT = Path(__file__).resolve().parent.parent
if str(_ROOT) not in sys.path:
    sys.path.insert(0, str(_ROOT))

from app import models
from sqlmodel import select


class TestCareersEmailVerify(PgClientTestCase):
    def _enable_careers(self) -> models.Tenant:
        tenant = models.Tenant(name="Careers Verify Cafe", careers_enabled=True)
        self.session.add(tenant)
        self.session.commit()
        self.session.refresh(tenant)
        return tenant

    @patch("app.careers_verify.email_svc.send_careers_verification_email", new_callable=AsyncMock)
    @patch("app.careers_verify.email_svc.smtp_credentials_configured", return_value=True)
    @patch("app.careers_verify.generate_code", return_value="654321")
    def test_request_confirm_submit_and_reject_without_token(
        self, _gen, _smtp, mock_send
    ):
        mock_send.return_value = True
        tenant = self._enable_careers()
        tid = tenant.id
        email = "careers.verify@amvara.de"

        # Direct submit without token must fail (missing field → 422)
        r = self.client.post(
            f"/public/tenants/{tid}/careers/applications",
            data={
                "name": "No Token",
                "email": email,
                "phone": "+34911000111",
            },
        )
        self.assertIn(r.status_code, (400, 422), r.text)

        # Fake token → 400
        r = self.client.post(
            f"/public/tenants/{tid}/careers/applications",
            data={
                "name": "Bad Token",
                "email": email,
                "phone": "+34911000111",
                "submit_token": "not-a-real-token",
            },
        )
        self.assertEqual(r.status_code, 400, r.text)

        r = self.client.post(
            f"/public/tenants/{tid}/careers/applications/request-code",
            json={"email": email},
        )
        self.assertEqual(r.status_code, 200, r.text)
        body = r.json()
        self.assertTrue(body.get("ok"))
        self.assertTrue(body.get("email_sent"))
        mock_send.assert_called()
        self.assertEqual(mock_send.call_args.args[1], "654321")

        # Bad code
        r = self.client.post(
            f"/public/tenants/{tid}/careers/applications/confirm-code",
            json={"email": email, "code": "000000"},
        )
        self.assertEqual(r.status_code, 400, r.text)

        r = self.client.post(
            f"/public/tenants/{tid}/careers/applications/confirm-code",
            json={"email": email, "code": "654321"},
        )
        self.assertEqual(r.status_code, 200, r.text)
        token = r.json().get("submit_token")
        self.assertTrue(token)

        # No durable application yet
        apps = self.session.exec(
            select(models.CareerApplication).where(models.CareerApplication.tenant_id == tid)
        ).all()
        self.assertEqual(len(apps), 0)

        r = self.client.post(
            f"/public/tenants/{tid}/careers/applications",
            data={
                "name": "Verified Candidate",
                "email": email,
                "phone": "+34911000111",
                "message": "Hello",
                "submit_token": token,
            },
        )
        self.assertEqual(r.status_code, 200, r.text)
        self.assertTrue(r.json().get("ok"))
        self.assertIsNotNone(r.json().get("id"))

        # Token is one-time
        r = self.client.post(
            f"/public/tenants/{tid}/careers/applications",
            data={
                "name": "Reuse Token",
                "email": email,
                "phone": "+34911000111",
                "submit_token": token,
            },
        )
        self.assertEqual(r.status_code, 400, r.text)

    @patch("app.careers_verify.email_svc.smtp_credentials_configured", return_value=False)
    @patch("app.careers_verify.generate_code", return_value="111222")
    def test_dev_code_when_smtp_missing(self, _gen, _smtp):
        tenant = self._enable_careers()
        r = self.client.post(
            f"/public/tenants/{tenant.id}/careers/applications/request-code",
            json={"email": "careers.devcode@amvara.de"},
        )
        self.assertEqual(r.status_code, 200, r.text)
        body = r.json()
        self.assertFalse(body.get("email_sent"))
        self.assertEqual(body.get("dev_code"), "111222")


if __name__ == "__main__":
    unittest.main()
