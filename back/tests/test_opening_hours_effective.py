"""Effective opening hours: baseline schedules and date overrides (Postgres)."""
import json
import unittest
from datetime import date

from pg_client_mixin import PgClientTestCase

from app import models
from app.opening_hours_effective import opening_service_windows_for_date

BASE_WEEK = {
    "monday": {"closed": False, "open": "09:00", "close": "22:00"},
    "tuesday": {"closed": False, "open": "09:00", "close": "22:00"},
    "wednesday": {"closed": False, "open": "09:00", "close": "22:00"},
    "thursday": {"closed": False, "open": "09:00", "close": "22:00"},
    "friday": {"closed": False, "open": "09:00", "close": "22:00"},
    "saturday": {"closed": False, "open": "10:00", "close": "23:00"},
    "sunday": {"closed": True},
}


class TestOpeningHoursEffective(PgClientTestCase):
    def setUp(self):
        super().setUp()
        t = models.Tenant(
            name="OH sched test",
            opening_hours=json.dumps(BASE_WEEK),
        )
        self.session.add(t)
        self.session.commit()
        self.session.refresh(t)
        self.tenant = t

    def test_default_uses_tenant_opening_hours(self):
        d = date(2026, 6, 10)  # Wednesday
        windows = opening_service_windows_for_date(self.session, self.tenant, d)
        self.assertIsNotNone(windows)
        self.assertEqual(len(windows), 1)
        self.assertEqual(windows[0][0].hour, 9)

    def test_baseline_schedule_supersedes_tenant(self):
        future = dict(BASE_WEEK)
        future["monday"] = {**BASE_WEEK["monday"], "open": "11:00"}
        future["tuesday"] = {**BASE_WEEK["tuesday"], "open": "11:00"}
        future["wednesday"] = {**BASE_WEEK["wednesday"], "open": "11:00"}
        future["thursday"] = {**BASE_WEEK["thursday"], "open": "11:00"}
        future["friday"] = {**BASE_WEEK["friday"], "open": "11:00"}
        future["saturday"] = {**BASE_WEEK["saturday"], "open": "11:00"}
        row = models.OpeningHoursBaselineSchedule(
            tenant_id=self.tenant.id,
            effective_from=date(2026, 6, 1),
            opening_hours=json.dumps(future),
        )
        self.session.add(row)
        self.session.commit()

        d = date(2026, 6, 10)
        windows = opening_service_windows_for_date(self.session, self.tenant, d)
        self.assertIsNotNone(windows)
        self.assertEqual(windows[0][0].hour, 11)

        before = date(2026, 5, 15)
        w2 = opening_service_windows_for_date(self.session, self.tenant, before)
        self.assertEqual(w2[0][0].hour, 9)

    def test_closed_override(self):
        ov = models.OpeningHoursDateOverride(
            tenant_id=self.tenant.id,
            date_from=date(2026, 6, 10),
            date_to=date(2026, 6, 12),
            closed=True,
        )
        self.session.add(ov)
        self.session.commit()

        closed_day = date(2026, 6, 11)
        self.assertEqual(opening_service_windows_for_date(self.session, self.tenant, closed_day), [])

        outside = date(2026, 6, 15)
        windows = opening_service_windows_for_date(self.session, self.tenant, outside)
        self.assertTrue(windows)
        self.assertEqual(windows[0][0].hour, 9)

    def test_narrower_override_wins(self):
        alt_early = dict(BASE_WEEK)
        for key in ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday"]:
            alt_early[key] = {**BASE_WEEK[key], "open": "08:00"}

        narrow_json = dict(BASE_WEEK)
        for key in ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday"]:
            narrow_json[key] = {**BASE_WEEK[key], "open": "12:00"}

        wide = models.OpeningHoursDateOverride(
            tenant_id=self.tenant.id,
            date_from=date(2026, 7, 1),
            date_to=date(2026, 7, 31),
            closed=False,
            opening_hours=json.dumps(alt_early),
        )
        narrow = models.OpeningHoursDateOverride(
            tenant_id=self.tenant.id,
            date_from=date(2026, 7, 10),
            date_to=date(2026, 7, 12),
            closed=False,
            opening_hours=json.dumps(narrow_json),
        )
        self.session.add(wide)
        self.session.add(narrow)
        self.session.commit()

        d = date(2026, 7, 11)
        windows = opening_service_windows_for_date(self.session, self.tenant, d)
        self.assertIsNotNone(windows)
        self.assertEqual(windows[0][0].hour, 12)


if __name__ == "__main__":
    unittest.main()
