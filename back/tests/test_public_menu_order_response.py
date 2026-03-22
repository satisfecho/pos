"""Regression: POST /menu/{token}/order returns created vs updated correctly."""
import unittest

from pg_client_mixin import PgClientTestCase

from app import models


class TestPublicMenuOrderResponse(PgClientTestCase):
    def setUp(self):
        super().setUp()
        self.tenant = models.Tenant(name="Menu Response Tenant")
        self.session.add(self.tenant)
        self.session.commit()
        self.session.refresh(self.tenant)

        self.floor = models.Floor(name="Main", tenant_id=self.tenant.id)
        self.session.add(self.floor)
        self.session.commit()

        self.table = models.Table(
            name="Take Away",
            tenant_id=self.tenant.id,
            floor_id=self.floor.id,
            is_active=True,
            order_pin="1234",
        )
        self.session.add(self.table)
        self.session.commit()
        self.session.refresh(self.table)

        self.product = models.Product(
            name="Test Dish",
            price_cents=500,
            tenant_id=self.tenant.id,
        )
        self.session.add(self.product)
        self.session.commit()
        self.session.refresh(self.product)

    def test_first_order_created_second_updated_same_order_id(self):
        payload = {
            "items": [{"product_id": self.product.id, "quantity": 1}],
        }
        r1 = self.client.post(f"/menu/{self.table.token}/order", json=payload)
        self.assertEqual(r1.status_code, 200, r1.text)
        b1 = r1.json()
        self.assertEqual(b1["status"], "created")
        order_id = b1["order_id"]

        r2 = self.client.post(
            f"/menu/{self.table.token}/order",
            json={"items": [{"product_id": self.product.id, "quantity": 1}]},
        )
        self.assertEqual(r2.status_code, 200, r2.text)
        b2 = r2.json()
        self.assertEqual(b2["status"], "updated")
        self.assertEqual(b2["order_id"], order_id)


if __name__ == "__main__":
    unittest.main()
