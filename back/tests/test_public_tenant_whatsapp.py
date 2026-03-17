"""
Test that GET /public/tenants/{id} returns tenant whatsapp when set.
Settings page loads from /tenant/settings (same tenant); book page from /public/tenants/{id}.
Both must expose whatsapp so the book page can show the WhatsApp link.
"""
import os
import sys
import unittest

from fastapi.testclient import TestClient
from sqlmodel import Session, SQLModel, create_engine, select
from sqlalchemy.pool import StaticPool

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

from back.app.main import app, get_session
from back.app import models


class TestPublicTenantWhatsapp(unittest.TestCase):
    def setUp(self):
        self.engine = create_engine(
            "sqlite://",
            connect_args={"check_same_thread": False},
            poolclass=StaticPool,
        )
        SQLModel.metadata.create_all(self.engine)

        def get_session_override():
            with Session(self.engine) as session:
                yield session

        app.dependency_overrides[get_session] = get_session_override
        self.client = TestClient(app)
        self.session = Session(self.engine)
        self._create_tenant_with_whatsapp()

    def _create_tenant_with_whatsapp(self):
        tenant = models.Tenant(
            name="Test Restaurant",
            phone="+34 612 000 000",
            email="test@example.com",
            whatsapp="+34612000111",
        )
        self.session.add(tenant)
        self.session.commit()
        self.session.refresh(tenant)
        self.tenant_id = tenant.id

    def tearDown(self):
        app.dependency_overrides.clear()
        self.session.close()

    def test_get_public_tenant_includes_whatsapp(self):
        """GET /public/tenants/{id} must include whatsapp so book page can show the link."""
        response = self.client.get(f"/public/tenants/{self.tenant_id}")
        self.assertEqual(response.status_code, 200, response.text)
        data = response.json()
        self.assertIn("whatsapp", data, "Response must include 'whatsapp' key")
        self.assertEqual(data["whatsapp"], "+34612000111")
        self.assertEqual(data["phone"], "+34 612 000 000")
        self.assertEqual(data["email"], "test@example.com")


if __name__ == "__main__":
    unittest.main()
