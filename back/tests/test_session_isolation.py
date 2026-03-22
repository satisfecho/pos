import unittest

from pg_client_mixin import PgClientTestCase
from sqlmodel import select

from app import models


class TestSessionIsolation(PgClientTestCase):
    def setUp(self):
        super().setUp()
        self.setup_data()

    def setup_data(self):
        self.tenant = models.Tenant(name="Test Restaurant")
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
            name="Burger",
            price_cents=1000,
            tenant_id=self.tenant.id,
        )
        self.session.add(self.product)
        self.session.commit()
        self.session.refresh(self.product)

    def test_session_isolation(self):
        session_id_owner = "user_session_123"
        response = self.client.post(
            f"/menu/{self.table.token}/order",
            json={
                "items": [{"product_id": self.product.id, "quantity": 1}],
                "session_id": session_id_owner,
            },
        )
        self.assertEqual(response.status_code, 200)
        order_data = response.json()
        order_id = order_data["order_id"]

        # Shared orders keep session on items only; bind Order.session_id to exercise PUT/DELETE checks.
        order_row = self.session.exec(select(models.Order).where(models.Order.id == order_id)).first()
        self.assertIsNotNone(order_row)
        order_row.session_id = session_id_owner
        self.session.add(order_row)
        self.session.commit()

        response = self.client.get(f"/menu/{self.table.token}/order?session_id={session_id_owner}")
        current_order = response.json()["order"]
        item_id = current_order["items"][0]["id"]

        response = self.client.put(
            f"/menu/{self.table.token}/order/{order_id}/items/{item_id}",
            json={"quantity": 5},
        )
        self.assertEqual(response.status_code, 403)
        self.assertEqual(response.json()["detail"], "Order does not belong to this session")

        response = self.client.put(
            f"/menu/{self.table.token}/order/{order_id}/items/{item_id}",
            json={"quantity": 5},
            params={"session_id": "wrong_session"},
        )
        self.assertEqual(response.status_code, 403)

        response = self.client.put(
            f"/menu/{self.table.token}/order/{order_id}/items/{item_id}",
            json={"quantity": 5},
            params={"session_id": session_id_owner},
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["new_quantity"], 5)

        response = self.client.delete(f"/menu/{self.table.token}/order/{order_id}")
        self.assertEqual(response.status_code, 403)

        response = self.client.delete(
            f"/menu/{self.table.token}/order/{order_id}",
            params={"session_id": session_id_owner},
        )
        self.assertEqual(response.status_code, 200)

    def test_cancel_order_clears_session_id(self):
        session_id = "user_session_456"

        response = self.client.post(
            f"/menu/{self.table.token}/order",
            json={
                "items": [{"product_id": self.product.id, "quantity": 1}],
                "session_id": session_id,
            },
        )
        self.assertEqual(response.status_code, 200)
        first_order_id = response.json()["order_id"]
        first_order_number = response.json().get("order_number")

        response = self.client.delete(
            f"/menu/{self.table.token}/order/{first_order_id}",
            params={"session_id": session_id},
        )
        self.assertEqual(response.status_code, 200)

        response = self.client.post(
            f"/menu/{self.table.token}/order",
            json={
                "items": [{"product_id": self.product.id, "quantity": 1}],
                "session_id": session_id,
            },
        )
        self.assertEqual(response.status_code, 200)
        second_order_id = response.json()["order_id"]
        second_order_number = response.json().get("order_number")

        self.assertNotEqual(first_order_id, second_order_id)
        if first_order_number is not None and second_order_number is not None:
            self.assertNotEqual(first_order_number, second_order_number)


if __name__ == "__main__":
    unittest.main()
