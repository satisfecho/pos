"""tenantproduct.price_cents is NOT NULL; guard against ORM/API clearing it."""
from __future__ import annotations

import unittest
from datetime import timedelta

from pg_client_mixin import PgClientTestCase
from sqlalchemy.exc import InvalidRequestError
from sqlmodel import select

from app import models, security
from app.security import get_password_hash


def _bearer_headers(user: models.User) -> dict[str, str]:
    data = {
        "sub": user.email,
        "tenant_id": user.tenant_id,
        "provider_id": getattr(user, "provider_id", None),
        "token_version": user.token_version,
    }
    token = security.create_access_token(data, expires_delta=timedelta(minutes=30))
    return {"Authorization": f"Bearer {token}"}


class TestTenantProductPriceNotNull(PgClientTestCase):
    def setUp(self) -> None:
        super().setUp()
        self.tenant = models.Tenant(name="TP Price Tenant")
        self.session.add(self.tenant)
        self.session.commit()
        self.session.refresh(self.tenant)

        self.owner = models.User(
            email="tp-price-owner@test.local",
            hashed_password=get_password_hash("secret"),
            full_name="Owner",
            tenant_id=self.tenant.id,
            role=models.UserRole.owner,
        )
        self.session.add(self.owner)
        self.session.commit()
        self.session.refresh(self.owner)

        self.provider = models.Provider(name="TP Price Provider", tenant_id=None)
        self.session.add(self.provider)
        self.session.commit()
        self.session.refresh(self.provider)

        self.catalog = models.ProductCatalog(
            name="Test Catalog Wine",
            normalized_name="test catalog wine",
            category="Wine",
        )
        self.session.add(self.catalog)
        self.session.commit()
        self.session.refresh(self.catalog)

        self.pp = models.ProviderProduct(
            catalog_id=self.catalog.id,
            provider_id=self.provider.id,
            external_id="tp-price-pp-1",
            name="Test Catalog Wine",
            price_cents=7777,
        )
        self.session.add(self.pp)
        self.session.commit()
        self.session.refresh(self.pp)

        self.tenant_product = models.TenantProduct(
            tenant_id=self.tenant.id,
            catalog_id=self.catalog.id,
            provider_product_id=self.pp.id,
            product_id=None,
            name="Menu Wine",
            price_cents=2500,
        )
        self.session.add(self.tenant_product)
        self.session.commit()
        self.session.refresh(self.tenant_product)

    def test_put_explicit_null_price_does_not_clear_db(self) -> None:
        h = _bearer_headers(self.owner)
        r = self.client.put(
            f"/tenant-products/{self.tenant_product.id}",
            json={"price_cents": None},
            headers=h,
        )
        self.assertEqual(r.status_code, 200, r.text)
        self.session.refresh(self.tenant_product)
        self.assertEqual(self.tenant_product.price_cents, 2500)

    def test_before_flush_coalesces_price_from_provider_product(self) -> None:
        self.tenant_product.price_cents = None
        self.session.add(self.tenant_product)
        self.session.flush()
        self.assertEqual(self.tenant_product.price_cents, 7777)

    def test_before_flush_raises_when_no_price_fallback(self) -> None:
        orphan_cat = models.ProductCatalog(
            name="Orphan Cat",
            normalized_name="orphan cat",
            category="Other",
        )
        self.session.add(orphan_cat)
        self.session.commit()
        self.session.refresh(orphan_cat)
        tp = models.TenantProduct(
            tenant_id=self.tenant.id,
            catalog_id=orphan_cat.id,
            provider_product_id=None,
            product_id=None,
            name="No supplier",
            price_cents=333,
        )
        self.session.add(tp)
        self.session.commit()
        self.session.refresh(tp)
        tp.price_cents = None
        self.session.add(tp)
        with self.assertRaises(InvalidRequestError):
            self.session.flush()

    def test_put_updates_price_when_sent(self) -> None:
        h = _bearer_headers(self.owner)
        r = self.client.put(
            f"/tenant-products/{self.tenant_product.id}",
            json={"price_cents": 4999},
            headers=h,
        )
        self.assertEqual(r.status_code, 200, r.text)
        row = self.session.exec(
            select(models.TenantProduct).where(models.TenantProduct.id == self.tenant_product.id)
        ).first()
        assert row is not None
        self.assertEqual(row.price_cents, 4999)


if __name__ == "__main__":
    unittest.main()
