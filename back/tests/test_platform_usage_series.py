"""Unit tests for platform usage day series helpers."""

from datetime import datetime, timedelta, timezone
from unittest import TestCase

from app.platform_routes import _usage_day_key


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
