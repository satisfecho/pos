"""Unit tests for ephemeral shared table cart (Redis helpers)."""
from __future__ import annotations

import unittest

from app import table_cart as tc


class FakeRedis:
    def __init__(self):
        self.store: dict[str, str] = {}

    def get(self, key):
        return self.store.get(key)

    def setex(self, key, _ttl, value):
        self.store[key] = value

    def delete(self, key):
        self.store.pop(key, None)


class TestTableCart(unittest.TestCase):
    def setUp(self):
        self.r = FakeRedis()
        self.table_id = 42

    def test_add_merge_and_remove_by_session(self):
        cart = tc.add_item(
            self.r,
            self.table_id,
            session_id="sess-a",
            customer_name="Alice",
            product_id=1,
            product_name="Pizza",
            price_cents=1000,
            quantity=1,
            notes=None,
            source="product",
            customization_answers=None,
        )
        self.assertEqual(len(cart["items"]), 1)
        line_id = cart["items"][0]["line_id"]

        cart = tc.add_item(
            self.r,
            self.table_id,
            session_id="sess-a",
            customer_name="Alice",
            product_id=1,
            product_name="Pizza",
            price_cents=1000,
            quantity=2,
            notes=None,
            source="product",
            customization_answers=None,
        )
        self.assertEqual(len(cart["items"]), 1)
        self.assertEqual(cart["items"][0]["quantity"], 3)

        cart = tc.add_item(
            self.r,
            self.table_id,
            session_id="sess-b",
            customer_name="Bob",
            product_id=2,
            product_name="Beer",
            price_cents=300,
            quantity=1,
            notes=None,
            source="product",
            customization_answers=None,
        )
        self.assertEqual(len(cart["items"]), 2)

        cart = tc.remove_session_items(self.r, self.table_id, "sess-a")
        self.assertEqual(len(cart["items"]), 1)
        self.assertEqual(cart["items"][0]["session_id"], "sess-b")

        denied = tc.remove_item(self.r, self.table_id, cart["items"][0]["line_id"], session_id="sess-a")
        self.assertIsNone(denied)

        cart = tc.remove_item(
            self.r, self.table_id, cart["items"][0]["line_id"], session_id="sess-b"
        )
        self.assertEqual(cart["items"], [])

        # line_id from earlier session should be gone after remove_session
        self.assertIsNone(tc.update_item(self.r, self.table_id, line_id, session_id="sess-a", quantity=1))

    def test_clear_cart(self):
        tc.add_item(
            self.r,
            self.table_id,
            session_id="s",
            customer_name=None,
            product_id=1,
            product_name="X",
            price_cents=1,
            quantity=1,
            notes=None,
            source=None,
            customization_answers=None,
        )
        self.assertTrue(self.r.store)
        tc.clear_cart(self.r, self.table_id)
        self.assertEqual(self.r.store, {})

    def test_load_corrupt_json(self):
        self.r.store[tc.cart_redis_key(self.table_id)] = "not-json"
        cart = tc.load_cart(self.r, self.table_id)
        self.assertEqual(cart["items"], [])


if __name__ == "__main__":
    unittest.main()
