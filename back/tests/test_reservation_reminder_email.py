"""Reminder email uses the same manage-reservation link copy as confirmation emails."""
import asyncio
import os
import sys
import unittest
from unittest.mock import AsyncMock, patch

_back_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if _back_dir not in sys.path:
    sys.path.insert(0, _back_dir)
_repo_root = os.path.dirname(_back_dir)
if _repo_root and os.path.basename(_back_dir) == "back" and _repo_root not in sys.path:
    sys.path.insert(0, _repo_root)

try:
    from back.app import email_service
except ImportError:
    from app import email_service


class TestReservationReminderEmail(unittest.TestCase):
    def test_reminder_link_matches_confirmation_wording(self):
        url = "https://app.example/reservation?token=abc123"

        async def _run():
            with patch.object(email_service, "send_email", new_callable=AsyncMock) as m:
                m.return_value = True
                await email_service.send_reservation_reminder(
                    to_email="guest@test.local",
                    customer_name="Pat",
                    reservation_date="2026-03-25",
                    reservation_time="20:00",
                    party_size=2,
                    tenant_name="Demo Bistro",
                    view_url=url,
                    tenant=None,
                )
            return m

        m = asyncio.run(_run())
        self.assertTrue(m.called)
        _args, _kwargs = m.call_args
        html_content = _args[2]
        text_content = _args[3]
        self.assertIn("View or change your reservation online", html_content)
        self.assertIn("View or change your reservation online", text_content)
        self.assertIn(url, text_content)
        self.assertNotIn("view or cancel", html_content.lower())
        self.assertIn(f'href="{url}"', html_content)

    def test_reminder_href_escapes_quotes_in_url(self):
        url = 'https://app.example/reservation?token=x"y'

        async def _run():
            with patch.object(email_service, "send_email", new_callable=AsyncMock) as m:
                m.return_value = True
                await email_service.send_reservation_reminder(
                    to_email="guest@test.local",
                    customer_name="Pat",
                    reservation_date="2026-03-25",
                    reservation_time="20:00",
                    party_size=2,
                    tenant_name="Demo Bistro",
                    view_url=url,
                    tenant=None,
                )
            return m

        m = asyncio.run(_run())
        _args, _kwargs = m.call_args
        html_content = _args[2]
        self.assertNotIn('" onerror="', html_content)
        self.assertIn("&quot;", html_content)


if __name__ == "__main__":
    unittest.main()
