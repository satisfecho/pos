"""Kitchen prep station resolution for KDS order lines (no DB)."""

import unittest

from app import models
from app.kitchen_stations_util import normalize_display_route, resolve_order_item_kds


class TestKitchenStationResolve(unittest.TestCase):
    def setUp(self) -> None:
        self.tenant = models.Tenant(id=1, name="T")
        self.st_grill = models.KitchenStation(
            id=10, tenant_id=1, name="Grill", sort_order=0, display_route="kitchen"
        )
        self.st_bar = models.KitchenStation(
            id=20, tenant_id=1, name="Bar tap", sort_order=0, display_route="bar"
        )
        self.by_id = {10: self.st_grill, 20: self.st_bar}

    def test_explicit_product_station(self) -> None:
        p = models.Product(
            id=1, tenant_id=1, name="Steak", price_cents=100, kitchen_station_id=10
        )
        self.assertEqual(
            resolve_order_item_kds(p, self.tenant, self.by_id),
            (10, "Grill", "kitchen"),
        )

    def test_default_kitchen_for_non_beverage(self) -> None:
        self.tenant.default_kitchen_station_id = 10
        p = models.Product(
            id=1, tenant_id=1, name="Soup", price_cents=100, category="Main Course"
        )
        self.assertEqual(
            resolve_order_item_kds(p, self.tenant, self.by_id),
            (10, "Grill", "kitchen"),
        )

    def test_default_bar_for_beverages(self) -> None:
        self.tenant.default_bar_station_id = 20
        p = models.Product(
            id=1, tenant_id=1, name="Cola", price_cents=100, category="Beverages"
        )
        self.assertEqual(
            resolve_order_item_kds(p, self.tenant, self.by_id),
            (20, "Bar tap", "bar"),
        )

    def test_beverage_legacy_route_when_no_default(self) -> None:
        p = models.Product(
            id=1, tenant_id=1, name="Beer", price_cents=100, category="Beverages"
        )
        self.assertEqual(
            resolve_order_item_kds(p, self.tenant, self.by_id),
            (None, None, "bar"),
        )

    def test_normalize_display_route(self) -> None:
        self.assertEqual(normalize_display_route("KITCHEN"), "kitchen")
        with self.assertRaises(ValueError):
            normalize_display_route("grill")


if __name__ == "__main__":
    unittest.main()
