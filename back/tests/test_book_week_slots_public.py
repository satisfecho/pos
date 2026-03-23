"""Public GET /reservations/book-week-slots — week grid for /book (GitHub #64)."""

import json
import unittest

from pg_client_mixin import PgClientTestCase

from app import models


class TestBookWeekSlotsPublic(PgClientTestCase):
    def setUp(self):
        super().setUp()
        oh = {
            "monday": {"open": "10:00", "close": "22:00"},
            "tuesday": {"open": "10:00", "close": "22:00"},
            "wednesday": {"open": "10:00", "close": "22:00"},
            "thursday": {"open": "10:00", "close": "22:00"},
            "friday": {"open": "10:00", "close": "22:00"},
            "saturday": {"open": "10:00", "close": "22:00"},
            "sunday": {"closed": True},
        }
        self.tenant = models.Tenant(
            name="Week Slots Tenant",
            timezone="UTC",
            opening_hours=json.dumps(oh),
        )
        self.session.add(self.tenant)
        self.session.commit()
        self.session.refresh(self.tenant)

        floor = models.Floor(name="Main", tenant_id=self.tenant.id)
        self.session.add(floor)
        self.session.commit()
        self.session.refresh(floor)

        tbl = models.Table(
            name="WS-01",
            tenant_id=self.tenant.id,
            floor_id=floor.id,
            seat_count=4,
            is_active=False,
        )
        self.session.add(tbl)
        self.session.commit()

    def test_book_week_slots_shape(self):
        r = self.client.get(
            "/reservations/book-week-slots",
            params={"tenant_id": self.tenant.id, "party_size": 2},
        )
        self.assertEqual(r.status_code, 200, r.text)
        b = r.json()
        self.assertIn("week_start", b)
        self.assertIn("earliest_week_monday", b)
        self.assertIn("times", b)
        self.assertIn("days", b)
        self.assertEqual(len(b["days"]), 7)
        self.assertGreater(len(b["times"]), 5)
        for day in b["days"]:
            self.assertIn("date", day)
            self.assertIn("cells", day)
            for t in b["times"]:
                self.assertIn(t, day["cells"])
                self.assertIn(
                    day["cells"][t],
                    (
                        "available",
                        "full",
                        "past",
                        "closed_day",
                        "out_of_hours",
                        "out_of_range",
                    ),
                )

    def test_book_week_slots_unknown_tenant(self):
        r = self.client.get(
            "/reservations/book-week-slots",
            params={"tenant_id": 999999999, "party_size": 1},
        )
        self.assertEqual(r.status_code, 404, r.text)


if __name__ == "__main__":
    unittest.main()
