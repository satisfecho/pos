"""Staff work session (clock in/out) API."""
from __future__ import annotations

import unittest
from datetime import date, datetime, timedelta, timezone

from pg_client_mixin import PgClientTestCase

from app import models, security
from app.clock_qr_util import (
    decrypt_clock_qr_token_from_storage,
    encrypt_clock_qr_token_for_storage,
    hash_clock_qr_token,
)
from app.work_session_serialization import WORK_SESSION_CONTRACT_THRESHOLD_MINUTES, serialize_work_session


def _bearer_headers(user: models.User) -> dict[str, str]:
    data = {
        "sub": user.email,
        "tenant_id": user.tenant_id,
        "provider_id": getattr(user, "provider_id", None),
        "token_version": user.token_version,
    }
    token = security.create_access_token(data, expires_delta=timedelta(minutes=30))
    return {"Authorization": f"Bearer {token}"}


class TestWorkSession(PgClientTestCase):
    def setUp(self) -> None:
        super().setUp()
        tenant = models.Tenant(name="WS Test")
        self.session.add(tenant)
        self.session.commit()
        self.session.refresh(tenant)
        self.tenant_id = tenant.id

        self.waiter = models.User(
            email="ws-waiter@test.local",
            hashed_password=security.get_password_hash("secret"),
            full_name="Waiter W",
            tenant_id=self.tenant_id,
            role=models.UserRole.waiter,
        )
        self.session.add(self.waiter)
        self.session.commit()
        self.session.refresh(self.waiter)
        self.admin = models.User(
            email="ws-admin@test.local",
            hashed_password=security.get_password_hash("secret"),
            full_name="Admin A",
            tenant_id=self.tenant_id,
            role=models.UserRole.admin,
        )
        self.session.add(self.admin)
        self.session.commit()
        self.session.refresh(self.admin)

    def test_clock_in_out_and_report(self):
        wh = _bearer_headers(self.waiter)
        r = self.client.post("/users/me/work-session/start", headers=wh)
        self.assertEqual(r.status_code, 200, r.text)
        body = r.json()
        self.assertIn("id", body)
        self.assertIsNone(body.get("ended_at"))
        self.assertFalse(body.get("over_contract"))
        self.assertEqual(body.get("contract_threshold_minutes"), WORK_SESSION_CONTRACT_THRESHOLD_MINUTES)
        self.assertIsNotNone(body.get("open_duration_minutes"))

        r2 = self.client.post("/users/me/work-session/start", headers=wh)
        self.assertEqual(r2.status_code, 400, r2.text)

        cur = self.client.get("/users/me/work-session", headers=wh)
        self.assertEqual(cur.status_code, 200, cur.text)
        self.assertEqual(cur.json()["id"], body["id"])

        r3 = self.client.post("/users/me/work-session/end", headers=wh)
        self.assertEqual(r3.status_code, 200, r3.text)
        self.assertIsNotNone(r3.json().get("ended_at"))

        r4 = self.client.post("/users/me/work-session/end", headers=wh)
        self.assertEqual(r4.status_code, 400, r4.text)

        today = date.today().isoformat()
        lst = self.client.get(
            "/users/me/work-sessions",
            params={"from_date": today, "to_date": today},
            headers=wh,
        )
        self.assertEqual(lst.status_code, 200, lst.text)
        rows = lst.json()
        self.assertEqual(len(rows), 1)
        self.assertIsNotNone(rows[0].get("ended_at"))

        ah = _bearer_headers(self.admin)
        rep = self.client.get(
            "/reports/work-sessions",
            params={"from_date": today, "to_date": today},
            headers=ah,
        )
        self.assertEqual(rep.status_code, 200, rep.text)
        self.assertEqual(len(rep.json()), 1)
        self.assertEqual(rep.json()[0]["user_id"], self.waiter.id)

    def test_open_shift_over_contract_after_threshold(self):
        wh = _bearer_headers(self.waiter)
        r = self.client.post("/users/me/work-session/start", headers=wh)
        self.assertEqual(r.status_code, 200, r.text)
        ws_id = r.json()["id"]
        row = self.session.get(models.WorkSession, ws_id)
        self.assertIsNotNone(row)
        row.started_at = datetime.now(timezone.utc) - timedelta(
            minutes=WORK_SESSION_CONTRACT_THRESHOLD_MINUTES + 15
        )
        self.session.add(row)
        self.session.commit()

        cur = self.client.get("/users/me/work-session", headers=wh)
        self.assertEqual(cur.status_code, 200, cur.text)
        payload = cur.json()
        self.assertTrue(payload.get("over_contract"))
        self.assertGreaterEqual(
            payload.get("open_duration_minutes", 0),
            WORK_SESSION_CONTRACT_THRESHOLD_MINUTES,
        )

    def test_serialize_work_session_respects_now_override(self):
        started = datetime(2020, 1, 1, 8, 0, tzinfo=timezone.utc)
        now = started + timedelta(minutes=WORK_SESSION_CONTRACT_THRESHOLD_MINUTES)
        ws = models.WorkSession(
            tenant_id=self.tenant_id,
            user_id=self.waiter.id,
            started_at=started,
            ended_at=None,
        )
        self.session.add(ws)
        self.session.commit()
        self.session.refresh(ws)
        d = serialize_work_session(ws, "Waiter", now_utc=now)
        self.assertTrue(d["over_contract"])
        d2 = serialize_work_session(ws, "Waiter", now_utc=started + timedelta(minutes=30))
        self.assertFalse(d2["over_contract"])

    def test_put_tenant_settings_persists_gps_fields(self):
        ah = _bearer_headers(self.admin)
        r = self.client.put(
            "/tenant/settings",
            headers=ah,
            json={
                "latitude": 52.520008,
                "longitude": 13.404954,
                "location_radius_meters": 250,
                "location_check_enabled": True,
            },
        )
        self.assertEqual(r.status_code, 200, r.text)
        body = r.json()
        self.assertAlmostEqual(body["latitude"], 52.520008, places=5)
        self.assertAlmostEqual(body["longitude"], 13.404954, places=5)
        self.assertEqual(body["location_radius_meters"], 250)
        self.assertTrue(body["location_check_enabled"])

        t = self.session.get(models.Tenant, self.tenant_id)
        self.assertIsNotNone(t)
        assert t is not None
        self.assertAlmostEqual(float(t.latitude or 0), 52.520008, places=5)
        self.assertAlmostEqual(float(t.longitude or 0), 13.404954, places=5)
        self.assertEqual(t.location_radius_meters, 250)
        self.assertTrue(t.location_check_enabled)

    def test_put_tenant_settings_rejects_invalid_gps(self):
        ah = _bearer_headers(self.admin)
        r = self.client.put(
            "/tenant/settings",
            headers=ah,
            json={"latitude": 91.0},
        )
        self.assertEqual(r.status_code, 400, r.text)
        r2 = self.client.put(
            "/tenant/settings",
            headers=ah,
            json={"longitude": -200.0},
        )
        self.assertEqual(r2.status_code, 400, r2.text)
        r3 = self.client.put(
            "/tenant/settings",
            headers=ah,
            json={"location_radius_meters": -1},
        )
        self.assertEqual(r3.status_code, 400, r3.text)

    def test_clock_qr_encrypt_roundtrip(self):
        plain = "abc123test"
        ct = encrypt_clock_qr_token_for_storage(plain)
        self.assertNotIn(plain, ct)
        self.assertEqual(decrypt_clock_qr_token_from_storage(ct), plain)

    def test_regenerate_clock_qr_persists_encrypted_get_token_matches(self):
        ah = _bearer_headers(self.admin)
        r = self.client.post("/tenant/settings/clock-qr/regenerate", headers=ah, json={})
        self.assertEqual(r.status_code, 200, r.text)
        token = r.json().get("token")
        self.assertIsInstance(token, str)
        self.assertGreater(len(token), 10)
        self.assertTrue(r.json().get("clock_qr_downloadable", False))

        r2 = self.client.get("/tenant/settings/clock-qr/token", headers=ah)
        self.assertEqual(r2.status_code, 200, r2.text)
        self.assertEqual(r2.json().get("token"), token)

    def test_get_clock_qr_token_409_when_legacy_hash_only(self):
        tenant = self.session.get(models.Tenant, self.tenant_id)
        self.assertIsNotNone(tenant)
        assert tenant is not None
        tenant.clock_qr_token_hash = hash_clock_qr_token("legacy-only")
        tenant.clock_qr_token_encrypted = None
        self.session.add(tenant)
        self.session.commit()

        ah = _bearer_headers(self.admin)
        r = self.client.get("/tenant/settings/clock-qr/token", headers=ah)
        self.assertEqual(r.status_code, 409, r.text)
        self.assertEqual(r.json().get("detail"), "clock_qr_regenerate_required")

    def test_clock_in_succeeds_when_gps_required_and_venue_coords_set_via_settings(self):
        token = "venue-test-qr-token"
        tenant = self.session.get(models.Tenant, self.tenant_id)
        self.assertIsNotNone(tenant)
        assert tenant is not None
        tenant.clock_qr_token_hash = hash_clock_qr_token(token)
        tenant.clock_qr_location_verify = True
        self.session.add(tenant)
        self.session.commit()

        ah = _bearer_headers(self.admin)
        r = self.client.put(
            "/tenant/settings",
            headers=ah,
            json={
                "latitude": 40.7128,
                "longitude": -74.0060,
                "location_radius_meters": 500,
            },
        )
        self.assertEqual(r.status_code, 200, r.text)

        wh = _bearer_headers(self.waiter)
        r2 = self.client.post(
            "/users/me/work-session/start",
            headers=wh,
            json={
                "clock_qr": token,
                "latitude": 40.7129,
                "longitude": -74.0061,
            },
        )
        self.assertEqual(r2.status_code, 200, r2.text)


if __name__ == "__main__":
    unittest.main()
