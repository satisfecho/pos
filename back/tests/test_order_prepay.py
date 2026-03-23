"""Mark order paid before all items are served (GitHub #23)."""
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


class TestOrderPrepay(PgClientTestCase):
    def setUp(self) -> None:
        super().setUp()
        tenant = models.Tenant(name="Prepay Test", tip_preset_percents=[10, 20])
        self.session.add(tenant)
        self.session.commit()
        self.session.refresh(tenant)

        self.owner = models.User(
            email="prepay-owner@test.local",
            hashed_password=get_password_hash("secret"),
            full_name="Owner O",
            tenant_id=tenant.id,
            role=models.UserRole.owner,
        )
        self.session.add(self.owner)
        self.session.commit()
        self.session.refresh(self.owner)

        floor = models.Floor(name="Main", tenant_id=tenant.id)
        self.session.add(floor)
        self.session.commit()
        self.session.refresh(floor)

        table = models.Table(
            name="T1",
            tenant_id=tenant.id,
            floor_id=floor.id,
            is_active=True,
        )
        self.session.add(table)
        self.session.commit()
        self.session.refresh(table)

        product = models.Product(
            name="Soup",
            price_cents=500,
            tenant_id=tenant.id,
        )
        self.session.add(product)
        self.session.commit()
        self.session.refresh(product)

        self.order = models.Order(
            table_id=table.id,
            tenant_id=tenant.id,
            status=models.OrderStatus.preparing,
        )
        self.session.add(self.order)
        self.session.commit()
        self.session.refresh(self.order)

        self.item = models.OrderItem(
            order_id=self.order.id,
            product_id=product.id,
            product_name=product.name,
            quantity=1,
            price_cents=500,
            status=models.OrderItemStatus.preparing,
        )
        self.session.add(self.item)
        self.session.commit()
        self.session.refresh(self.item)

    def test_mark_paid_while_items_not_delivered(self) -> None:
        h = _bearer_headers(self.owner)
        r = self.client.put(
            f"/orders/{self.order.id}/mark-paid",
            json={"payment_method": "cash", "tip_percent": None},
            headers=h,
        )
        self.assertEqual(r.status_code, 200, r.text)
        body = r.json()
        self.assertEqual(body.get("status"), "paid")

        order = self.session.get(models.Order, self.order.id)
        assert order is not None
        self.assertEqual(order.status, models.OrderStatus.paid)
        self.assertIsNotNone(order.paid_at)

        item = self.session.exec(
            select(models.OrderItem).where(models.OrderItem.id == self.item.id)
        ).first()
        assert item is not None
        self.assertEqual(item.status, models.OrderItemStatus.preparing)


if __name__ == "__main__":
    unittest.main()
