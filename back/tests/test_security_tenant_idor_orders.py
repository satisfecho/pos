"""Sample IDOR guard: staff cannot mutate another tenant's orders by ID."""
from __future__ import annotations

import unittest
from datetime import timedelta

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
    return {"Authorization": f"Bearer {token}"}


class TestSecurityTenantIdorOrders(PgClientTestCase):
    def setUp(self) -> None:
        super().setUp()
        self.t_a = models.Tenant(name="Tenant A")
        self.t_b = models.Tenant(name="Tenant B")
        self.session.add(self.t_a)
        self.session.add(self.t_b)
        self.session.commit()
        self.session.refresh(self.t_a)
        self.session.refresh(self.t_b)

        self.owner_a = models.User(
            email="owner-a@idor.test",
            hashed_password=security.get_password_hash("x"),
            full_name="Owner A",
            tenant_id=self.t_a.id,
            role=models.UserRole.owner,
        )
        self.owner_b = models.User(
            email="owner-b@idor.test",
            hashed_password=security.get_password_hash("x"),
            full_name="Owner B",
            tenant_id=self.t_b.id,
            role=models.UserRole.owner,
        )
        self.session.add(self.owner_a)
        self.session.add(self.owner_b)
        self.session.commit()
        self.session.refresh(self.owner_a)
        self.session.refresh(self.owner_b)

        floor_b = models.Floor(name="Main", sort_order=0, tenant_id=self.t_b.id)
        self.session.add(floor_b)
        self.session.commit()
        self.session.refresh(floor_b)

        table_b = models.Table(
            name="T1",
            token="tok-idor-b-unique",
            floor_id=floor_b.id,
            tenant_id=self.t_b.id,
            x_position=0,
            y_position=0,
            rotation=0,
            shape="rect",
            width=1,
            height=1,
            seat_count=2,
            is_active=False,
        )
        self.session.add(table_b)
        self.session.commit()
        self.session.refresh(table_b)

        order_b = models.Order(
            tenant_id=self.t_b.id,
            table_id=table_b.id,
            status=models.OrderStatus.pending,
        )
        self.session.add(order_b)
        self.session.commit()
        self.session.refresh(order_b)
        self.order_b_id = order_b.id

    def test_cannot_soft_delete_other_tenant_order(self) -> None:
        """DELETE /orders/{id} must 404 when order belongs to another tenant."""
        h = _bearer_headers(self.owner_a)
        r = self.client.delete(f"/orders/{self.order_b_id}", headers=h)
        self.assertEqual(r.status_code, 404, r.text)


if __name__ == "__main__":
    unittest.main()
