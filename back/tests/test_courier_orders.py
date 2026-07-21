"""Courier portal delivery order list and detail — auth and tenant isolation."""
from __future__ import annotations

import secrets
import unittest
from datetime import datetime, timedelta, timezone

from sqlmodel import select

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
        self.assertIsNone(row["courier_user_id"])
        self.assertEqual(row["total_cents"], 2400)

    def test_courier_list_includes_assigned_delivery_fields(self) -> None:
        """Assigned Satisfecho Delivery orders expose address/phone/courier for Mine tab."""
        product = self.session.exec(
            select(models.Product).where(models.Product.tenant_id == self.tenant_a.id)
        ).first()
        assert product is not None
        assigned = models.Order(
            tenant_id=self.tenant_a.id,
            table_id=None,
            status=models.OrderStatus.ready,
            customer_name="Maria",
            notes="Ring bell",
            order_channel=models.OrderChannel.satisfecho_delivery,
            delivery_address="Calle Mayor 10",
            customer_phone="+34600111222",
            courier_user_id=self.courier_a.id,
            created_at=datetime.now(timezone.utc),
        )
        self.session.add(assigned)
        self.session.flush()
        self.session.add(
            models.OrderItem(
                order_id=assigned.id,
                product_id=product.id,
                product_name=product.name,
                quantity=1,
                price_cents=product.price_cents,
            )
        )
        other_courier = models.User(
            email="co-courier-other@test.local",
            hashed_password=security.get_password_hash("secret"),
            full_name="Other Courier",
            tenant_id=self.tenant_a.id,
            role=models.UserRole.courier,
        )
        self.session.add(other_courier)
        self.session.flush()
        assigned_other = models.Order(
            tenant_id=self.tenant_a.id,
            table_id=None,
            status=models.OrderStatus.preparing,
            customer_name="Other",
            order_channel=models.OrderChannel.satisfecho_delivery,
            delivery_address="Other St 5",
            courier_user_id=other_courier.id,
            created_at=datetime.now(timezone.utc),
        )
        self.session.add(assigned_other)
        self.session.flush()
        self.session.add(
            models.OrderItem(
                order_id=assigned_other.id,
                product_id=product.id,
                product_name=product.name,
                quantity=1,
                price_cents=product.price_cents,
            )
        )
        self.session.commit()

        r = self.client.get("/courier/orders", headers=_bearer_headers(self.courier_a))
        self.assertEqual(r.status_code, 200, r.text)
        by_id = {row["id"]: row for row in r.json()}
        self.assertIn(assigned.id, by_id)
        self.assertIn(assigned_other.id, by_id)
        self.assertIn(self.order_a.id, by_id)
        mine = by_id[assigned.id]
        self.assertEqual(mine["courier_user_id"], self.courier_a.id)
        self.assertEqual(mine["delivery_address"], "Calle Mayor 10")
        self.assertEqual(mine["customer_phone"], "+34600111222")
        self.assertEqual(mine["customer_name"], "Maria")
        self.assertEqual(mine["total_cents"], product.price_cents)
        self.assertEqual(mine["order_channel"], "satisfecho_delivery")
        self.assertEqual(by_id[assigned_other.id]["courier_user_id"], other_courier.id)
        self.assertIsNone(by_id[self.order_a.id]["courier_user_id"])

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
