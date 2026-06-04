"""Tests for tenant custom subcategories persistence."""

from __future__ import annotations

import unittest
from datetime import timedelta

from pg_client_mixin import PgClientTestCase

from app import models, security
from app.category_codes import CATEGORY_CODES
from app.tenant_subcategories import STANDARD_CATEGORY_ORDER, tenant_categories_for_ui


def _owner_headers(user: models.User) -> dict[str, str]:
    data = {
        "sub": user.email,
        "tenant_id": user.tenant_id,
        "provider_id": getattr(user, "provider_id", None),
        "token_version": user.token_version,
    }
    token = security.create_access_token(data, expires_delta=timedelta(minutes=30))
    return {"Authorization": f"Bearer {token}"}


class TestTenantSubcategories(PgClientTestCase):
    def setUp(self) -> None:
        super().setUp()
        tenant = models.Tenant(name="Subcat Test")
        self.session.add(tenant)
        self.session.commit()
        self.session.refresh(tenant)
        self.tenant_id = tenant.id

        self.owner = models.User(
            email="subcat-owner@test.local",
            hashed_password=security.get_password_hash("secret"),
            full_name="Owner",
            tenant_id=self.tenant_id,
            role=models.UserRole.owner,
        )
        self.session.add(self.owner)
        self.session.commit()
        self.session.refresh(self.owner)
        self.headers = _owner_headers(self.owner)

    def test_create_subcategory_persists_and_merges_into_catalog_categories(self):
        r = self.client.post(
            "/tenant/subcategories",
            json={"category": "Starters", "name": "House Special"},
            headers=self.headers,
        )
        self.assertEqual(r.status_code, 200, r.text)
        self.assertIn("House Special", r.json().get("Starters", []))

        r2 = self.client.get("/catalog/categories", headers=self.headers)
        self.assertEqual(r2.status_code, 200, r2.text)
        self.assertIn("House Special", r2.json().get("Starters", []))

    def test_create_duplicate_returns_400(self):
        payload = {"category": "Desserts", "name": "Chef Choice"}
        self.assertEqual(
            self.client.post("/tenant/subcategories", json=payload, headers=self.headers).status_code,
            200,
        )
        r = self.client.post("/tenant/subcategories", json=payload, headers=self.headers)
        self.assertEqual(r.status_code, 400, r.text)

    def test_rename_and_delete_custom_subcategory(self):
        self.client.post(
            "/tenant/subcategories",
            json={"category": "Sides", "name": "Truffle Fries"},
            headers=self.headers,
        )
        r = self.client.put(
            "/tenant/subcategories",
            json={"category": "Sides", "old_name": "Truffle Fries", "new_name": "Loaded Fries"},
            headers=self.headers,
        )
        self.assertEqual(r.status_code, 200, r.text)
        self.assertIn("Loaded Fries", r.json().get("Sides", []))

        r2 = self.client.request(
            "DELETE",
            "/tenant/subcategories",
            json={"category": "Sides", "name": "Loaded Fries"},
            headers=self.headers,
        )
        self.assertEqual(r2.status_code, 200, r2.text)
        self.assertNotIn("Loaded Fries", r2.json().get("Sides", []))

    def test_tenant_with_no_products_has_all_standard_categories(self):
        merged = tenant_categories_for_ui(self.session, self.tenant_id)
        for name in CATEGORY_CODES.values():
            self.assertIn(name, merged)
            self.assertIsInstance(merged[name], list)
        self.assertEqual(list(merged.keys())[:5], STANDARD_CATEGORY_ORDER)

        r = self.client.get("/catalog/categories", headers=self.headers)
        self.assertEqual(r.status_code, 200, r.text)
        body = r.json()
        for name in CATEGORY_CODES.values():
            self.assertIn(name, body)
        self.assertEqual(list(body.keys())[:5], STANDARD_CATEGORY_ORDER)

    def test_product_subcategories_included_in_merge(self):
        self.session.add(
            models.Product(
                tenant_id=self.tenant_id,
                name="Soup",
                price_cents=500,
                category="Starters",
                subcategory="Daily Soup",
            )
        )
        self.session.commit()
        merged = tenant_categories_for_ui(self.session, self.tenant_id)
        self.assertIn("Daily Soup", merged.get("Starters", []))


if __name__ == "__main__":
    unittest.main()
