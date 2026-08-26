"""GET /products repairs orphan Product.image_filename from linked TenantProduct."""
from __future__ import annotations

import shutil
import tempfile
import unittest
from pathlib import Path
from unittest import mock
from uuid import uuid4

from pg_client_mixin import PgClientTestCase

from app import models, security
from app import provider_images


def _bearer_headers(user: models.User) -> dict[str, str]:
    token = security.create_access_token(
        {
            "sub": user.email,
            "tenant_id": user.tenant_id,
            "provider_id": getattr(user, "provider_id", None),
            "token_version": user.token_version,
        }
    )
    return {"Authorization": f"Bearer {token}"}


class TestListProductsImageBackfill(PgClientTestCase):
    def setUp(self) -> None:
        super().setUp()
        self._tmpdir = tempfile.mkdtemp()
        self._uploads = Path(self._tmpdir)
        self._patcher = mock.patch.object(provider_images, "UPLOADS_DIR", self._uploads)
        self._patcher.start()

        self.tenant = models.Tenant(name="Image Backfill Tenant")
        self.session.add(self.tenant)
        self.session.commit()
        self.session.refresh(self.tenant)

        self.owner = models.User(
            email=f"img-backfill-{uuid4().hex[:8]}@amvara.de",
            hashed_password=security.get_password_hash("secret"),
            full_name="Owner",
            tenant_id=self.tenant.id,
            role=models.UserRole.owner,
        )
        self.session.add(self.owner)
        self.session.commit()
        self.session.refresh(self.owner)
        self.headers = _bearer_headers(self.owner)

        self.provider = models.Provider(
            name="Pizza Provider",
            token=f"pizza-{uuid4().hex[:12]}",
        )
        self.session.add(self.provider)
        self.session.commit()
        self.session.refresh(self.provider)

        self.catalog = models.ProductCatalog(
            name=f"Catalog Pizza {uuid4().hex[:8]}",
            category="Main Course",
            subcategory="Pizza",
        )
        self.session.add(self.catalog)
        self.session.commit()
        self.session.refresh(self.catalog)

        products_dir = self._uploads / "providers" / self.provider.token / "products"
        products_dir.mkdir(parents=True)
        (products_dir / "current.jpg").write_bytes(b"ok")

        self.pp = models.ProviderProduct(
            provider_id=self.provider.id,
            catalog_id=self.catalog.id,
            external_id=f"ext-{uuid4().hex[:8]}",
            name="Linked Pizza",
            price_cents=1200,
            image_filename="current.jpg",
        )
        self.session.add(self.pp)
        self.session.commit()
        self.session.refresh(self.pp)

        stale = (
            f"providers/{self.provider.token}/products/stale-missing.jpg"
        )
        self.product = models.Product(
            tenant_id=self.tenant.id,
            name="Linked Pizza",
            price_cents=1200,
            image_filename=stale,
        )
        self.session.add(self.product)
        self.session.commit()
        self.session.refresh(self.product)

        self.tp = models.TenantProduct(
            tenant_id=self.tenant.id,
            catalog_id=self.catalog.id,
            product_id=self.product.id,
            provider_product_id=self.pp.id,
            name="Linked Pizza",
            price_cents=1200,
            is_active=True,
        )
        self.session.add(self.tp)
        self.session.commit()
        self.session.refresh(self.tp)

    def tearDown(self) -> None:
        self._patcher.stop()
        shutil.rmtree(self._tmpdir, ignore_errors=True)
        super().tearDown()

    def test_list_products_repairs_stale_provider_image_path(self) -> None:
        r = self.client.get("/products", headers=self.headers)
        self.assertEqual(r.status_code, 200, r.text)
        row = next(p for p in r.json() if p["id"] == self.product.id)
        expected = f"providers/{self.provider.token}/products/current.jpg"
        self.assertEqual(row["image_filename"], expected)

        self.session.refresh(self.product)
        self.assertEqual(self.product.image_filename, expected)

    def test_list_products_keeps_custom_tenant_upload(self) -> None:
        tenant_dir = self._uploads / str(self.tenant.id) / "products"
        tenant_dir.mkdir(parents=True, exist_ok=True)
        custom_name = "custom-crafted.jpg"
        (tenant_dir / custom_name).write_bytes(b"custom")

        self.product.image_filename = custom_name
        self.session.add(self.product)
        self.session.commit()

        r = self.client.get("/products", headers=self.headers)
        self.assertEqual(r.status_code, 200, r.text)
        row = next(p for p in r.json() if p["id"] == self.product.id)
        self.assertEqual(row["image_filename"], custom_name)

        self.session.refresh(self.product)
        self.assertEqual(self.product.image_filename, custom_name)


if __name__ == "__main__":
    unittest.main()
