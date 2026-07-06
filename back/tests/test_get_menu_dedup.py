"""Tests for GET /menu/{table_token} product deduplication."""
from __future__ import annotations

from pg_client_mixin import PgClientTestCase

from app import models


class TestGetMenuDedup(PgClientTestCase):
    def setUp(self):
        super().setUp()
        self.tenant = models.Tenant(
            name="Table Menu Tenant",
            email="pos-table-menu-dedup@amvara.de",
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

    def test_linked_legacy_product_not_duplicated(self):
        legacy = models.Product(
            tenant_id=self.tenant.id,
            name="Demo Burger",
            price_cents=900,
            description="Classic burger",
            category="Main Course",
        )
        self.session.add(legacy)
        self.session.commit()
        self.session.refresh(legacy)

        catalog = models.ProductCatalog(
            name="Demo Burger Catalog",
            category="Main Course",
            description="Classic burger",
        )
        self.session.add(catalog)
        self.session.commit()
        self.session.refresh(catalog)

        tp = models.TenantProduct(
            tenant_id=self.tenant.id,
            catalog_id=catalog.id,
            product_id=legacy.id,
            name="Demo Burger",
            price_cents=900,
            is_active=True,
        )
        self.session.add(tp)
        self.session.commit()
        self.session.refresh(tp)

        response = self.client.get(f"/menu/{self.table.token}")
        self.assertEqual(response.status_code, 200, response.text)
        products = response.json()["products"]
        self.assertEqual(len(products), 1)
        self.assertEqual(products[0]["name"], "Demo Burger")
        self.assertEqual(products[0]["_source"], "tenant_product")
        self.assertEqual(products[0]["id"], tp.id)
        self.assertNotEqual(products[0]["id"], legacy.id)

    def test_unlinked_legacy_and_tenant_product_both_returned(self):
        legacy_only = models.Product(
            tenant_id=self.tenant.id,
            name="Legacy Only",
            price_cents=500,
            category="Snacks",
        )
        self.session.add(legacy_only)
        self.session.commit()

        catalog = models.ProductCatalog(
            name="Catalog Item",
            category="Drinks",
        )
        self.session.add(catalog)
        self.session.commit()
        self.session.refresh(catalog)

        self.session.add(
            models.TenantProduct(
                tenant_id=self.tenant.id,
                catalog_id=catalog.id,
                name="Catalog Drink",
                price_cents=300,
                is_active=True,
            )
        )
        self.session.commit()

        response = self.client.get(f"/menu/{self.table.token}")
        self.assertEqual(response.status_code, 200, response.text)
        products = response.json()["products"]
        self.assertEqual(len(products), 2)
        names = {p["name"] for p in products}
        self.assertEqual(names, {"Legacy Only", "Catalog Drink"})
