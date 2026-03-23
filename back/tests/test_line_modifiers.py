"""Order line_modifiers validation and order merge behaviour."""
import unittest

from fastapi import HTTPException
from pg_client_mixin import PgClientTestCase

from app import models
from app.line_modifiers import line_modifiers_equal, validate_and_normalize_line_modifiers


class TestLineModifiersNormalize(unittest.TestCase):
    def test_empty_none(self):
        self.assertEqual(validate_and_normalize_line_modifiers(None), (None, None))
        self.assertEqual(validate_and_normalize_line_modifiers({}), (None, None))

    def test_normalize_sorts(self):
        norm, summary = validate_and_normalize_line_modifiers(
            {"remove": ["b", "a"], "add": ["z", "y"], "substitute": [{"from": "b", "to": "c"}, {"from": "a", "to": "d"}]}
        )
        assert norm is not None
        self.assertEqual(norm["remove"], ["a", "b"])
        self.assertEqual(norm["add"], ["y", "z"])
        self.assertEqual(
            norm["substitute"],
            [{"from": "a", "to": "d"}, {"from": "b", "to": "c"}],
        )
        self.assertIn("Remove:", summary or "")
        self.assertIn("Add:", summary or "")
        self.assertIn("Sub:", summary or "")

    def test_unknown_key(self):
        with self.assertRaises(HTTPException):
            validate_and_normalize_line_modifiers({"extra": []})

    def test_equal(self):
        a, _ = validate_and_normalize_line_modifiers({"remove": ["x"]})
        b, _ = validate_and_normalize_line_modifiers({"remove": ["x"]})
        self.assertTrue(line_modifiers_equal(a, b))
        self.assertFalse(line_modifiers_equal(a, None))


class TestLineModifiersOrderMerge(PgClientTestCase):
    def setUp(self):
        super().setUp()
        self.tenant = models.Tenant(name="LM Tenant")
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

        self.product = models.Product(name="Pizza", price_cents=900, tenant_id=self.tenant.id)
        self.session.add(self.product)
        self.session.commit()
        self.session.refresh(self.product)

    def test_merge_same_modifiers_increments_quantity(self):
        lm = {"remove": ["pepperoni"], "add": ["extra cheese"]}
        p1 = {"items": [{"product_id": self.product.id, "quantity": 1, "line_modifiers": lm}]}
        r1 = self.client.post(f"/menu/{self.table.token}/order", json=p1)
        self.assertEqual(r1.status_code, 200, r1.text)
        oid = r1.json()["order_id"]

        r2 = self.client.post(
            f"/menu/{self.table.token}/order",
            json={"items": [{"product_id": self.product.id, "quantity": 2, "line_modifiers": lm}]},
        )
        self.assertEqual(r2.status_code, 200, r2.text)
        self.assertEqual(r2.json()["order_id"], oid)

        r3 = self.client.get(f"/menu/{self.table.token}/order")
        self.assertEqual(r3.status_code, 200, r3.text)
        body = r3.json()
        self.assertIsNotNone(body.get("order"))
        items = body["order"]["items"]
        self.assertEqual(len(items), 1)
        self.assertEqual(items[0]["quantity"], 3)
        self.assertIn("pepperoni", (items[0].get("line_modifiers_summary") or "").lower())

    def test_different_modifiers_separate_lines(self):
        r1 = self.client.post(
            f"/menu/{self.table.token}/order",
            json={"items": [{"product_id": self.product.id, "quantity": 1, "line_modifiers": {"remove": ["a"]}}]},
        )
        self.assertEqual(r1.status_code, 200, r1.text)
        r2 = self.client.post(
            f"/menu/{self.table.token}/order",
            json={"items": [{"product_id": self.product.id, "quantity": 1, "line_modifiers": {"remove": ["b"]}}]},
        )
        self.assertEqual(r2.status_code, 200, r2.text)
        r3 = self.client.get(f"/menu/{self.table.token}/order")
        items = r3.json()["order"]["items"]
        self.assertEqual(len(items), 2)


if __name__ == "__main__":
    unittest.main()
