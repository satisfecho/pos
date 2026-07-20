"""Satisfecho Delivery order channel — create/read/update + courier visibility."""
from __future__ import annotations

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


class TestSatisfechoDeliveryOrders(PgClientTestCase):
    def setUp(self) -> None:
        super().setUp()
        self.tenant = models.Tenant(name="SD Tenant", address="Restaurant St 1")
        self.session.add(self.tenant)
        self.session.commit()
        self.session.refresh(self.tenant)

        self.owner = models.User(
            email="sd-owner@test.local",
            hashed_password=security.get_password_hash("secret"),
            full_name="Owner",
            tenant_id=self.tenant.id,
            role=models.UserRole.owner,
        )
        self.courier = models.User(
            email="sd-courier@test.local",
            hashed_password=security.get_password_hash("secret"),
            full_name="Courier",
            tenant_id=self.tenant.id,
            role=models.UserRole.courier,
        )
        self.session.add(self.owner)
        self.session.add(self.courier)
        self.session.commit()
        self.session.refresh(self.owner)
        self.session.refresh(self.courier)

        self.product = models.Product(
            tenant_id=self.tenant.id,
            name="Delivery Pizza",
            price_cents=1500,
            category="Main",
        )
        self.session.add(self.product)
        self.session.commit()
        self.session.refresh(self.product)

    def test_create_and_list_satisfecho_delivery_order(self) -> None:
        h = _bearer_headers(self.owner)
        r = self.client.post(
            "/orders/satisfecho-delivery",
            headers=h,
            json={
                "items": [{"product_id": self.product.id, "quantity": 2}],
                "delivery_address": "Calle Mayor 10, Madrid",
                "customer_phone": "+34600111222",
                "customer_name": "Maria",
                "notes": "Ring doorbell",
                "courier_user_id": self.courier.id,
            },
        )
        self.assertEqual(r.status_code, 200, r.text)
        created = r.json()
        self.assertEqual(created["order_channel"], "satisfecho_delivery")
        self.assertEqual(created["delivery_address"], "Calle Mayor 10, Madrid")
        self.assertEqual(created["customer_phone"], "+34600111222")
        self.assertIsNone(created["table_id"])
        self.assertEqual(created["courier_user_id"], self.courier.id)
        order_id = created["id"]

        r_list = self.client.get("/orders", headers=h)
        self.assertEqual(r_list.status_code, 200, r_list.text)
        rows = r_list.json()
        match = next((row for row in rows if row["id"] == order_id), None)
        self.assertIsNotNone(match)
        assert match is not None
        self.assertEqual(match["order_channel"], "satisfecho_delivery")
        self.assertEqual(match["table_name"], "Satisfecho Delivery")
        self.assertEqual(match["delivery_address"], "Calle Mayor 10, Madrid")
        self.assertEqual(match["customer_phone"], "+34600111222")

    def test_update_delivery_fields(self) -> None:
        h = _bearer_headers(self.owner)
        r = self.client.post(
            "/orders/satisfecho-delivery",
            headers=h,
            json={
                "items": [{"product_id": self.product.id, "quantity": 1}],
                "delivery_address": "Old Address 1",
                "customer_name": "Ana",
            },
        )
        self.assertEqual(r.status_code, 200, r.text)
        order_id = r.json()["id"]

        r_upd = self.client.put(
            f"/orders/{order_id}/delivery",
            headers=h,
            json={
                "delivery_address": "New Address 2",
                "customer_phone": "+34600999888",
                "notes": "Leave at door",
                "courier_user_id": self.courier.id,
            },
        )
        self.assertEqual(r_upd.status_code, 200, r_upd.text)
        data = r_upd.json()
        self.assertEqual(data["delivery_address"], "New Address 2")
        self.assertEqual(data["customer_phone"], "+34600999888")
        self.assertEqual(data["notes"], "Leave at door")
        self.assertEqual(data["courier_user_id"], self.courier.id)

    def test_courier_sees_satisfecho_delivery_with_address(self) -> None:
        order = models.Order(
            tenant_id=self.tenant.id,
            table_id=None,
            status=models.OrderStatus.pending,
            customer_name="Luis",
            notes="Call on arrival",
            order_channel=models.OrderChannel.satisfecho_delivery,
            delivery_address="Av. Diagonal 100",
            customer_phone="+34600123456",
            courier_user_id=self.courier.id,
            created_at=datetime.now(timezone.utc),
        )
        self.session.add(order)
        self.session.flush()
        self.session.add(
            models.OrderItem(
                order_id=order.id,
                product_id=self.product.id,
                product_name=self.product.name,
                quantity=1,
                price_cents=self.product.price_cents,
            )
        )
        self.session.commit()
        self.session.refresh(order)

        h = _bearer_headers(self.courier)
        r_list = self.client.get("/courier/orders", headers=h)
        self.assertEqual(r_list.status_code, 200, r_list.text)
        ids = [row["id"] for row in r_list.json()]
        self.assertIn(order.id, ids)

        r = self.client.get(f"/courier/orders/{order.id}", headers=h)
        self.assertEqual(r.status_code, 200, r.text)
        data = r.json()
        self.assertEqual(data["delivery_address"], "Av. Diagonal 100")
        self.assertEqual(data["customer_phone"], "+34600123456")
        self.assertEqual(data["delivery_notes"], "Call on arrival")
        self.assertEqual(data["order_channel"], "satisfecho_delivery")

    def test_create_rejects_empty_address(self) -> None:
        h = _bearer_headers(self.owner)
        r = self.client.post(
            "/orders/satisfecho-delivery",
            headers=h,
            json={
                "items": [{"product_id": self.product.id, "quantity": 1}],
                "delivery_address": "   ",
            },
        )
        self.assertEqual(r.status_code, 400, r.text)


if __name__ == "__main__":
    unittest.main()
