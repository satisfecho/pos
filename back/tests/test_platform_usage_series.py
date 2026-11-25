"""Unit tests for platform usage day series helpers."""

from datetime import datetime, timedelta, timezone
from unittest import TestCase

from fastapi import HTTPException

from app.platform_routes import _resolve_usage_days, _usage_day_key


class PlatformUsageDayKeyTests(TestCase):
    def test_usage_day_key_normalizes_aware_utc(self):
        value = datetime(2026, 11, 25, 23, 30, tzinfo=timezone.utc)
        self.assertEqual(_usage_day_key(value), "2026-11-25")

    def test_usage_day_key_assumes_naive_is_utc(self):
        value = datetime(2026, 11, 25, 1, 0, 0)
        self.assertEqual(_usage_day_key(value), "2026-11-25")

    def test_usage_day_key_converts_offset_to_utc_date(self):
        # 00:30 CET on Nov 26 is 23:30 UTC on Nov 25.
        cet = timezone(timedelta(hours=1))
        value = datetime(2026, 11, 26, 0, 30, tzinfo=cet)
        self.assertEqual(_usage_day_key(value), "2026-11-25")

    def test_resolve_usage_days_allows_presets(self):
        self.assertEqual(_resolve_usage_days(7), 7)
        self.assertEqual(_resolve_usage_days(30), 30)
        self.assertEqual(_resolve_usage_days(90), 90)

    def test_resolve_usage_days_rejects_other_values(self):
        with self.assertRaises(HTTPException) as ctx:
            _resolve_usage_days(14)
        self.assertEqual(ctx.exception.status_code, 422)
