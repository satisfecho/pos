"""GET /menu/{token}/order-history scoped to session or customer (#350)."""
import unittest

from pg_client_mixin import PgClientTestCase

from app import models, security


class TestMenuOrderHistoryScoping(PgClientTestCase):
    def setUp(self):
        super().setUp()
        self.tenant = models.Tenant(name="History Scope Tenant")
        self.session.add(self.tenant)
        self.session.commit()
        self.session.refresh(self.tenant)

        floor = models.Floor(name="Main", tenant_id=self.tenant.id)
        self.session.add(floor)
        self.session.commit()

        self.table = models.Table(
            name="T01",
            tenant_id=self.tenant.id,
            floor_id=floor.id,
            is_active=True,
            order_pin="1234",
        )
        self.session.add(self.table)
        self.session.commit()
        self.session.refresh(self.table)

        self.product = models.Product(
            name="Scope Dish",
            price_cents=900,
            tenant_id=self.tenant.id,
        )
        self.session.add(self.product)
        self.session.commit()
        self.session.refresh(self.product)

        self.session_a = "aaaaaaaa-aaaa-4aaa-yaaa-aaaaaaaaaaaa"
        self.session_b = "bbbbbbbb-bbbb-4bbb-ybbb-bbbbbbbbbbbb"
        self.session_c = "cccccccc-cccc-4ccc-yccc-cccccccccccc"

        self.order_a = self._paid_order(self.session_a, "Guest A")
        self.order_b = self._paid_order(self.session_b, "Guest B")

        self.customer = models.Customer(
            email="menu-history@amvara.de",
            hashed_password=security.get_password_hash("secretpass1"),
            email_verified=True,
        )
        self.session.add(self.customer)
        self.session.commit()
        self.session.refresh(self.customer)

        self.order_customer = models.Order(
            table_id=self.table.id,
            tenant_id=self.tenant.id,
            status=models.OrderStatus.paid,
            customer_id=self.customer.id,
            customer_name="Account User",
        )
        self.session.add(self.order_customer)
        self.session.flush()
        self.session.add(
            models.OrderItem(
                order_id=self.order_customer.id,
                product_id=self.product.id,
                product_name=self.product.name,
                quantity=1,
                price_cents=self.product.price_cents,
                added_by_session=self.session_c,
            )
        )
        self.session.commit()

    def _paid_order(self, session_id: str, customer_name: str) -> models.Order:
        order = models.Order(
            table_id=self.table.id,
            tenant_id=self.tenant.id,
            status=models.OrderStatus.paid,
            customer_name=customer_name,
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
                added_by_session=session_id,
            )
        )
        self.session.commit()
        self.session.refresh(order)
        return order

    def test_history_requires_session_id(self):
        r = self.client.get(f"/menu/{self.table.token}/order-history")
        self.assertEqual(r.status_code, 422)

    def test_anonymous_history_only_shows_session_orders(self):
        r = self.client.get(
            f"/menu/{self.table.token}/order-history",
            params={"session_id": self.session_a},
        )
        self.assertEqual(r.status_code, 200, r.text)
        ids = {row["id"] for row in r.json()}
        self.assertIn(self.order_a.id, ids)
        self.assertNotIn(self.order_b.id, ids)
        self.assertNotIn(self.order_customer.id, ids)

    def test_logged_in_history_includes_customer_orders_at_tenant(self):
        token = security.create_access_token(
            {
                "sub": self.customer.email,
                "customer_id": self.customer.id,
                "type": "customer",
                "token_version": self.customer.token_version,
            }
        )
        r = self.client.get(
            f"/menu/{self.table.token}/order-history",
            params={"session_id": self.session_b},
            cookies={security.CUSTOMER_ACCESS_COOKIE: token},
        )
        self.assertEqual(r.status_code, 200, r.text)
        ids = {row["id"] for row in r.json()}
        self.assertIn(self.order_customer.id, ids)
        self.assertIn(self.order_b.id, ids)
        self.assertNotIn(self.order_a.id, ids)

    def test_create_order_sets_customer_id_when_logged_in(self):
        token = security.create_access_token(
            {
                "sub": self.customer.email,
                "customer_id": self.customer.id,
                "type": "customer",
                "token_version": self.customer.token_version,
            }
        )
        payload = {
            "items": [{"product_id": self.product.id, "quantity": 1}],
            "session_id": self.session_a,
            "pin": self.table.order_pin,
        }
        r = self.client.post(
            f"/menu/{self.table.token}/order",
            json=payload,
            cookies={security.CUSTOMER_ACCESS_COOKIE: token},
        )
        self.assertEqual(r.status_code, 200, r.text)
        order_id = r.json()["order_id"]
        order = self.session.get(models.Order, order_id)
        self.assertEqual(order.customer_id, self.customer.id)


if __name__ == "__main__":
    unittest.main()
