"""API: shared table draft cart for activated dine-in tables (#349)."""
from __future__ import annotations

import unittest
from unittest.mock import patch

from pg_client_mixin import PgClientTestCase

from app import models


class FakeRedis:
    def __init__(self):
        self.store: dict[str, str] = {}

    def get(self, key):
        return self.store.get(key)

    def setex(self, key, _ttl, value):
        self.store[key] = value

    def delete(self, key):
        self.store.pop(key, None)

    def publish(self, *_args, **_kwargs):
        return 0

    def ping(self):
        return True


class TestTableCartApi(PgClientTestCase):
    def setUp(self):
        super().setUp()
        self.fake_redis = FakeRedis()
        self.tenant = models.Tenant(name="Cart Tenant")
        self.session.add(self.tenant)
        self.session.commit()
        self.session.refresh(self.tenant)

        self.floor = models.Floor(name="Main", tenant_id=self.tenant.id)
        self.session.add(self.floor)
        self.session.commit()
        self.session.refresh(self.floor)

        self.table = models.Table(
            name="T01",
            tenant_id=self.tenant.id,
            floor_id=self.floor.id,
            is_active=True,
            order_pin="4829",
        )
        self.session.add(self.table)
        self.session.commit()
        self.session.refresh(self.table)

        self.take_away = models.Table(
            name="Take Away",
            tenant_id=self.tenant.id,
            floor_id=self.floor.id,
            is_active=True,
            order_pin=None,
        )
        self.session.add(self.take_away)
        self.session.commit()
        self.session.refresh(self.take_away)

        self.product = models.Product(
            name="Shared Dish",
            price_cents=750,
            tenant_id=self.tenant.id,
        )
        self.session.add(self.product)
        self.session.commit()
        self.session.refresh(self.product)

        self._redis_patch = patch("app.main.get_redis", return_value=self.fake_redis)
        self._redis_patch.start()

    def tearDown(self):
        self._redis_patch.stop()
        super().tearDown()

    def test_menu_flags_shared_cart(self):
        r = self.client.get(f"/menu/{self.table.token}")
        self.assertEqual(r.status_code, 200)
        self.assertTrue(r.json().get("table_shared_cart"))

        r2 = self.client.get(f"/menu/{self.take_away.token}")
        self.assertEqual(r2.status_code, 200)
        self.assertFalse(r2.json().get("table_shared_cart"))

    def test_two_sessions_see_same_cart(self):
        body_a = {
            "session_id": "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
            "customer_name": "Alice",
            "product_id": self.product.id,
            "quantity": 1,
            "source": "product",
        }
        r = self.client.post(f"/menu/{self.table.token}/cart/items", json=body_a)
        self.assertEqual(r.status_code, 200, r.text)
        self.assertTrue(r.json()["shared"])
        self.assertEqual(len(r.json()["items"]), 1)

        body_b = {
            "session_id": "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
            "customer_name": "Bob",
            "product_id": self.product.id,
            "quantity": 2,
            "source": "product",
        }
        r2 = self.client.post(f"/menu/{self.table.token}/cart/items", json=body_b)
        self.assertEqual(r2.status_code, 200, r2.text)
        self.assertEqual(len(r2.json()["items"]), 2)

        got = self.client.get(f"/menu/{self.table.token}/cart")
        self.assertEqual(got.status_code, 200)
        names = {i["customer_name"] for i in got.json()["items"]}
        self.assertEqual(names, {"Alice", "Bob"})

    def test_take_away_local_only(self):
        got = self.client.get(f"/menu/{self.take_away.token}/cart")
        self.assertEqual(got.status_code, 200)
        self.assertFalse(got.json()["shared"])

        r = self.client.post(
            f"/menu/{self.take_away.token}/cart/items",
            json={
                "session_id": "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
                "product_id": self.product.id,
                "quantity": 1,
                "source": "product",
            },
        )
        self.assertEqual(r.status_code, 400)
