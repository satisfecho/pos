"""GET /menu/{table_token} includes stock alert fields when enabled (#356)."""
from __future__ import annotations

from pg_client_mixin import PgClientTestCase

from app import models


class TestMenuStockAlert(PgClientTestCase):
    def setUp(self):
        super().setUp()
        self.tenant = models.Tenant(
            name="Stock Alert Tenant",
            email="pos-menu-stock-alert@amvara.de",
        )
        self.session.add(self.tenant)
        self.session.commit()
        self.session.refresh(self.tenant)

        self.floor = models.Floor(name="Main", tenant_id=self.tenant.id)
        self.session.add(self.floor)
        self.session.commit()
        self.session.refresh(self.floor)

        self.table = models.Table(
            name="Take Away",
            tenant_id=self.tenant.id,
            floor_id=self.floor.id,
            is_active=True,
        )
        self.session.add(self.table)
        self.session.commit()
        self.session.refresh(self.table)

    def test_legacy_product_stock_fields_in_menu(self):
        product = models.Product(
            tenant_id=self.tenant.id,
            name="Low Stock Soup",
            price_cents=500,
            stock_alert_enabled=True,
            stock_qty=3,
            stock_alert_level=5,
        )
        self.session.add(product)
        self.session.commit()

        response = self.client.get(f"/menu/{self.table.token}")
        self.assertEqual(response.status_code, 200, response.text)
        products = response.json()["products"]
        self.assertEqual(len(products), 1)
        row = products[0]
        self.assertTrue(row["stock_alert_enabled"])
        self.assertEqual(row["stock_qty"], 3)
        self.assertEqual(row["stock_alert_level"], 5)

    def test_stock_fields_omitted_when_disabled(self):
        product = models.Product(
            tenant_id=self.tenant.id,
            name="Plenty Pasta",
            price_cents=800,
            stock_alert_enabled=False,
            stock_qty=20,
            stock_alert_level=5,
        )
        self.session.add(product)
        self.session.commit()

        response = self.client.get(f"/menu/{self.table.token}")
        self.assertEqual(response.status_code, 200, response.text)
        row = response.json()["products"][0]
        self.assertNotIn("stock_alert_enabled", row)
