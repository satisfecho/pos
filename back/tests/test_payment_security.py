import unittest
from unittest.mock import MagicMock, patch

from pg_client_mixin import PgClientTestCase
from stripe import StripeObject

from app import models
from app.main import _stripe_metadata_get


def _stripe_metadata(**kwargs) -> StripeObject:
    """Real StripeObject metadata (no .get) — regression guard for #427."""
    return StripeObject.construct_from(kwargs, key=None)


class TestPaymentSecurity(PgClientTestCase):
    def setUp(self):
        super().setUp()
        self.setup_data()

    def setup_data(self):
        self.tenant = models.Tenant(name="Test Restaurant", stripe_secret_key="sk_test_123")
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
            name="Expensive Wine",
            price_cents=10000,
            tenant_id=self.tenant.id,
        )
        self.session.add(self.product)
        self.session.commit()
        self.session.refresh(self.product)

    def test_stripe_metadata_get_handles_stripeobject_without_dict_get(self):
        """stripe-python 16 StripeObject has no .get; helper must not 500 (#427)."""
        meta = _stripe_metadata(order_id="42", tenant_id="1")
        with self.assertRaises(AttributeError):
            meta.get("order_id")  # type: ignore[attr-defined]
        self.assertEqual(_stripe_metadata_get(meta, "order_id"), "42")
        self.assertIsNone(_stripe_metadata_get(meta, "missing"))
        self.assertEqual(_stripe_metadata_get({"order_id": "7"}, "order_id"), "7")
        self.assertIsNone(_stripe_metadata_get(None, "order_id"))

    @patch("stripe.PaymentIntent.retrieve")
    def test_prevent_payment_bypass_amount_mismatch(self, mock_retrieve):
        response = self.client.post(
            f"/menu/{self.table.token}/order",
            json={
                "items": [{"product_id": self.product.id, "quantity": 1}],
                "notes": "Expensive Order",
            },
        )
        self.assertEqual(response.status_code, 200)
        order_data = response.json()
        order_id = order_data["order_id"]

        mock_intent = MagicMock()
        mock_intent.status = "succeeded"
        mock_intent.amount = 100
        mock_intent.id = "pi_cheap_123"
        mock_intent.metadata = _stripe_metadata(order_id=str(order_id))
        mock_retrieve.return_value = mock_intent

        response = self.client.post(
            f"/orders/{order_id}/confirm-payment",
            params={
                "table_token": self.table.token,
                "payment_intent_id": "pi_cheap_123",
            },
        )
        self.assertEqual(response.status_code, 400)
        self.assertIn("Payment mismatch: Amount", response.json()["detail"])

    @patch("stripe.PaymentIntent.retrieve")
    def test_prevent_payment_bypass_order_mismatch(self, mock_retrieve):
        response = self.client.post(
            f"/menu/{self.table.token}/order",
            json={
                "items": [{"product_id": self.product.id, "quantity": 1}],
                "notes": "Expensive Order",
            },
        )
        self.assertEqual(response.status_code, 200)
        order_data = response.json()
        order_id = order_data["order_id"]

        mock_intent = MagicMock()
        mock_intent.status = "succeeded"
        mock_intent.amount = 10000
        mock_intent.id = "pi_wrong_order"
        mock_intent.metadata = _stripe_metadata(order_id="9999")
        mock_retrieve.return_value = mock_intent

        response = self.client.post(
            f"/orders/{order_id}/confirm-payment",
            params={
                "table_token": self.table.token,
                "payment_intent_id": "pi_wrong_order",
            },
        )
        self.assertEqual(response.status_code, 400)
        self.assertIn("Payment mismatch: Payment does not belong to this order", response.json()["detail"])

    @patch("stripe.PaymentIntent.retrieve")
    def test_confirm_payment_missing_metadata_order_id_is_400(self, mock_retrieve):
        """Missing order_id on StripeObject metadata → controlled 400, not 500 (#427)."""
        response = self.client.post(
            f"/menu/{self.table.token}/order",
            json={
                "items": [{"product_id": self.product.id, "quantity": 1}],
                "notes": "Missing meta",
            },
        )
        self.assertEqual(response.status_code, 200)
        order_id = response.json()["order_id"]

        mock_intent = MagicMock()
        mock_intent.status = "succeeded"
        mock_intent.amount = 10000
        mock_intent.id = "pi_no_meta_order"
        mock_intent.metadata = _stripe_metadata(tenant_id="1")
        mock_retrieve.return_value = mock_intent

        response = self.client.post(
            f"/orders/{order_id}/confirm-payment",
            params={
                "table_token": self.table.token,
                "payment_intent_id": "pi_no_meta_order",
            },
        )
        self.assertEqual(response.status_code, 400)
        self.assertIn("Payment mismatch: Payment does not belong to this order", response.json()["detail"])

    @patch("stripe.PaymentIntent.retrieve")
    def test_payment_success(self, mock_retrieve):
        response = self.client.post(
            f"/menu/{self.table.token}/order",
            json={
                "items": [{"product_id": self.product.id, "quantity": 1}],
                "notes": "Expensive Order",
            },
        )
        self.assertEqual(response.status_code, 200)
        order_data = response.json()
        order_id = order_data["order_id"]

        mock_intent = MagicMock()
        mock_intent.status = "succeeded"
        mock_intent.amount = 10000
        mock_intent.id = "pi_correct"
        mock_intent.metadata = _stripe_metadata(order_id=str(order_id))
        mock_retrieve.return_value = mock_intent

        response = self.client.post(
            f"/orders/{order_id}/confirm-payment",
            params={
                "table_token": self.table.token,
                "payment_intent_id": "pi_correct",
            },
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["status"], "paid")

    @patch("stripe.PaymentIntent.create")
    def test_create_payment_intent_body_contract(self, mock_create):
        """Success body still exposes client_secret, payment_intent_id, amount (#425)."""
        response = self.client.post(
            f"/menu/{self.table.token}/order",
            json={
                "items": [{"product_id": self.product.id, "quantity": 1}],
                "notes": "Create intent body",
            },
        )
        self.assertEqual(response.status_code, 200)
        order_id = response.json()["order_id"]

        mock_intent = MagicMock()
        mock_intent.client_secret = "cs_test_body"
        mock_intent.id = "pi_body_contract"
        mock_create.return_value = mock_intent

        response = self.client.post(
            f"/orders/{order_id}/create-payment-intent",
            params={"table_token": self.table.token},
        )
        self.assertEqual(response.status_code, 200, response.text)
        body = response.json()
        self.assertEqual(body["client_secret"], "cs_test_body")
        self.assertEqual(body["payment_intent_id"], "pi_body_contract")
        self.assertEqual(body["amount"], 10000)


if __name__ == "__main__":
    unittest.main()
