"""Tests for link_demo_products_to_catalog seed (name matching, no round-robin)."""
from __future__ import annotations

import unittest
from uuid import uuid4

from pg_client_mixin import PgClientTestCase
from sqlmodel import select

from app import models
from app.seeds.link_demo_products_to_catalog import (
    _find_matching_provider_product,
    _names_match,
    repair_mismatched_links,
    repair_stale_product_backfills,
)


class TestLinkDemoProductsMatching(unittest.TestCase):
    """Pure name-matching tests (no DB)."""

    def test_coca_cola_does_not_match_voll_damm(self):
        beer_catalog = models.ProductCatalog(
            name="Voll-Damm",
            category="Bebidas",
            description="Strong Mediterranean beer",
        )
        beer_pp = models.ProviderProduct(
            provider_id=1,
            catalog_id=1,
            name="Voll-Damm",
            price_cents=350,
            image_filename="voll-damm.jpg",
        )
        match = _find_matching_provider_product(
            "Coca Cola",
            [beer_pp],
            {beer_catalog.id: beer_catalog},
        )
        self.assertIsNone(match)
        self.assertFalse(_names_match("Coca Cola", beer_catalog, beer_pp))

    def test_same_name_matches_catalog_product(self):
        pizza_catalog = models.ProductCatalog(
            name="Margarita",
            category="Main Course",
            description="Classic pizza",
        )
        pizza_pp = models.ProviderProduct(
            provider_id=1,
            catalog_id=pizza_catalog.id,
            name="Margarita",
            price_cents=900,
            image_filename="margarita.jpg",
        )
        beer_catalog = models.ProductCatalog(name="Voll-Damm", category="Bebidas")
        beer_pp = models.ProviderProduct(
            provider_id=1,
            catalog_id=beer_catalog.id,
            name="Voll-Damm",
            price_cents=350,
            image_filename="voll-damm.jpg",
        )
        chosen = _find_matching_provider_product(
            "Margarita",
            [beer_pp, pizza_pp],
            {beer_catalog.id: beer_catalog, pizza_catalog.id: pizza_catalog},
        )
        self.assertIsNotNone(chosen)
        self.assertEqual(chosen.id, pizza_pp.id)


class TestLinkDemoProductsToCatalog(PgClientTestCase):
    def setUp(self):
        super().setUp()
        self.tenant = models.Tenant(
            name="Link Catalog Tenant",
            email=f"pos-link-catalog-{uuid4().hex}@amvara.de",
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

    def _beer_fixtures(self):
        provider = models.Provider(
            name=f"Beer Supplier {uuid4().hex[:8]}",
            token=f"beer-{uuid4().hex}",
        )
        self.session.add(provider)
        self.session.commit()
        self.session.refresh(provider)

        beer_catalog = models.ProductCatalog(
            name="Voll-Damm",
            category="Bebidas",
            description="Strong Mediterranean beer",
        )
        self.session.add(beer_catalog)
        self.session.commit()
        self.session.refresh(beer_catalog)

        beer_pp = models.ProviderProduct(
            provider_id=provider.id,
            catalog_id=beer_catalog.id,
            external_id=f"beer-{uuid4().hex[:8]}",
            name="Voll-Damm",
            price_cents=350,
            image_filename="voll-damm.jpg",
        )
        self.session.add(beer_pp)
        self.session.commit()
        self.session.refresh(beer_pp)
        return beer_catalog, beer_pp

    def test_repair_removes_mismatched_tenant_product_link(self):
        beer_catalog, beer_pp = self._beer_fixtures()
        coca = models.Product(
            tenant_id=self.tenant.id,
            name="Coca Cola",
            price_cents=300,
            category="Beverages",
            image_filename=None,
        )
        self.session.add(coca)
        self.session.commit()
        self.session.refresh(coca)

        bad_link = models.TenantProduct(
            tenant_id=self.tenant.id,
            catalog_id=beer_catalog.id,
            provider_product_id=beer_pp.id,
            product_id=coca.id,
            name="Coca Cola",
            price_cents=300,
            is_active=True,
        )
        self.session.add(bad_link)
        self.session.commit()
        self.session.refresh(bad_link)

        removed = repair_mismatched_links(self.session)
        self.assertEqual(removed, 1)

        remaining = self.session.exec(
            select(models.TenantProduct).where(
                models.TenantProduct.id == bad_link.id
            )
        ).first()
        self.assertIsNone(remaining)

    def test_menu_coca_cola_has_no_beer_image_or_description(self):
        beer_catalog, beer_pp = self._beer_fixtures()
        coca = models.Product(
            tenant_id=self.tenant.id,
            name="Coca Cola",
            price_cents=300,
            category="Beverages",
            image_filename=None,
        )
        self.session.add(coca)
        self.session.commit()
        self.session.refresh(coca)

        self.session.add(
            models.TenantProduct(
                tenant_id=self.tenant.id,
                catalog_id=beer_catalog.id,
                provider_product_id=beer_pp.id,
                product_id=coca.id,
                name="Coca Cola",
                price_cents=300,
                is_active=True,
            )
        )
        self.session.commit()

        repair_mismatched_links(self.session)

        response = self.client.get(f"/menu/{self.table.token}")
        self.assertEqual(response.status_code, 200, response.text)
        products = response.json()["products"]
        coca_items = [p for p in products if p["name"] == "Coca Cola"]
        self.assertEqual(len(coca_items), 1)
        coca_item = coca_items[0]
        self.assertIsNone(coca_item.get("image_filename"))
        self.assertNotIn("Strong Mediterranean beer", coca_item.get("description") or "")
        self.assertEqual(coca_item.get("_source"), "product")

    def test_repair_stale_backfill_clears_orphaned_catalog_description(self):
        """After a bad link was removed, stale Product.description/image must be cleared."""
        coca = models.Product(
            tenant_id=self.tenant.id,
            name="Coca Cola",
            price_cents=300,
            category="Beverages",
            image_filename="88e58b7c-0d90-4483-9c0c-aae6bb55680d.webp",
            description="Strong double malt lager with a rich, full-bodied taste.",
        )
        self.session.add(coca)
        self.session.commit()
        self.session.refresh(coca)

        cleared = repair_stale_product_backfills(self.session)
        self.assertEqual(cleared, 1)
        self.session.refresh(coca)
        self.assertIsNone(coca.image_filename)
        self.assertIsNone(coca.description)

        response = self.client.get(f"/menu/{self.table.token}")
        self.assertEqual(response.status_code, 200, response.text)
        coca_items = [p for p in response.json()["products"] if p["name"] == "Coca Cola"]
        self.assertEqual(len(coca_items), 1)
        self.assertIsNone(coca_items[0].get("image_filename"))
        self.assertIsNone(coca_items[0].get("description"))


if __name__ == "__main__":
    import unittest

    unittest.main()
