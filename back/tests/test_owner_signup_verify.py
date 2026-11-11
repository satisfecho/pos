"""Owner signup 6-digit email verification + login gate (#442)."""
import sys
import unittest
from pathlib import Path
from unittest.mock import AsyncMock, patch

from pg_client_mixin import PgClientTestCase

_ROOT = Path(__file__).resolve().parent.parent
if str(_ROOT) not in sys.path:
    sys.path.insert(0, str(_ROOT))

from app import models, owner_signup
from app.inactive_tenant_housekeeping import run_inactive_tenant_housekeeping
from datetime import datetime, timedelta, timezone
import asyncio


class TestOwnerSignupVerify(PgClientTestCase):
    @patch("app.owner_signup.email_svc.send_platform_owner_signup_notify", new_callable=AsyncMock)
    @patch("app.owner_signup.email_svc.send_owner_signup_verification_email", new_callable=AsyncMock)
    @patch("app.owner_signup.email_svc.smtp_credentials_configured", return_value=True)
    @patch("app.owner_signup.platform_operator_notify_email", return_value="platform-ops@amvara.de")
    @patch("app.owner_signup.generate_code", return_value="424242")
    def test_register_verify_login_and_bad_code(
        self, _gen, _notify_addr, _smtp, mock_send_code, mock_notify
    ):
        mock_send_code.return_value = True
        mock_notify.return_value = True
        stamp = datetime.now(timezone.utc).strftime("%Y%m%d%H%M%S%f")
        email = f"owner-verify-{stamp}@amvara.de"
        password = "secretpass1"

        r = self.client.post(
            "/register",
            params={
                "tenant_name": f"Verify Cafe {stamp}",
                "email": email,
                "password": password,
                "full_name": "Owner Verify",
                "address": "Street 1",
                "phone": "+491701234567",
            },
        )
        self.assertEqual(r.status_code, 201, r.text)
        body = r.json()
        self.assertFalse(body["email_verified"])
        self.assertTrue(body["verification_required"])
        self.assertTrue(body["verification_email_sent"])
        mock_send_code.assert_called()
        self.assertEqual(mock_send_code.call_args.args[1], "424242")

        # Login blocked until verified
        r = self.client.post(
            "/token",
            data={"username": email, "password": password},
        )
        self.assertEqual(r.status_code, 403, r.text)
        detail = r.json().get("detail") or {}
        if isinstance(detail, dict):
            self.assertEqual(detail.get("code"), "email_verification_required")

        # Wrong code
        r = self.client.post(
            "/register/verify-email",
            json={"email": email, "code": "000000"},
        )
        self.assertEqual(r.status_code, 400, r.text)

        # Good code
        r = self.client.post(
            "/register/verify-email",
            json={"email": email, "code": "424242"},
        )
        self.assertEqual(r.status_code, 200, r.text)
        self.assertTrue(r.json()["email_verified"])
        mock_notify.assert_called()

        r = self.client.post(
            "/token",
            data={"username": email, "password": password},
        )
        self.assertEqual(r.status_code, 200, r.text)

    @patch("app.owner_signup.email_svc.send_owner_signup_verification_email", new_callable=AsyncMock)
    @patch("app.owner_signup.email_svc.smtp_credentials_configured", return_value=True)
    @patch("app.owner_signup.generate_code", return_value="111222")
    def test_resend_verification(self, _gen, _smtp, mock_send):
        mock_send.return_value = True
        stamp = datetime.now(timezone.utc).strftime("%Y%m%d%H%M%S%f")
        email = f"owner-resend-{stamp}@amvara.de"
        r = self.client.post(
            "/register",
            params={
                "tenant_name": f"Resend Cafe {stamp}",
                "email": email,
                "password": "secretpass1",
                "full_name": "Resend Owner",
                "address": "Street 1",
                "phone": "+491701234567",
            },
        )
        self.assertEqual(r.status_code, 201, r.text)
        mock_send.reset_mock()
        r = self.client.post("/register/resend-verification", json={"email": email})
        self.assertEqual(r.status_code, 200, r.text)
        mock_send.assert_called_once()

    def test_inactive_housekeeping_warn_soft_hard(self):
        now = datetime.now(timezone.utc)
        tenant = models.Tenant(name="Inactive House Cafe", created_at=now - timedelta(days=40))
        self.session.add(tenant)
        self.session.commit()
        self.session.refresh(tenant)
        owner = models.User(
            email=f"inactive-house-{tenant.id}@amvara.de",
            hashed_password="x",
            role=models.UserRole.owner,
            tenant_id=tenant.id,
            email_verified=True,
            last_login_at=now - timedelta(days=40),
        )
        self.session.add(owner)
        self.session.commit()

        tid = tenant.id
        only = [tid]

        # Warn
        result = asyncio.run(
            run_inactive_tenant_housekeeping(
                self.session,
                dry_run=False,
                now=now,
                include_demo=True,
                send_emails=False,
                tenant_ids=only,
            )
        )
        self.assertIn(tid, result["warned"])
        self.session.refresh(tenant)
        self.assertIsNotNone(tenant.inactivity_warning_sent_at)

        # Soft-delete after grace
        later = now + timedelta(days=8)
        result = asyncio.run(
            run_inactive_tenant_housekeeping(
                self.session,
                dry_run=False,
                now=later,
                include_demo=True,
                send_emails=False,
                tenant_ids=only,
            )
        )
        self.assertIn(tid, result["soft_deleted"])
        self.session.refresh(tenant)
        self.assertIsNotNone(tenant.soft_deleted_at)
        self.assertIsNotNone(tenant.hard_delete_after)

        gate = owner_signup.owner_email_gate_blocks_login(self.session, owner)
        self.assertEqual(gate, "tenant_soft_deleted")

        # Hard-delete after 60 days from soft
        hard_time = later + timedelta(days=61)
        result = asyncio.run(
            run_inactive_tenant_housekeeping(
                self.session,
                dry_run=False,
                now=hard_time,
                include_demo=True,
                send_emails=False,
                tenant_ids=only,
            )
        )
        self.assertIn(tid, result["hard_deleted"])
        self.session.expire_all()
        gone = self.session.get(models.Tenant, tid)
        self.assertIsNone(gone)


if __name__ == "__main__":
    unittest.main()
