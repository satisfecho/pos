"""
Test that GET /public/tenants/{id} returns tenant whatsapp when set.
Settings page loads from /tenant/settings (same tenant); book page from /public/tenants/{id}.
Both must expose whatsapp so the book page can show the WhatsApp link.
"""
import unittest

from pg_client_mixin import PgClientTestCase

from app import models


class TestPublicTenantWhatsapp(PgClientTestCase):
    def setUp(self):
        super().setUp()
        self._create_tenant_with_whatsapp()

    def _create_tenant_with_whatsapp(self):
        tenant = models.Tenant(
            name="Test Restaurant",
            phone="+34 612 000 000",
            email="pos-public-tenant-test@amvara.de",
            whatsapp="+34612000111",
        )
        self.session.add(tenant)
        self.session.commit()
        self.session.refresh(tenant)
        self.tenant_id = tenant.id

    def test_get_public_tenant_includes_whatsapp(self):
        """GET /public/tenants/{id} must include whatsapp so book page can show the link."""
        response = self.client.get(f"/public/tenants/{self.tenant_id}")
        self.assertEqual(response.status_code, 200, response.text)
        data = response.json()
        self.assertIn("whatsapp", data, "Response must include 'whatsapp' key")
        self.assertEqual(data["whatsapp"], "+34612000111")
        self.assertEqual(data["phone"], "+34 612 000 000")
        self.assertEqual(data["email"], "pos-public-tenant-test@amvara.de")


if __name__ == "__main__":
    unittest.main()
