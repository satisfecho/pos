"""SVG logo upload sanitization and hardened /uploads serve headers (#419)."""
from __future__ import annotations

import io
import shutil
import unittest
from datetime import timedelta
from pathlib import Path

from pg_client_mixin import PgClientTestCase

from app import models, security
from app.main import UPLOADS_DIR
from app.svg_sanitize import SvgSanitizeError, sanitize_svg


def _bearer_headers(user: models.User) -> dict[str, str]:
    data = {
        "sub": user.email,
        "tenant_id": user.tenant_id,
        "provider_id": getattr(user, "provider_id", None),
        "token_version": user.token_version,
    }
    token = security.create_access_token(data, expires_delta=timedelta(minutes=30))
    return {"Authorization": f"Bearer {token}"}


_SAFE_SVG = (
    b'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1 1">'
    b'<rect width="1" height="1" fill="#333"/></svg>'
)
# Minimal fixture: blocked element present (no runnable payload in repo text).
_UNSAFE_SVG = (
    b'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1 1">'
    b"<script>x</script>"
    b'<rect width="1" height="1" fill="#333"/></svg>'
)
_EVENT_SVG = (
    b'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1 1">'
    b'<rect width="1" height="1" fill="#333" onload="x"/></svg>'
)


class TestSvgSanitizeUnit(unittest.TestCase):
    def test_safe_svg_rewritten(self) -> None:
        out = sanitize_svg(_SAFE_SVG)
        self.assertIn(b"<svg", out)
        self.assertIn(b"rect", out.lower())
        self.assertNotIn(b"<script", out.lower())

    def test_script_rejected(self) -> None:
        with self.assertRaises(SvgSanitizeError):
            sanitize_svg(_UNSAFE_SVG)

    def test_event_handler_rejected(self) -> None:
        with self.assertRaises(SvgSanitizeError):
            sanitize_svg(_EVENT_SVG)


class TestTenantLogoSvgSecurity(PgClientTestCase):
    def setUp(self) -> None:
        super().setUp()
        tenant = models.Tenant(name="Logo SVG Test")
        self.session.add(tenant)
        self.session.commit()
        self.session.refresh(tenant)
        self.tenant = tenant
        self.owner = models.User(
            email="logo-svg-owner@test.local",
            hashed_password=security.get_password_hash("secret"),
            full_name="Owner",
            tenant_id=tenant.id,
            role=models.UserRole.owner,
        )
        self.session.add(self.owner)
        self.session.commit()
        self.session.refresh(self.owner)
        self.headers = _bearer_headers(self.owner)
        self._logo_dir = UPLOADS_DIR / str(tenant.id) / "logo"

    def tearDown(self) -> None:
        shutil.rmtree(UPLOADS_DIR / str(self.tenant.id), ignore_errors=True)
        super().tearDown()

    def test_safe_svg_upload_and_serve_headers(self) -> None:
        r = self.client.post(
            "/tenant/logo",
            headers=self.headers,
            files={"file": ("logo.svg", io.BytesIO(_SAFE_SVG), "image/svg+xml")},
        )
        self.assertEqual(r.status_code, 200, r.text)
        fn = r.json().get("logo_filename")
        self.assertTrue(fn and str(fn).endswith(".svg"), fn)

        stored = Path(self._logo_dir / fn)
        self.assertTrue(stored.is_file())
        body = stored.read_bytes()
        self.assertNotIn(b"<script", body.lower())

        get_r = self.client.get(f"/uploads/{self.tenant.id}/logo/{fn}")
        self.assertEqual(get_r.status_code, 200, get_r.text)
        self.assertEqual(get_r.headers.get("content-type", "").split(";")[0], "image/svg+xml")
        self.assertEqual(get_r.headers.get("x-content-type-options"), "nosniff")
        self.assertIn("attachment", (get_r.headers.get("content-disposition") or "").lower())
        csp = get_r.headers.get("content-security-policy") or ""
        self.assertIn("sandbox", csp.lower())

    def test_unsafe_svg_upload_rejected(self) -> None:
        r = self.client.post(
            "/tenant/logo",
            headers=self.headers,
            files={"file": ("bad.svg", io.BytesIO(_UNSAFE_SVG), "image/svg+xml")},
        )
        self.assertEqual(r.status_code, 400, r.text)
        self.assertIn("disallowed", (r.json().get("detail") or "").lower())
        self.session.refresh(self.tenant)
        self.assertIsNone(self.tenant.logo_filename)

    def test_event_handler_svg_upload_rejected(self) -> None:
        r = self.client.post(
            "/tenant/logo",
            headers=self.headers,
            files={"file": ("evt.svg", io.BytesIO(_EVENT_SVG), "image/svg+xml")},
        )
        self.assertEqual(r.status_code, 400, r.text)


if __name__ == "__main__":
    unittest.main()
