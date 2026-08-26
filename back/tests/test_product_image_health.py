"""Product image sync + health check helpers."""
from __future__ import annotations

import shutil
import tempfile
import unittest
from pathlib import Path
from unittest import mock
from uuid import uuid4

from pg_client_mixin import PgClientTestCase

from app import models
from app import provider_images
from app.provider_images import (
    product_image_consistency_errors,
    repair_product_image_filename,
    sync_product_images_for_tenant,
)


class TestProductImageSyncHelpers(unittest.TestCase):
    def setUp(self) -> None:
        self._tmpdir = tempfile.mkdtemp()
        self._uploads = Path(self._tmpdir)
        self._patcher = mock.patch.object(provider_images, "UPLOADS_DIR", self._uploads)
        self._patcher.start()

    def tearDown(self) -> None:
        self._patcher.stop()
        shutil.rmtree(self._tmpdir, ignore_errors=True)

    def test_repair_keeps_existing_tenant_upload(self) -> None:
        tenant_id = 9
        custom = "crafted.jpg"
        tenant_dir = self._uploads / str(tenant_id) / "products"
        tenant_dir.mkdir(parents=True)
        (tenant_dir / custom).write_bytes(b"x")

        product = models.Product(
            tenant_id=tenant_id,
            name="Crafted",
            price_cents=500,
            image_filename=custom,
        )
        tp = models.TenantProduct(
            tenant_id=tenant_id,
            catalog_id=1,
            name="Crafted",
            price_cents=500,
            is_active=True,
        )
        result = repair_product_image_filename(mock.MagicMock(), product, tp)
        self.assertEqual(result, custom)


class TestProductImageHealth(PgClientTestCase):
    def setUp(self) -> None:
        super().setUp()
        self._tmpdir = tempfile.mkdtemp()
        self._uploads = Path(self._tmpdir)
        self._patcher = mock.patch.object(provider_images, "UPLOADS_DIR", self._uploads)
        self._patcher.start()

        self.tenant = models.Tenant(name="Health Tenant")
        self.session.add(self.tenant)
        self.session.commit()
        self.session.refresh(self.tenant)

        self.provider = models.Provider(
            name="Img Provider",
            token=f"img-{uuid4().hex[:12]}",
        )
        self.session.add(self.provider)
        self.session.commit()
        self.session.refresh(self.provider)

        self.catalog = models.ProductCatalog(
            name="Menu Pizza",
            category="Main Course",
            subcategory="Pizza",
        )
        self.session.add(self.catalog)
        self.session.commit()
        self.session.refresh(self.catalog)

        products_dir = self._uploads / "providers" / self.provider.token / "products"
        products_dir.mkdir(parents=True)
        (products_dir / "live.jpg").write_bytes(b"ok")

        self.pp = models.ProviderProduct(
            provider_id=self.provider.id,
            catalog_id=self.catalog.id,
            external_id=f"ext-{uuid4().hex[:8]}",
            name="Menu Pizza",
            price_cents=1000,
            image_filename="live.jpg",
        )
        self.session.add(self.pp)
        self.session.commit()
        self.session.refresh(self.pp)

        self.product = models.Product(
            tenant_id=self.tenant.id,
            name="Menu Pizza",
            price_cents=1000,
            image_filename=f"providers/{self.provider.token}/products/stale.jpg",
        )
        self.session.add(self.product)
        self.session.commit()
        self.session.refresh(self.product)

        self.tp = models.TenantProduct(
            tenant_id=self.tenant.id,
            catalog_id=self.catalog.id,
            product_id=self.product.id,
            provider_product_id=self.pp.id,
            name="Menu Pizza",
            price_cents=1000,
            is_active=True,
        )
        self.session.add(self.tp)
        self.session.commit()

    def tearDown(self) -> None:
        self._patcher.stop()
        shutil.rmtree(self._tmpdir, ignore_errors=True)
        super().tearDown()

    def test_sync_then_health_passes(self) -> None:
        stats = sync_product_images_for_tenant(self.session, self.tenant.id)
        self.assertGreaterEqual(stats["repaired"], 1)
        errors = product_image_consistency_errors(self.session, self.tenant.id)
        self.assertEqual(errors, [])


if __name__ == "__main__":
    unittest.main()
