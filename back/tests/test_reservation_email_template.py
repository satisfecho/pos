"""Tests for safe reservation confirmation templating."""
import os
import sys
import unittest
from types import SimpleNamespace

# Container cwd=/app → "app.*"; repo checkout with "back" on path → "back.app.*"
_back_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if _back_dir not in sys.path:
    sys.path.insert(0, _back_dir)
_repo_root = os.path.dirname(_back_dir)
if _repo_root and os.path.basename(_back_dir) == "back" and _repo_root not in sys.path:
    sys.path.insert(0, _repo_root)

try:
    from back.app import models
    from back.app.messages import reservation_transactional_lang
    from back.app.reservation_email_template import (
        ALLOWED_PLACEHOLDERS,
        build_value_maps,
        render_confirmation_email,
        render_html_body,
        render_plain_body,
    )
except ImportError:
    from app import models
    from app.messages import reservation_transactional_lang
    from app.reservation_email_template import (
        ALLOWED_PLACEHOLDERS,
        build_value_maps,
        render_confirmation_email,
        render_html_body,
        render_plain_body,
    )


def _tenant(**kwargs) -> models.Tenant:
    base = dict(
        name="Café Demo",
        phone="+1 555",
        email="info@demo.test",
        reservation_cancellation_policy="Cancel 24h before.",
        reservation_prepayment_cents=None,
        reservation_prepayment_text=None,
        reservation_dress_code="Smart casual",
        reservation_arrival_tolerance_minutes=15,
        currency_code="EUR",
        reservation_confirmation_email_subject=None,
        reservation_confirmation_email_body=None,
    )
    base.update(kwargs)
    return models.Tenant(**base)


class TestReservationEmailTemplate(unittest.TestCase):
    def test_unknown_placeholder_passthrough(self):
        t = "Hello {{customer_name}} {{__import__}} {{not_allowed}}"
        plain, _ = build_value_maps(_tenant(), "Ann", "2026-03-22", "19:00", 2, None)
        out = render_plain_body(t, plain)
        self.assertIn("Ann", out)
        self.assertIn("{{__import__}}", out)
        self.assertIn("{{not_allowed}}", out)

    def test_xss_customer_name_escaped_in_html(self):
        malicious = '<script>alert(1)</script>'
        _, html_map = build_value_maps(_tenant(), malicious, "2026-03-22", "19:00", 2, None)
        template = "Hi {{customer_name}}"
        html_out = render_html_body(template, html_map)
        self.assertNotIn("<script>", html_out)
        self.assertIn("&lt;script&gt;", html_out)

    def test_reservation_link_href_is_escaped(self):
        tenant = _tenant()
        url = 'https://example.com/reservation?token=x" onerror="alert(1)'
        _, html_map = build_value_maps(tenant, "Ann", "2026-03-22", "19:00", 2, url)
        html_out = render_html_body("X {{reservation_link_block_html}}", html_map)
        self.assertIn("href=", html_out)
        # Must not close href with a raw quote then inject attributes
        self.assertNotIn('" onerror="', html_out)
        self.assertIn("&quot;", html_out)

    def test_render_confirmation_uses_defaults(self):
        tenant = _tenant()
        sub, text, inner = render_confirmation_email(
            tenant, "Ann", "2026-03-22", "19:00", 3, "https://app.test/r?t=1"
        )
        self.assertIn("Café Demo", sub)
        self.assertIn("Ann", text)
        self.assertIn("Cancel 24h", text)
        self.assertIn("https://app.test/r?t=1", text)
        self.assertIn("View or change", inner)
        self.assertIn("Contact us", text)
        self.assertIn("+1 555", text)
        self.assertIn("info@demo.test", text)
        self.assertIn("Contact us", inner)
        self.assertIn("tel:", inner)
        self.assertIn("mailto:info@demo.test", inner)

    def test_confirmation_includes_map_links_when_configured(self):
        tenant = _tenant(
            public_google_maps_url="https://maps.app.goo.gl/abc",
            public_openstreetmap_url="https://www.openstreetmap.org/#map=18/1/2",
        )
        _sub, text, inner = render_confirmation_email(
            tenant, "Ann", "2026-03-22", "19:00", 2, None
        )
        self.assertIn("maps.app.goo.gl", text)
        self.assertIn("Open in Google Maps", text)
        self.assertIn("openstreetmap.org", text)
        self.assertIn("Open in OpenStreetMap", text)
        self.assertIn("maps.app.goo.gl", inner)
        self.assertIn("openstreetmap.org", inner)

    def test_confirmation_spanish_default_body_and_labels(self):
        tenant = _tenant(default_language="es")
        sub, text, inner = render_confirmation_email(
            tenant, "Ana", "2026-03-22", "19:00", 2, "https://app.test/r?t=1", lang="es"
        )
        self.assertIn("Reserva confirmada", sub)
        self.assertIn("Café Demo", sub)
        self.assertIn("Hola", text)
        self.assertIn("Ana", text)
        self.assertIn("confirmada", text.lower())
        self.assertIn("Fecha:", text)
        self.assertIn("Hora:", text)
        self.assertIn("Comensales:", text)
        self.assertIn("Ver o cambiar su reserva en línea", text)
        self.assertIn("Contacto:", text)
        self.assertIn("Le esperamos", text)
        self.assertIn("Ver o cambiar", inner)

    def test_confirmation_spanish_prepayment_and_arrival(self):
        tenant = _tenant(
            default_language="es",
            reservation_prepayment_cents=500,
            reservation_prepayment_text="Pague al llegar.",
            reservation_arrival_tolerance_minutes=10,
        )
        _sub, text, inner = render_confirmation_email(
            tenant, "Ana", "2026-03-22", "19:00", 2, None, lang="es"
        )
        self.assertIn("Importe del prepago:", text)
        self.assertIn("5.00 EUR", text)
        self.assertIn("Pague al llegar.", text)
        self.assertIn("10", text)
        self.assertIn("minutos", text.lower())
        self.assertIn("Importe del prepago", inner)
        self.assertIn("Pague al llegar.", inner)

    def test_reservation_transactional_lang_prefers_booking_locale_when_set(self):
        tenant = SimpleNamespace(default_language="en")
        reservation = SimpleNamespace(locale="es")
        self.assertEqual(reservation_transactional_lang(tenant, reservation), "es")

    def test_reservation_transactional_lang_falls_back_to_tenant_default(self):
        tenant = SimpleNamespace(default_language="es")
        reservation = SimpleNamespace(locale=None)
        self.assertEqual(reservation_transactional_lang(tenant, reservation), "es")

    def test_reservation_transactional_lang_empty_booking_locale_uses_tenant(self):
        tenant = SimpleNamespace(default_language="de")
        reservation = SimpleNamespace(locale="   ")
        self.assertEqual(reservation_transactional_lang(tenant, reservation), "de")

    def test_allowlist_is_lowercase_snake(self):
        for name in ALLOWED_PLACEHOLDERS:
            self.assertRegex(name, r"^[a-z][a-z0-9_]*$")


if __name__ == "__main__":
    unittest.main()
