"""Tenant price_display_mode + payable totals alignment (#455)."""

from __future__ import annotations

from datetime import date, timedelta

from pg_client_mixin import PgClientTestCase

from app import models, security
from app.order_payment_service import order_due_cents
from app.price_display import (
    display_unit_cents,
    net_unit_cents_from_inclusive,
    normalize_price_display_mode,
    tax_amount_cents_inclusive,
)


def _bearer_headers(user: models.User) -> dict[str, str]:
    data = {
        "sub": user.email,
        "tenant_id": user.tenant_id,
        "provider_id": getattr(user, "provider_id", None),
        "token_version": user.token_version,
    }
    token = security.create_access_token(data, expires_delta=timedelta(minutes=30))
    return {"Authorization": f"Bearer {token}"}


class TestPriceDisplayHelpers(PgClientTestCase):
    def test_normalize_and_net_math(self) -> None:
        self.assertEqual(normalize_price_display_mode(None), "inclusive")
        self.assertEqual(normalize_price_display_mode("EXCLUSIVE"), "exclusive")
        self.assertEqual(normalize_price_display_mode("weird"), "inclusive")
        # 1100 incl. @ 10% → tax 100, net 1000
        self.assertEqual(tax_amount_cents_inclusive(1100, 1, 10), 100)
        self.assertEqual(net_unit_cents_from_inclusive(1100, 10), 1000)
        self.assertEqual(
            display_unit_cents(1100, mode="exclusive", tax_rate_percent=10), 1000
        )
        self.assertEqual(
            display_unit_cents(1100, mode="inclusive", tax_rate_percent=10), 1100
        )


class TestPriceDisplaySettingsAndTotals(PgClientTestCase):
    def setUp(self) -> None:
        super().setUp()
        self.tenant = models.Tenant(
            name="Price Display Cafe",
            timezone="UTC",
            delivery_fee_cents=250,
        )
        self.session.add(self.tenant)
        self.session.commit()
        self.session.refresh(self.tenant)

        pwd = security.get_password_hash("x")
        self.admin = models.User(
            email="price-display-admin@amvara.de",
            hashed_password=pwd,
            full_name="Admin",
            role=models.UserRole.admin,
            tenant_id=self.tenant.id,
        )
        self.session.add(self.admin)
        self.session.commit()
        self.session.refresh(self.admin)

        self.tax10 = models.Tax(
            tenant_id=self.tenant.id,
            name="IVA 10%",
            rate_percent=10,
            valid_from=date(2020, 1, 1),
        )
        self.session.add(self.tax10)
        self.session.commit()
        self.session.refresh(self.tax10)
        self.tenant.default_tax_id = self.tax10.id
        self.session.add(self.tenant)
        self.session.commit()
        self.session.refresh(self.tenant)

        self.product = models.Product(
            tenant_id=self.tenant.id,
            name="Burger",
            price_cents=1100,
            category="Main Course",
        )
        self.session.add(self.product)
        self.session.commit()
        self.session.refresh(self.product)

    def test_settings_get_default_and_put_mode(self) -> None:
        ah = _bearer_headers(self.admin)
        r = self.client.get("/tenant/settings", headers=ah)
        self.assertEqual(r.status_code, 200, r.text)
        self.assertEqual(r.json().get("price_display_mode"), "inclusive")

        bad = self.client.put(
            "/tenant/settings",
            headers=ah,
            json={"price_display_mode": "net-only"},
        )
        self.assertEqual(bad.status_code, 400, bad.text)

        ok = self.client.put(
            "/tenant/settings",
            headers=ah,
            json={"price_display_mode": "exclusive"},
        )
        self.assertEqual(ok.status_code, 200, ok.text)
        self.assertEqual(ok.json().get("price_display_mode"), "exclusive")

        r2 = self.client.get("/tenant/settings", headers=ah)
        self.assertEqual(r2.json().get("price_display_mode"), "exclusive")

    def test_delivery_order_due_includes_fee_matches_list_total(self) -> None:
        order = models.Order(
            tenant_id=self.tenant.id,
            status=models.OrderStatus.pending,
            order_channel=models.OrderChannel.satisfecho_delivery,
            delivery_fee_cents=250,
            customer_name="Guest",
        )
        self.session.add(order)
        self.session.commit()
        self.session.refresh(order)
        item = models.OrderItem(
            order_id=order.id,
            product_id=self.product.id,
            product_name="Burger",
            quantity=1,
            price_cents=1100,
            status=models.OrderItemStatus.pending,
        )
        self.session.add(item)
        self.session.commit()

        due = order_due_cents(self.session, order, include_tip=True)
        self.assertEqual(due, 1350)  # 1100 + 250 fee

        ah = _bearer_headers(self.admin)
        listed = self.client.get("/orders", headers=ah)
        self.assertEqual(listed.status_code, 200, listed.text)
        rows = listed.json()
        match = next((o for o in rows if o["id"] == order.id), None)
        self.assertIsNotNone(match)
        assert match is not None
        self.assertEqual(match["total_cents"], 1350)
        self.assertEqual(match["delivery_fee_cents"], 250)
        self.assertEqual(match["amount_due_cents"], 1350)
        self.assertEqual(match["total_cents"], match["amount_due_cents"])
