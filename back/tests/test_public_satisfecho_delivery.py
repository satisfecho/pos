"""Public Satisfecho Delivery checkout — create + pay without table_token."""
from __future__ import annotations

import unittest
from unittest.mock import MagicMock, patch

from pg_client_mixin import PgClientTestCase

from app import models


class TestPublicSatisfechoDelivery(PgClientTestCase):
    def setUp(self) -> None:
        super().setUp()
        self.tenant = models.Tenant(
            name="Public SD Tenant",
            address="Restaurant St 1",
            stripe_secret_key="sk_test_public_sd",
            stripe_publishable_key="pk_test_public_sd",
        )
        self.session.add(self.tenant)
        self.session.commit()
        self.session.refresh(self.tenant)

        self.product = models.Product(
            tenant_id=self.tenant.id,
            name="Delivery Burger",
            price_cents=1200,
            category="Main",
        )
        self.session.add(self.product)
        self.session.commit()
        self.session.refresh(self.product)

    def _create_public(self, **overrides) -> tuple[dict, int]:
        payload = {
            "items": [{"product_id": self.product.id, "quantity": 1}],
            "delivery_address": "Calle Delivery 5, Madrid",
            "customer_phone": "+34600999888",
            "customer_name": "Guest",
            "notes": "Leave at door",
        }
        payload.update(overrides)
        r = self.client.post(
            f"/public/tenants/{self.tenant.id}/satisfecho-delivery",
            json=payload,
        )
        return r.json() if r.status_code == 200 else {"_raw": r}, r.status_code

    def test_public_create_requires_address_and_phone(self) -> None:
        r = self.client.post(
            f"/public/tenants/{self.tenant.id}/satisfecho-delivery",
            json={
                "items": [{"product_id": self.product.id, "quantity": 1}],
                "delivery_address": "",
                "customer_phone": "+34600999888",
            },
        )
        self.assertEqual(r.status_code, 400, r.text)

        r2 = self.client.post(
            f"/public/tenants/{self.tenant.id}/satisfecho-delivery",
            json={
                "items": [{"product_id": self.product.id, "quantity": 1}],
                "delivery_address": "Somewhere",
                "customer_phone": "",
            },
        )
        self.assertEqual(r2.status_code, 400, r2.text)

    def test_public_create_happy_path(self) -> None:
        body, status = self._create_public()
        self.assertEqual(status, 200, body)
        self.assertEqual(body["order_channel"], "satisfecho_delivery")
        self.assertIsNone(body["table_id"])
        self.assertEqual(body["delivery_address"], "Calle Delivery 5, Madrid")
        self.assertEqual(body["customer_phone"], "+34600999888")
        self.assertEqual(body["total_cents"], 1200)
        self.assertTrue(body.get("public_order_token"))
        self.assertEqual(body.get("stripe_publishable_key"), "pk_test_public_sd")

        order = self.session.get(models.Order, body["id"])
        self.assertIsNotNone(order)
        assert order is not None
        self.assertEqual(order.status, models.OrderStatus.pending)
        self.assertIsNone(order.table_id)

    def test_public_create_unknown_tenant(self) -> None:
        r = self.client.post(
            "/public/tenants/999999/satisfecho-delivery",
            json={
                "items": [{"product_id": self.product.id, "quantity": 1}],
                "delivery_address": "X",
                "customer_phone": "+34600999888",
            },
        )
        self.assertEqual(r.status_code, 404, r.text)

    def test_public_create_rejects_foreign_product(self) -> None:
        other = models.Tenant(name="Other")
        self.session.add(other)
        self.session.commit()
        self.session.refresh(other)
        foreign = models.Product(
            tenant_id=other.id, name="Foreign", price_cents=500, category="Main"
        )
        self.session.add(foreign)
        self.session.commit()
        self.session.refresh(foreign)

        r = self.client.post(
            f"/public/tenants/{self.tenant.id}/satisfecho-delivery",
            json={
                "items": [{"product_id": foreign.id, "quantity": 1}],
                "delivery_address": "Calle 1",
                "customer_phone": "+34600999888",
            },
        )
        self.assertEqual(r.status_code, 400, r.text)

    @patch("stripe.PaymentIntent.retrieve")
    def test_public_stripe_pay_happy_path(self, mock_retrieve) -> None:
        body, status = self._create_public()
        self.assertEqual(status, 200, body)
        order_id = body["id"]
        token = body["public_order_token"]

        mock_intent = MagicMock()
        mock_intent.status = "succeeded"
        mock_intent.amount = 1200
        mock_intent.id = "pi_delivery_ok"
        mock_intent.metadata = {"order_id": str(order_id)}
        mock_retrieve.return_value = mock_intent

        r = self.client.post(
            f"/orders/{order_id}/confirm-payment",
            params={
                "public_order_token": token,
                "payment_intent_id": "pi_delivery_ok",
            },
        )
        self.assertEqual(r.status_code, 200, r.text)
        self.assertEqual(r.json()["status"], "paid")

        self.session.expire_all()
        order = self.session.get(models.Order, order_id)
        assert order is not None
        self.assertEqual(order.status, models.OrderStatus.paid)
        self.assertEqual(order.payment_method, "stripe")
        self.assertIsNotNone(order.paid_at)

    @patch("stripe.PaymentIntent.retrieve")
    def test_public_stripe_pay_rejects_bad_token(self, mock_retrieve) -> None:
        body, status = self._create_public()
        self.assertEqual(status, 200, body)
        order_id = body["id"]

        mock_intent = MagicMock()
        mock_intent.status = "succeeded"
        mock_intent.amount = 1200
        mock_intent.metadata = {"order_id": str(order_id)}
        mock_retrieve.return_value = mock_intent

        r = self.client.post(
            f"/orders/{order_id}/confirm-payment",
            params={
                "public_order_token": "not-a-valid-token",
                "payment_intent_id": "pi_x",
            },
        )
        self.assertEqual(r.status_code, 404, r.text)

    @patch("stripe.PaymentIntent.create")
    def test_create_payment_intent_with_public_token(self, mock_create) -> None:
        body, status = self._create_public()
        self.assertEqual(status, 200, body)
        order_id = body["id"]
        token = body["public_order_token"]

        mock_intent = MagicMock()
        mock_intent.client_secret = "cs_test"
        mock_intent.id = "pi_create_sd"
        mock_create.return_value = mock_intent

        r = self.client.post(
            f"/orders/{order_id}/create-payment-intent",
            params={"public_order_token": token},
        )
        self.assertEqual(r.status_code, 200, r.text)
        self.assertEqual(r.json()["payment_intent_id"], "pi_create_sd")
        self.assertEqual(r.json()["amount"], 1200)
        kwargs = mock_create.call_args.kwargs
        self.assertEqual(kwargs["metadata"]["order_id"], str(order_id))
        self.assertEqual(kwargs["metadata"]["order_channel"], "satisfecho_delivery")
        self.assertNotIn("table_id", kwargs["metadata"])

    def test_payment_requires_exactly_one_token(self) -> None:
        body, status = self._create_public()
        self.assertEqual(status, 200, body)
        order_id = body["id"]

        r = self.client.post(f"/orders/{order_id}/create-payment-intent")
        self.assertEqual(r.status_code, 400, r.text)

        r2 = self.client.post(
            f"/orders/{order_id}/create-payment-intent",
            params={
                "table_token": "abc",
                "public_order_token": body["public_order_token"],
            },
        )
        self.assertEqual(r2.status_code, 400, r2.text)


if __name__ == "__main__":
    unittest.main()
