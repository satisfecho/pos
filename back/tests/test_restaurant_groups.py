"""Restaurant groups: shared billing customers and products across tenants (GitHub #283)."""
from __future__ import annotations

import unittest
from datetime import timedelta

from pg_client_mixin import PgClientTestCase
from sqlmodel import select

from app import models, security
from app.security import get_password_hash


def _bearer_headers(user: models.User) -> dict[str, str]:
    data = {
        "sub": user.email,
        "tenant_id": user.tenant_id,
        "provider_id": getattr(user, "provider_id", None),
        "token_version": user.token_version,
    }
    token = security.create_access_token(data, expires_delta=timedelta(minutes=30))
    return {"Authorization": f"Bearer {token}"}


class TestRestaurantGroups(PgClientTestCase):
    def setUp(self) -> None:
        super().setUp()
        self.tenant_a = models.Tenant(name="Group Tenant A")
        self.tenant_b = models.Tenant(name="Group Tenant B")
        self.tenant_c = models.Tenant(name="Isolated Tenant C")
        self.session.add(self.tenant_a)
        self.session.add(self.tenant_b)
        self.session.add(self.tenant_c)
        self.session.commit()
        self.session.refresh(self.tenant_a)
        self.session.refresh(self.tenant_b)
        self.session.refresh(self.tenant_c)

        self.owner_a = models.User(
            email="rg-owner-a@test.local",
            hashed_password=get_password_hash("secret"),
            full_name="Owner A",
            tenant_id=self.tenant_a.id,
            role=models.UserRole.owner,
        )
        self.owner_b = models.User(
            email="rg-owner-b@test.local",
            hashed_password=get_password_hash("secret"),
            full_name="Owner B",
            tenant_id=self.tenant_b.id,
            role=models.UserRole.owner,
        )
        self.owner_c = models.User(
            email="rg-owner-c@test.local",
            hashed_password=get_password_hash("secret"),
            full_name="Owner C",
            tenant_id=self.tenant_c.id,
            role=models.UserRole.owner,
        )
        self.session.add(self.owner_a)
        self.session.add(self.owner_b)
        self.session.add(self.owner_c)
        self.session.commit()
        self.session.refresh(self.owner_a)
        self.session.refresh(self.owner_b)
        self.session.refresh(self.owner_c)

        self.customer_a = models.BillingCustomer(
            tenant_id=self.tenant_a.id,
            name="Customer A Corp",
            tax_id="A111",
        )
        self.customer_b = models.BillingCustomer(
            tenant_id=self.tenant_b.id,
            name="Customer B Corp",
            tax_id="B222",
        )
        self.session.add(self.customer_a)
        self.session.add(self.customer_b)
        self.session.commit()
        self.session.refresh(self.customer_a)
        self.session.refresh(self.customer_b)

        cat = models.ProductCatalog(name="Shared Item", normalized_name="shared item", category="Food")
        self.session.add(cat)
        self.session.commit()
        self.session.refresh(cat)

        self.tp_a = models.TenantProduct(
            tenant_id=self.tenant_a.id,
            catalog_id=cat.id,
            name="Product A",
            price_cents=500,
            is_active=True,
        )
        self.tp_b = models.TenantProduct(
            tenant_id=self.tenant_b.id,
            catalog_id=cat.id,
            name="Product B",
            price_cents=700,
            is_active=True,
        )
        self.session.add(self.tp_a)
        self.session.add(self.tp_b)
        self.session.commit()
        self.session.refresh(self.tp_a)
        self.session.refresh(self.tp_b)

    def _create_group_a(self) -> str:
        resp = self.client.post(
            "/restaurant-group",
            json={"name": "Downtown", "share_products": True, "share_customers": True},
            headers=_bearer_headers(self.owner_a),
        )
        self.assertEqual(resp.status_code, 200)
        return resp.json()["join_code"]

    def test_isolation_without_group(self) -> None:
        resp = self.client.get("/billing-customers", headers=_bearer_headers(self.owner_b))
        self.assertEqual(resp.status_code, 200)
        ids = {c["id"] for c in resp.json()}
        self.assertIn(self.customer_b.id, ids)
        self.assertNotIn(self.customer_a.id, ids)

    def test_shared_customers_when_enabled(self) -> None:
        join_code = self._create_group_a()
        resp_join = self.client.post(
            "/restaurant-group/join",
            json={"join_code": join_code},
            headers=_bearer_headers(self.owner_b),
        )
        self.assertEqual(resp_join.status_code, 200)

        resp = self.client.get("/billing-customers", headers=_bearer_headers(self.owner_b))
        self.assertEqual(resp.status_code, 200)
        by_id = {c["id"]: c for c in resp.json()}
        self.assertIn(self.customer_a.id, by_id)
        self.assertTrue(by_id[self.customer_a.id]["is_shared"])

    def test_shared_products_when_enabled(self) -> None:
        join_code = self._create_group_a()
        self.client.post(
            "/restaurant-group/join",
            json={"join_code": join_code},
            headers=_bearer_headers(self.owner_b),
        )
        resp = self.client.get("/tenant-products", headers=_bearer_headers(self.owner_b))
        self.assertEqual(resp.status_code, 200)
        names = {p["name"] for p in resp.json()}
        self.assertIn("Product A", names)
        self.assertIn("Product B", names)

    def test_no_cross_group_access(self) -> None:
        join_code = self._create_group_a()
        self.client.post(
            "/restaurant-group/join",
            json={"join_code": join_code},
            headers=_bearer_headers(self.owner_b),
        )
        resp = self.client.get("/billing-customers", headers=_bearer_headers(self.owner_c))
        self.assertEqual(resp.status_code, 200)
        ids = {c["id"] for c in resp.json()}
        self.assertNotIn(self.customer_a.id, ids)
        self.assertNotIn(self.customer_b.id, ids)

    def test_cannot_update_shared_customer_from_sibling(self) -> None:
        join_code = self._create_group_a()
        self.client.post(
            "/restaurant-group/join",
            json={"join_code": join_code},
            headers=_bearer_headers(self.owner_b),
        )
        resp = self.client.put(
            f"/billing-customers/{self.customer_a.id}",
            json={"name": "Hacked"},
            headers=_bearer_headers(self.owner_b),
        )
        self.assertEqual(resp.status_code, 404)
        row = self.session.get(models.BillingCustomer, self.customer_a.id)
        assert row is not None
        self.assertEqual(row.name, "Customer A Corp")


if __name__ == "__main__":
    unittest.main()
