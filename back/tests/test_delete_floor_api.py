"""DELETE /floors/{id} must null table.floor_id and return 200 (not FK 500)."""
from __future__ import annotations

import unittest
from datetime import timedelta
from uuid import uuid4

from pg_client_mixin import PgClientTestCase

from app import models, security


def _bearer_headers(user: models.User) -> dict[str, str]:
    data = {
        "sub": user.email,
        "tenant_id": user.tenant_id,
        "provider_id": getattr(user, "provider_id", None),
        "token_version": user.token_version,
    }
    token = security.create_access_token(data, expires_delta=timedelta(minutes=30))
    return {"Authorization": "Bearer " + token}


class TestDeleteFloorApi(PgClientTestCase):
    def setUp(self) -> None:
        super().setUp()
        tenant = models.Tenant(name="DelFloor Tenant")
        self.session.add(tenant)
        self.session.commit()
        self.session.refresh(tenant)

        owner = models.User(
            email=f"del-floor-owner-{uuid4().hex[:8]}@amvara.de",
            hashed_password=security.get_password_hash("x"),
            full_name="Owner",
            tenant_id=tenant.id,
            role=models.UserRole.owner,
        )
        self.session.add(owner)
        self.session.commit()
        self.session.refresh(owner)
        self.owner = owner

        floor = models.Floor(name="Terrace", sort_order=1, tenant_id=tenant.id)
        self.session.add(floor)
        self.session.commit()
        self.session.refresh(floor)
        self.floor_id = floor.id

        table = models.Table(
            name="T-floor-del",
            token=f"tok-floor-del-{uuid4().hex}",
            floor_id=floor.id,
            tenant_id=tenant.id,
            x_position=0,
            y_position=0,
            rotation=0,
            shape="rectangle",
            width=1,
            height=1,
            seat_count=2,
            is_active=False,
        )
        self.session.add(table)
        self.session.commit()
        self.session.refresh(table)
        self.table_id = table.id

    def test_delete_floor_not_found_returns_404_not_500(self) -> None:
        h = _bearer_headers(self.owner)
        r = self.client.delete("/floors/999999999", headers=h)
        self.assertEqual(r.status_code, 404, r.text)

    def test_delete_floor_with_tables_returns_200_and_nulls_floor_id(self) -> None:
        h = _bearer_headers(self.owner)
        r = self.client.delete(f"/floors/{self.floor_id}", headers=h)
        self.assertEqual(r.status_code, 200, r.text)
        self.assertEqual(r.json().get("status"), "deleted")

        self.session.expire_all()
        table = self.session.get(models.Table, self.table_id)
        self.assertIsNotNone(table)
        self.assertIsNone(table.floor_id)
        self.assertIsNone(self.session.get(models.Floor, self.floor_id))


if __name__ == "__main__":
    unittest.main()
