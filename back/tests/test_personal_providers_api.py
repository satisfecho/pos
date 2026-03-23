"""Personal (tenant-owned) providers: staff PATCH and cross-tenant isolation (GitHub #25)."""
from __future__ import annotations

import unittest
from datetime import timedelta

from pg_client_mixin import PgClientTestCase
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


class TestPersonalProvidersApi(PgClientTestCase):
    def setUp(self) -> None:
        super().setUp()
        self.tenant_a = models.Tenant(name="Providers Tenant A")
        self.tenant_b = models.Tenant(name="Providers Tenant B")
        self.session.add(self.tenant_a)
        self.session.add(self.tenant_b)
        self.session.commit()
        self.session.refresh(self.tenant_a)
        self.session.refresh(self.tenant_b)

        self.owner_a = models.User(
            email="pp-owner-a@test.local",
            hashed_password=get_password_hash("secret"),
            full_name="Owner A",
            tenant_id=self.tenant_a.id,
            role=models.UserRole.owner,
        )
        self.owner_b = models.User(
            email="pp-owner-b@test.local",
            hashed_password=get_password_hash("secret"),
            full_name="Owner B",
            tenant_id=self.tenant_b.id,
            role=models.UserRole.owner,
        )
        self.session.add(self.owner_a)
        self.session.add(self.owner_b)
        self.session.commit()
        self.session.refresh(self.owner_a)
        self.session.refresh(self.owner_b)

        self.global_provider = models.Provider(name="Global Catalog Supplier", tenant_id=None)
        self.personal_a = models.Provider(
            name="My Local Supplier",
            tenant_id=self.tenant_a.id,
        )
        self.session.add(self.global_provider)
        self.session.add(self.personal_a)
        self.session.commit()
        self.session.refresh(self.global_provider)
        self.session.refresh(self.personal_a)

        cat = models.ProductCatalog(
            name="Toilet Paper Roll",
            normalized_name="toilet paper roll",
            category="Supplies",
        )
        self.session.add(cat)
        self.session.commit()
        self.session.refresh(cat)
        self.pp_product_a = models.ProviderProduct(
            catalog_id=cat.id,
            provider_id=self.personal_a.id,
            external_id="ext-tp-1",
            name="Toilet Paper Roll",
            price_cents=199,
        )
        self.session.add(self.pp_product_a)
        self.session.commit()
        self.session.refresh(self.pp_product_a)

    def test_owner_a_patches_personal_provider(self) -> None:
        h = _bearer_headers(self.owner_a)
        r = self.client.patch(
            f"/providers/{self.personal_a.id}",
            json={"name": "Renamed Supplier", "phone": "+1 555 0100", "is_active": True},
            headers=h,
        )
        self.assertEqual(r.status_code, 200, r.text)
        data = r.json()
        self.assertEqual(data["name"], "Renamed Supplier")
        self.assertEqual(data["phone"], "+1 555 0100")
        self.session.refresh(self.personal_a)
        self.assertEqual(self.personal_a.name, "Renamed Supplier")

    def test_patch_duplicate_name_conflict(self) -> None:
        other = models.Provider(name="Other A", tenant_id=self.tenant_a.id)
        self.session.add(other)
        self.session.commit()
        self.session.refresh(other)

        h = _bearer_headers(self.owner_a)
        r = self.client.patch(
            f"/providers/{self.personal_a.id}",
            json={"name": "Other A"},
            headers=h,
        )
        self.assertEqual(r.status_code, 409, r.text)

    def test_cannot_patch_global_provider_from_staff(self) -> None:
        h = _bearer_headers(self.owner_a)
        r = self.client.patch(
            f"/providers/{self.global_provider.id}",
            json={"phone": "nope"},
            headers=h,
        )
        self.assertEqual(r.status_code, 403, r.text)

    def test_tenant_b_cannot_see_or_patch_tenant_a_personal_provider(self) -> None:
        h_b = _bearer_headers(self.owner_b)
        r_get = self.client.get(f"/providers/{self.personal_a.id}", headers=h_b)
        self.assertEqual(r_get.status_code, 404, r_get.text)

        r_patch = self.client.patch(
            f"/providers/{self.personal_a.id}",
            json={"name": "Hacked"},
            headers=h_b,
        )
        self.assertEqual(r_patch.status_code, 404, r_patch.text)

    def test_tenant_b_cannot_list_products_on_tenant_a_provider(self) -> None:
        h_b = _bearer_headers(self.owner_b)
        r = self.client.get(f"/providers/{self.personal_a.id}/products", headers=h_b)
        self.assertEqual(r.status_code, 404, r.text)

    def test_tenant_b_cannot_add_product_to_tenant_a_provider(self) -> None:
        h_b = _bearer_headers(self.owner_b)
        r = self.client.post(
            f"/providers/{self.personal_a.id}/products",
            json={"name": "Evil SKU", "price_cents": 1},
            headers=h_b,
        )
        self.assertEqual(r.status_code, 403, r.text)


if __name__ == "__main__":
    unittest.main()
