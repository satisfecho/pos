"""Courier portal delivery order list and detail — auth and tenant isolation."""
from __future__ import annotations

import secrets
import unittest
from datetime import datetime, timedelta, timezone

from pg_client_mixin import PgClientTestCase

from app import models, security


def _bearer_headers(user: models.User) -> dict[str, str]:
    data = {
        "sub": user.email,
        "tenant_id": user.tenant_id,
        "provider_id": getattr(user, "provider_id", None),
        "token_version": user.token_version,
    }
    token = security.create_access_token(data, expires_delta=timedelta(minutes=30))
    return {"Authorization": f"Bearer {token}"}


class TestCourierOrders(PgClientTestCase):
    def setUp(self) -> None:
        super().setUp()
        self.tenant_a = models.Tenant(name="Courier tenant A", address="Pickup St 1")
        self.tenant_b = models.Tenant(name="Courier tenant B", address="Other St 2")
        self.session.add(self.tenant_a)
        self.session.add(self.tenant_b)
        self.session.commit()
        self.session.refresh(self.tenant_a)
        self.session.refresh(self.tenant_b)

        self.courier_a = models.User(
            email="co-courier-a@test.local",
            hashed_password=security.get_password_hash("secret"),
            full_name="Courier A",
            tenant_id=self.tenant_a.id,
            role=models.UserRole.courier,
        )
        self.waiter_a = models.User(
            email="co-waiter-a@test.local",
            hashed_password=security.get_password_hash("secret"),
            full_name="Waiter A",
            tenant_id=self.tenant_a.id,
            role=models.UserRole.waiter,
        )
        self.session.add(self.courier_a)
        self.session.add(self.waiter_a)
        self.session.commit()
        self.session.refresh(self.courier_a)
        self.session.refresh(self.waiter_a)

        self.integration_a = models.DeliveryMarketplaceIntegration(
            tenant_id=self.tenant_a.id,
            provider_key="uber_eats",
            webhook_ingest_token=secrets.token_urlsafe(16),
            enabled=True,
        )
        self.integration_b = models.DeliveryMarketplaceIntegration(
            tenant_id=self.tenant_b.id,
            provider_key="glovo",
            webhook_ingest_token=secrets.token_urlsafe(16),
            enabled=True,
        )
        self.session.add(self.integration_a)
        self.session.add(self.integration_b)
        self.session.commit()
        self.session.refresh(self.integration_a)
        self.session.refresh(self.integration_b)

        product_a = models.Product(
            tenant_id=self.tenant_a.id,
            name="Test Pizza",
            price_cents=1200,
            category="Main",
        )
        product_b = models.Product(
            tenant_id=self.tenant_b.id,
            name="Other Burger",
            price_cents=900,
            category="Main",
        )
        self.session.add(product_a)
        self.session.add(product_b)
        self.session.commit()
        self.session.refresh(product_a)
        self.session.refresh(product_b)

        self.order_a = models.Order(
            tenant_id=self.tenant_a.id,
            table_id=None,
            status=models.OrderStatus.pending,
            customer_name="Alice",
            notes="[Uber Eats] marketplace order UE-123",
            delivery_integration_id=self.integration_a.id,
            external_order_ref="UE-123",
            created_at=datetime.now(timezone.utc),
        )
        self.order_b = models.Order(
            tenant_id=self.tenant_b.id,
            table_id=None,
            status=models.OrderStatus.pending,
            customer_name="Bob",
            notes="[Glovo] marketplace order GL-99",
            delivery_integration_id=self.integration_b.id,
            external_order_ref="GL-99",
            created_at=datetime.now(timezone.utc),
        )
        self.session.add(self.order_a)
        self.session.add(self.order_b)
        self.session.flush()

        self.session.add(
            models.OrderItem(
                order_id=self.order_a.id,
                product_id=product_a.id,
                product_name=product_a.name,
                quantity=2,
                price_cents=product_a.price_cents,
            )
        )
        self.session.add(
            models.OrderItem(
                order_id=self.order_b.id,
                product_id=product_b.id,
                product_name=product_b.name,
                quantity=1,
                price_cents=product_b.price_cents,
            )
        )
        self.session.commit()
        self.session.refresh(self.order_a)
        self.session.refresh(self.order_b)

    def test_courier_lists_tenant_delivery_orders(self) -> None:
        r = self.client.get("/courier/orders", headers=_bearer_headers(self.courier_a))
        self.assertEqual(r.status_code, 200, r.text)
        data = r.json()
        self.assertEqual(len(data), 1)
        row = data[0]
        self.assertEqual(row["id"], self.order_a.id)
        self.assertEqual(row["customer_name"], "Alice")
        self.assertEqual(row["pickup_name"], "Courier tenant A")
        self.assertEqual(row["pickup_address"], "Pickup St 1")
        self.assertIn("Test Pizza", row["item_summary"])

    def test_courier_get_order_detail(self) -> None:
        r = self.client.get(
            f"/courier/orders/{self.order_a.id}",
            headers=_bearer_headers(self.courier_a),
        )
        self.assertEqual(r.status_code, 200, r.text)
        data = r.json()
        self.assertEqual(data["id"], self.order_a.id)
        self.assertEqual(data["delivery_notes"], "[Uber Eats] marketplace order UE-123")
        self.assertIsNone(data["delivery_address"])
        self.assertEqual(data["external_order_ref"], "UE-123")
        self.assertEqual(len(data["items"]), 1)
        self.assertEqual(data["items"][0]["quantity"], 2)
        self.assertEqual(data["total_cents"], 2400)

    def test_courier_cannot_read_other_tenant_order(self) -> None:
        r = self.client.get(
            f"/courier/orders/{self.order_b.id}",
            headers=_bearer_headers(self.courier_a),
        )
        self.assertEqual(r.status_code, 404, r.text)

    def test_non_courier_forbidden(self) -> None:
        h = _bearer_headers(self.waiter_a)
        r_list = self.client.get("/courier/orders", headers=h)
        self.assertEqual(r_list.status_code, 403, r_list.text)
        r_detail = self.client.get(
            f"/courier/orders/{self.order_a.id}",
            headers=h,
        )
        self.assertEqual(r_detail.status_code, 403, r_detail.text)

    def test_unauthenticated_rejected(self) -> None:
        r = self.client.get("/courier/orders")
        self.assertIn(r.status_code, (401, 403), r.text)


if __name__ == "__main__":
    unittest.main()
