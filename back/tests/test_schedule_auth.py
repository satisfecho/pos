"""Schedule write endpoints — self-only authorization for non-owner/admin roles."""
from __future__ import annotations

import unittest
from datetime import date, timedelta

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


class TestScheduleAuth(PgClientTestCase):
    def setUp(self) -> None:
        super().setUp()
        tenant = models.Tenant(name="Schedule auth test")
        self.session.add(tenant)
        self.session.commit()
        self.session.refresh(tenant)
        self.tenant_id = tenant.id

        self.waiter = models.User(
            email="sa-waiter@test.local",
            hashed_password=security.get_password_hash("secret"),
            full_name="Auth Waiter",
            tenant_id=self.tenant_id,
            role=models.UserRole.waiter,
        )
        self.owner = models.User(
            email="sa-owner@test.local",
            hashed_password=security.get_password_hash("secret"),
            full_name="Auth Owner",
            tenant_id=self.tenant_id,
            role=models.UserRole.owner,
        )
        self.admin = models.User(
            email="sa-admin@test.local",
            hashed_password=security.get_password_hash("secret"),
            full_name="Auth Admin",
            tenant_id=self.tenant_id,
            role=models.UserRole.admin,
        )
        self.session.add(self.waiter)
        self.session.add(self.owner)
        self.session.add(self.admin)
        self.session.commit()
        self.session.refresh(self.waiter)
        self.session.refresh(self.owner)
        self.session.refresh(self.admin)

        from datetime import time

        self.owner_shift = models.Shift(
            tenant_id=self.tenant_id,
            user_id=self.owner.id,
            shift_date=date(2025, 6, 16),
            start_time=time(9, 0),
            end_time=time(17, 0),
            label="Owner shift",
        )
        self.session.add(self.owner_shift)
        self.session.commit()
        self.session.refresh(self.owner_shift)

    def test_waiter_cannot_create_shift_for_owner(self) -> None:
        h = _bearer_headers(self.waiter)
        body = {
            "user_id": self.owner.id,
            "date": "2025-06-17",
            "start_time": "10:00",
            "end_time": "18:00",
        }
        r = self.client.post("/schedule", json=body, headers=h)
        self.assertEqual(r.status_code, 403, r.text)

    def test_waiter_can_create_own_shift(self) -> None:
        h = _bearer_headers(self.waiter)
        body = {
            "user_id": self.waiter.id,
            "date": "2025-06-17",
            "start_time": "10:00",
            "end_time": "18:00",
        }
        r = self.client.post("/schedule", json=body, headers=h)
        self.assertEqual(r.status_code, 200, r.text)

    def test_waiter_cannot_update_owner_shift(self) -> None:
        h = _bearer_headers(self.waiter)
        r = self.client.put(
            f"/schedule/{self.owner_shift.id}",
            json={"start_time": "11:00"},
            headers=h,
        )
        self.assertEqual(r.status_code, 403, r.text)

    def test_waiter_cannot_delete_owner_shift(self) -> None:
        h = _bearer_headers(self.waiter)
        r = self.client.delete(f"/schedule/{self.owner_shift.id}", headers=h)
        self.assertEqual(r.status_code, 403, r.text)

    def test_waiter_cannot_reassign_own_shift_to_owner(self) -> None:
        from datetime import time

        own = models.Shift(
            tenant_id=self.tenant_id,
            user_id=self.waiter.id,
            shift_date=date(2025, 6, 18),
            start_time=time(10, 0),
            end_time=time(18, 0),
        )
        self.session.add(own)
        self.session.commit()
        self.session.refresh(own)
        h = _bearer_headers(self.waiter)
        r = self.client.put(
            f"/schedule/{own.id}",
            json={"user_id": self.owner.id},
            headers=h,
        )
        self.assertEqual(r.status_code, 403, r.text)

    def test_admin_can_update_owner_shift(self) -> None:
        h = _bearer_headers(self.admin)
        r = self.client.put(
            f"/schedule/{self.owner_shift.id}",
            json={"label": "Updated by admin"},
            headers=h,
        )
        self.assertEqual(r.status_code, 200, r.text)
        self.assertEqual(r.json().get("label"), "Updated by admin")

    def test_admin_can_create_shift_for_waiter(self) -> None:
        h = _bearer_headers(self.admin)
        body = {
            "user_id": self.waiter.id,
            "date": "2025-06-19",
            "start_time": "09:00",
            "end_time": "15:00",
        }
        r = self.client.post("/schedule", json=body, headers=h)
        self.assertEqual(r.status_code, 200, r.text)

    def test_waiter_bulk_for_owner_forbidden(self) -> None:
        h = _bearer_headers(self.waiter)
        body = {
            "user_id": self.owner.id,
            "year": 2025,
            "month": 7,
            "weekdays": [1, 2, 3, 4, 5],
            "start_time": "10:00",
            "end_time": "18:00",
            "skip_days_with_existing_shift": True,
        }
        r = self.client.post("/schedule/bulk", json=body, headers=h)
        self.assertEqual(r.status_code, 403, r.text)


if __name__ == "__main__":
    unittest.main()
