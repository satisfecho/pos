"""LiveKit reservation agent helpers + public session endpoints (#456)."""

from __future__ import annotations

import unittest
from unittest.mock import MagicMock, patch

from jose import jwt

from app import livekit_reservation as lk
from app.reservation_agent_client import ReservationAgentApiError, ReservationAgentClient
from app.settings import settings
from pg_client_mixin import PgClientTestCase


class TestLivekitReservationHelpers(unittest.TestCase):
    def test_parse_tenant_id_allowlist(self):
        self.assertEqual(lk.parse_tenant_id_allowlist(""), set())
        self.assertEqual(lk.parse_tenant_id_allowlist("  "), set())
        self.assertEqual(lk.parse_tenant_id_allowlist("1, 2, x, 3"), {1, 2, 3})
        self.assertEqual(lk.parse_tenant_id_allowlist("1"), {1})

    def test_mint_livekit_guest_token_roundtrip(self):
        with patch.object(settings, "livekit_api_key", "devkey"), patch.object(
            settings, "livekit_api_secret", "devsecret-devsecret-devsecret"
        ):
            token = lk.mint_livekit_guest_token(
                room_name="res-agent-1-abc",
                identity="guest-1",
                name="Guest",
                ttl_seconds=600,
            )
        claims = jwt.decode(
            token,
            "devsecret-devsecret-devsecret",
            algorithms=["HS256"],
            options={"verify_aud": False},
        )
        self.assertEqual(claims["iss"], "devkey")
        self.assertEqual(claims["sub"], "guest-1")
        self.assertEqual(claims["video"]["room"], "res-agent-1-abc")
        self.assertTrue(claims["video"]["roomJoin"])

    def test_room_name_contains_tenant(self):
        name = lk.new_reservation_agent_room_name(42)
        self.assertTrue(name.startswith("res-agent-42-"))


class TestReservationAgentClient(unittest.TestCase):
    def test_next_available_ok(self):
        sess = MagicMock()
        resp = MagicMock()
        resp.ok = True
        resp.json.return_value = {"date": "2026-12-01", "time": "19:00"}
        sess.get.return_value = resp
        client = ReservationAgentClient(
            "http://pos.test/api", tenant_id=1, session=sess
        )
        out = client.next_available(date="2026-12-01", party_size=2)
        self.assertEqual(out["time"], "19:00")
        args, kwargs = sess.get.call_args
        self.assertIn("/reservations/next-available", args[0])
        self.assertEqual(kwargs["params"]["tenant_id"], 1)

    def test_create_reservation_posts_tenant(self):
        sess = MagicMock()
        resp = MagicMock()
        resp.ok = True
        resp.json.return_value = {"id": 9, "token": "tok"}
        sess.post.return_value = resp
        client = ReservationAgentClient(
            "http://pos.test/api", tenant_id=7, session=sess
        )
        out = client.create_reservation(
            customer_name="Ada",
            customer_phone="+34600111222",
            reservation_date="2026-12-01",
            reservation_time="19:00",
            party_size=2,
        )
        self.assertEqual(out["id"], 9)
        _args, kwargs = sess.post.call_args
        self.assertEqual(kwargs["json"]["tenant_id"], 7)

    def test_raises_on_error(self):
        sess = MagicMock()
        resp = MagicMock()
        resp.ok = False
        resp.status_code = 400
        resp.json.return_value = {"detail": "full"}
        resp.text = "full"
        sess.get.return_value = resp
        client = ReservationAgentClient(
            "http://pos.test/api", tenant_id=1, session=sess
        )
        with self.assertRaises(ReservationAgentApiError) as ctx:
            client.next_available(date="2026-12-01")
        self.assertEqual(ctx.exception.status_code, 400)

    def test_available_times_filters_cells(self):
        sess = MagicMock()
        resp = MagicMock()
        resp.ok = True
        resp.json.return_value = {
            "date": "2026-12-01",
            "times": ["18:00", "19:00", "20:00"],
            "cells": {"18:00": "past", "19:00": "available", "20:00": "full"},
        }
        sess.get.return_value = resp
        client = ReservationAgentClient(
            "http://pos.test/api", tenant_id=1, session=sess
        )
        self.assertEqual(
            client.available_times_for_date(date="2026-12-01"),
            ["19:00"],
        )


class TestPublicReservationAgentEndpoints(PgClientTestCase):
    def setUp(self):
        super().setUp()
        from app import models

        self.tenant = models.Tenant(name="LK Agent Tenant", timezone="UTC")
        self.session.add(self.tenant)
        self.session.commit()
        self.session.refresh(self.tenant)

    def test_status_disabled_by_default(self):
        r = self.client.get(f"/public/tenants/{self.tenant.id}/reservation-agent")
        self.assertEqual(r.status_code, 200, r.text)
        body = r.json()
        self.assertFalse(body["enabled"])
        self.assertEqual(body["channels"], [])

    def test_session_404_when_disabled(self):
        r = self.client.post(
            f"/public/tenants/{self.tenant.id}/reservation-agent/session"
        )
        self.assertEqual(r.status_code, 404, r.text)

    def test_session_ok_when_configured(self):
        tid = str(self.tenant.id)
        with (
            patch.object(settings, "livekit_url", "wss://lk.example"),
            patch.object(settings, "livekit_api_key", "k"),
            patch.object(settings, "livekit_api_secret", "s" * 20),
            patch.object(settings, "livekit_reservation_agent_tenant_ids", tid),
        ):
            r = self.client.post(
                f"/public/tenants/{self.tenant.id}/reservation-agent/session"
            )
        self.assertEqual(r.status_code, 200, r.text)
        body = r.json()
        self.assertEqual(body["url"], "wss://lk.example")
        self.assertIn("token", body)
        self.assertTrue(body["room_name"].startswith(f"res-agent-{self.tenant.id}-"))
        self.assertEqual(body["channels"], ["voice", "chat"])
        self.assertIn("create", body["actions"])

    def test_unknown_tenant(self):
        r = self.client.get("/public/tenants/999999999/reservation-agent")
        self.assertEqual(r.status_code, 404)


if __name__ == "__main__":
    unittest.main()
