"""GET /tables/with-status operational_status: open_order, ready_to_serve, bill_issued."""
from __future__ import annotations

import unittest
from datetime import datetime, timezone
from uuid import uuid4

from pg_client_mixin import PgClientTestCase

from app import models, security


def _bearer_headers(user: models.User) -> dict[str, str]:
    from datetime import timedelta

    data = {
        "sub": user.email,
        "tenant_id": user.tenant_id,
        "provider_id": getattr(user, "provider_id", None),
        "token_version": user.token_version,
    }
    token = security.create_access_token(data, expires_delta=timedelta(minutes=30))
    return {"Authorization": f"Bearer {token}"}


class TestTablesWithStatusOperational(PgClientTestCase):
    def setUp(self) -> None:
        super().setUp()
        tenant = models.Tenant(name="OpStatus Tenant")
        self.session.add(tenant)
        self.session.commit()
        self.session.refresh(tenant)

        owner = models.User(
            email=f"opstatus-owner-{uuid4().hex[:8]}@amvara.de",
            hashed_password=security.get_password_hash("x"),
            full_name="Owner",
            tenant_id=tenant.id,
            role=models.UserRole.owner,
        )
        self.session.add(owner)
        self.session.commit()
        self.session.refresh(owner)
        self.owner = owner

        floor = models.Floor(name="Main", sort_order=0, tenant_id=tenant.id)
        self.session.add(floor)
        self.session.commit()
        self.session.refresh(floor)

        table = models.Table(
            name="T-op",
            token=f"tok-op-{uuid4().hex}",
            floor_id=floor.id,
            tenant_id=tenant.id,
            x_position=0,
            y_position=0,
            rotation=0,
            shape="rectangle",
            width=1,
            height=1,
            seat_count=4,
            is_active=True,
        )
        self.session.add(table)
        self.session.commit()
        self.session.refresh(table)
        self.table_id = table.id
        self.tenant_id = tenant.id

    def _row(self) -> dict:
        h = _bearer_headers(self.owner)
        r = self.client.get("/tables/with-status", headers=h)
        self.assertEqual(r.status_code, 200, r.text)
        rows = r.json()
        return next(x for x in rows if x["id"] == self.table_id)

    def test_open_order_when_preparing(self) -> None:
        order = models.Order(
            table_id=self.table_id,
            tenant_id=self.tenant_id,
            status=models.OrderStatus.preparing,
        )
        self.session.add(order)
        self.session.commit()
        self.session.refresh(order)
        self.assertEqual(self._row()["operational_status"], "open_order")

    def test_ready_to_serve_when_ready_and_no_bill_request(self) -> None:
        order = models.Order(
            table_id=self.table_id,
            tenant_id=self.tenant_id,
            status=models.OrderStatus.ready,
        )
        self.session.add(order)
        self.session.commit()
        self.assertEqual(self._row()["operational_status"], "ready_to_serve")

    def test_bill_issued_when_bill_requested_precedes_kitchen_state(self) -> None:
        order = models.Order(
            table_id=self.table_id,
            tenant_id=self.tenant_id,
            status=models.OrderStatus.preparing,
            bill_requested_at=datetime.now(timezone.utc),
        )
        self.session.add(order)
        self.session.commit()
        self.assertEqual(self._row()["operational_status"], "bill_issued")

    def test_bill_issued_when_ready_and_bill_requested(self) -> None:
        order = models.Order(
            table_id=self.table_id,
            tenant_id=self.tenant_id,
            status=models.OrderStatus.ready,
            bill_requested_at=datetime.now(timezone.utc),
        )
        self.session.add(order)
        self.session.commit()
        self.assertEqual(self._row()["operational_status"], "bill_issued")


if __name__ == "__main__":
    unittest.main()
