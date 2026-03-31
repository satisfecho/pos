"""POST /schedule/copy-week — copy Mon–Sun week of shifts to another week."""

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


class TestScheduleCopyWeek(PgClientTestCase):
    def setUp(self) -> None:
        super().setUp()
        tenant = models.Tenant(name="Schedule copy week test")
        self.session.add(tenant)
        self.session.commit()
        self.session.refresh(tenant)
        self.tenant_id = tenant.id

        self.waiter = models.User(
            email="scw-waiter@test.local",
            hashed_password=security.get_password_hash("secret"),
            full_name="Copy Waiter",
            tenant_id=self.tenant_id,
            role=models.UserRole.waiter,
        )
        self.session.add(self.waiter)
        self.admin = models.User(
            email="scw-admin@test.local",
            hashed_password=security.get_password_hash("secret"),
            full_name="Copy Admin",
            tenant_id=self.tenant_id,
            role=models.UserRole.admin,
        )
        self.session.add(self.admin)
        self.session.commit()
        self.session.refresh(self.waiter)
        self.session.refresh(self.admin)

    def test_copy_week_duplicates_shifts(self) -> None:
        """March 2026: Mon 2nd week → Tue has shift; copy to next week."""
        h = _bearer_headers(self.admin)
        body = {
            "user_id": self.waiter.id,
            "date": "2026-03-10",
            "start_time": "10:00",
            "end_time": "18:00",
            "label": "Day",
        }
        r = self.client.post("/schedule", json=body, headers=h)
        self.assertEqual(r.status_code, 200, r.text)

        src_monday = date(2026, 3, 9)
        tgt_monday = date(2026, 3, 16)
        r2 = self.client.post(
            "/schedule/copy-week",
            json={
                "source_week_start": src_monday.isoformat(),
                "target_week_start": tgt_monday.isoformat(),
                "skip_days_with_existing_shift": True,
            },
            headers=h,
        )
        self.assertEqual(r2.status_code, 200, r2.text)
        data = r2.json()
        self.assertEqual(data["created_count"], 1)
        self.assertEqual(data["skipped_existing_count"], 0)

        listed = self.client.get(
            "/schedule",
            params={"from_date": "2026-03-16", "to_date": "2026-03-22"},
            headers=h,
        )
        self.assertEqual(listed.status_code, 200, listed.text)
        rows = listed.json()
        self.assertEqual(len(rows), 1)
        self.assertEqual(rows[0]["date"], "2026-03-17")
        self.assertEqual(rows[0]["start_time"], "10:00")

    def test_copy_week_skips_existing_day(self) -> None:
        h = _bearer_headers(self.admin)
        for d in (date(2026, 4, 6), date(2026, 4, 13)):
            self.client.post(
                "/schedule",
                json={
                    "user_id": self.waiter.id,
                    "date": d.isoformat(),
                    "start_time": "09:00",
                    "end_time": "17:00",
                    "label": None,
                },
                headers=h,
            )
        r = self.client.post(
            "/schedule/copy-week",
            json={
                "source_week_start": "2026-04-06",
                "target_week_start": "2026-04-13",
                "skip_days_with_existing_shift": True,
            },
            headers=h,
        )
        self.assertEqual(r.status_code, 200, r.text)
        self.assertEqual(r.json()["created_count"], 0)
        self.assertGreaterEqual(r.json()["skipped_existing_count"], 1)


if __name__ == "__main__":
    unittest.main()
