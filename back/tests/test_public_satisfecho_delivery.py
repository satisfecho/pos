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
        self.assertEqual(body.get("delivery_fee_cents"), 0)
        self.assertEqual(body.get("subtotal_cents"), 1200)
        self.assertTrue(body.get("public_order_token"))
        self.assertEqual(body.get("stripe_publishable_key"), "pk_test_public_sd")

        order = self.session.get(models.Order, body["id"])
        self.assertIsNotNone(order)
        assert order is not None
        self.assertEqual(order.status, models.OrderStatus.pending)
        self.assertIsNone(order.table_id)
        self.assertEqual(order.session_id, "public_satisfecho_delivery")
        self.assertEqual(order.delivery_fee_cents, 0)

    def test_public_create_applies_delivery_fee(self) -> None:
        self.tenant.delivery_fee_cents = 350
        self.session.add(self.tenant)
        self.session.commit()

        body, status = self._create_public()
        self.assertEqual(status, 200, body)
        self.assertEqual(body["subtotal_cents"], 1200)
        self.assertEqual(body["delivery_fee_cents"], 350)
        self.assertEqual(body["total_cents"], 1550)

        order = self.session.get(models.Order, body["id"])
        assert order is not None
        self.assertEqual(order.delivery_fee_cents, 350)

    def test_public_create_rejects_outside_postal_zone(self) -> None:
        self.tenant.delivery_postal_codes = '["28001","28002"]'
        self.session.add(self.tenant)
        self.session.commit()

        body, status = self._create_public(postal_code="99999")
        self.assertEqual(status, 400, body)

        body_ok, status_ok = self._create_public(postal_code="28001")
        self.assertEqual(status_ok, 200, body_ok)

    def test_public_create_rejects_outside_radius(self) -> None:
        self.tenant.latitude = 40.4168
        self.tenant.longitude = -3.7038
        self.tenant.delivery_radius_meters = 500
        self.session.add(self.tenant)
        self.session.commit()

        # Far away (~10km+)
        body, status = self._create_public(
            delivery_latitude=40.5,
            delivery_longitude=-3.7,
        )
        self.assertEqual(status, 400, body)

        body_ok, status_ok = self._create_public(
            delivery_latitude=40.4170,
            delivery_longitude=-3.7040,
        )
        self.assertEqual(status_ok, 200, body_ok)

    def test_public_delivery_config_and_track_status(self) -> None:
        self.tenant.delivery_fee_cents = 200
        self.tenant.delivery_postal_codes = '["28013"]'
        self.session.add(self.tenant)
        self.session.commit()

        cfg = self.client.get(
            f"/public/tenants/{self.tenant.id}/satisfecho-delivery-config"
        )
        self.assertEqual(cfg.status_code, 200, cfg.text)
        self.assertEqual(cfg.json()["delivery_fee_cents"], 200)
        self.assertTrue(cfg.json()["postal_codes_required"])
        self.assertEqual(cfg.json()["postal_codes"], ["28013"])

        body, status = self._create_public(postal_code="28013")
        self.assertEqual(status, 200, body)
        order_id = body["id"]
        token = body["public_order_token"]

        track = self.client.get(
            f"/public/orders/{order_id}/delivery-status",
            params={"public_order_token": token},
        )
        self.assertEqual(track.status_code, 200, track.text)
        self.assertEqual(track.json()["status"], "awaiting_payment")
        self.assertEqual(track.json()["delivery_fee_cents"], 200)
        self.assertEqual(track.json()["total_cents"], 1400)

        bad = self.client.get(
            f"/public/orders/{order_id}/delivery-status",
            params={"public_order_token": "bad-token"},
        )
        self.assertEqual(bad.status_code, 404, bad.text)

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

    def test_public_create_accepts_tenant_product_menu_ids(self) -> None:
        """Public menu posts TenantProduct.id; must resolve to linked Product (#304)."""
        linked = models.Product(
            tenant_id=self.tenant.id,
            name="Amstel Radler Product",
            price_cents=350,
            category="Drinks",
        )
        self.session.add(linked)
        self.session.commit()
        self.session.refresh(linked)

        catalog = models.ProductCatalog(
            name="Amstel Radler Catalog",
            category="Drinks",
        )
        self.session.add(catalog)
        self.session.commit()
        self.session.refresh(catalog)

        tp = models.TenantProduct(
            tenant_id=self.tenant.id,
            catalog_id=catalog.id,
            product_id=linked.id,
            name="Amstel Radler",
            price_cents=350,
            is_active=True,
        )
        self.session.add(tp)
        self.session.commit()
        self.session.refresh(tp)

        self.assertNotEqual(tp.id, linked.id)

        body, status = self._create_public(
            items=[{"product_id": tp.id, "quantity": 2}],
        )
        self.assertEqual(status, 200, body)
        self.assertEqual(body["total_cents"], 700)

        from sqlmodel import select

        items = self.session.exec(
            select(models.OrderItem).where(models.OrderItem.order_id == body["id"])
        ).all()
        self.assertEqual(len(items), 1)
        self.assertEqual(items[0].product_id, linked.id)
        self.assertEqual(items[0].quantity, 2)

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

        track = self.client.get(
            f"/public/orders/{order_id}/delivery-status",
            params={"public_order_token": token},
        )
        self.assertEqual(track.status_code, 200, track.text)
        self.assertEqual(track.json()["status"], "received")
        self.assertTrue(track.json()["paid"])

    @patch("stripe.PaymentIntent.retrieve")
    def test_public_stripe_pay_includes_delivery_fee(self, mock_retrieve) -> None:
        self.tenant.delivery_fee_cents = 300
        self.session.add(self.tenant)
        self.session.commit()

        body, status = self._create_public()
        self.assertEqual(status, 200, body)
        order_id = body["id"]
        token = body["public_order_token"]
        self.assertEqual(body["total_cents"], 1500)

        mock_intent = MagicMock()
        mock_intent.status = "succeeded"
        mock_intent.amount = 1500
        mock_intent.id = "pi_delivery_fee"
        mock_intent.metadata = {"order_id": str(order_id)}
        mock_retrieve.return_value = mock_intent

        r = self.client.post(
            f"/orders/{order_id}/confirm-payment",
            params={
                "public_order_token": token,
                "payment_intent_id": "pi_delivery_fee",
            },
        )
        self.assertEqual(r.status_code, 200, r.text)

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
