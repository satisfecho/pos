"""Tests for the Events module: events CRUD, Excel guest import, RSVP FSM, QR check-in, RBAC."""

from __future__ import annotations

import io
import unittest
from datetime import timedelta

from openpyxl import Workbook
from pg_client_mixin import PgClientTestCase

from app import models, security

_XLSX_MEDIA = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"


def _headers(user: models.User) -> dict[str, str]:
    data = {
        "sub": user.email,
        "tenant_id": user.tenant_id,
        "provider_id": getattr(user, "provider_id", None),
        "token_version": user.token_version,
    }
    token = security.create_access_token(data, expires_delta=timedelta(minutes=30))
    return {"Authorization": f"Bearer {token}"}


def _guest_list_xlsx() -> bytes:
    wb = Workbook()
    ws = wb.active
    ws.append(["Nombre", "Teléfono", "Nº acompañantes"])
    ws.append(["José Muñoz", "5512345678", 2])
    ws.append(["María Peña", "", 1])
    ws.append(["", "5500000000", 1])  # missing name -> skipped
    ws.append(["José Muñoz", "5599999999", 1])  # duplicate of row 1
    buf = io.BytesIO()
    wb.save(buf)
    return buf.getvalue()


class TestEventsModule(PgClientTestCase):
    def setUp(self) -> None:
        super().setUp()
        tenant = models.Tenant(name="Events Test")
        self.session.add(tenant)
        self.session.commit()
        self.session.refresh(tenant)
        self.tenant_id = tenant.id

        self.owner = models.User(
            email="events-owner@test.local",
            hashed_password=security.get_password_hash("secret"),
            full_name="Owner",
            tenant_id=self.tenant_id,
            role=models.UserRole.owner,
        )
        self.kitchen = models.User(
            email="events-kitchen@test.local",
            hashed_password=security.get_password_hash("secret"),
            full_name="Kitchen",
            tenant_id=self.tenant_id,
            role=models.UserRole.kitchen,
        )
        self.session.add(self.owner)
        self.session.add(self.kitchen)
        self.session.commit()
        self.session.refresh(self.owner)
        self.session.refresh(self.kitchen)
        self.headers = _headers(self.owner)

    def _create_event(self) -> int:
        r = self.client.post(
            "/events",
            json={"title": "Boda Demo", "event_date": "2026-08-01", "event_time": "20:00"},
            headers=self.headers,
        )
        self.assertEqual(r.status_code, 200, r.text)
        return r.json()["id"]

    def test_create_event_and_counts(self):
        event_id = self._create_event()
        r = self.client.get(f"/events/{event_id}", headers=self.headers)
        self.assertEqual(r.status_code, 200, r.text)
        body = r.json()
        self.assertEqual(body["title"], "Boda Demo")
        self.assertEqual(body["counts"]["total"], 0)

    def test_download_template(self):
        r = self.client.get("/events/guest-template", headers=self.headers)
        self.assertEqual(r.status_code, 200, r.text)
        self.assertIn("spreadsheet", r.headers.get("content-type", ""))
        self.assertGreater(len(r.content), 0)

    def test_import_preview_confirm_and_dedupe(self):
        event_id = self._create_event()
        data = _guest_list_xlsx()
        preview = self.client.post(
            f"/events/{event_id}/guests/import/preview",
            files={"file": ("lista.xlsx", data, _XLSX_MEDIA)},
            headers=self.headers,
        )
        self.assertEqual(preview.status_code, 200, preview.text)
        body = preview.json()
        # 4 data rows: 2 valid unique, 1 missing-name (skip), 1 duplicate
        self.assertEqual(body["summary"]["total"], 4)
        self.assertEqual(body["summary"]["skipped"], 1)  # the empty name
        self.assertGreaterEqual(body["summary"]["duplicates"], 1)

        valid_rows = [r for r in body["items"] if r["valid"]]
        confirm = self.client.post(
            f"/events/{event_id}/guests/import/confirm",
            json={"guests": valid_rows, "skip_duplicates": True},
            headers=self.headers,
        )
        self.assertEqual(confirm.status_code, 200, confirm.text)
        result = confirm.json()
        # José (once, dedupe) + María = 2 created
        self.assertEqual(result["created"], 2)
        self.assertEqual(result["counts"]["pending"], 2)

        guests = self.client.get(f"/events/{event_id}/guests", headers=self.headers).json()
        names = sorted(g["name"] for g in guests)
        self.assertEqual(names, ["José Muñoz", "María Peña"])
        self.assertTrue(all(g["token"] for g in guests))
        self.assertTrue(all(g["status"] == "pending" for g in guests))

    def test_status_fsm_and_public_rsvp(self):
        event_id = self._create_event()
        add = self.client.post(
            f"/events/{event_id}/guests",
            json={"name": "Ana", "phone": "5511112222"},
            headers=self.headers,
        )
        self.assertEqual(add.status_code, 200, add.text)
        guest = add.json()
        guest_id, token = guest["id"], guest["token"]

        # staff sets confirmed
        r = self.client.put(
            f"/events/{event_id}/guests/{guest_id}/status",
            json={"status": "confirmed"},
            headers=self.headers,
        )
        self.assertEqual(r.status_code, 200, r.text)
        self.assertEqual(r.json()["status"], "confirmed")
        self.assertIsNotNone(r.json()["responded_at"])

        # public reads invitation by token (no auth)
        inv = self.client.get("/public/events/invitation/by-token", params={"token": token})
        self.assertEqual(inv.status_code, 200, inv.text)
        self.assertEqual(inv.json()["guest_name"], "Ana")
        self.assertEqual(inv.json()["event"]["title"], "Boda Demo")

        # guest declines via public token (no auth)
        resp = self.client.post(
            f"/public/events/invitation/{token}/respond",
            json={"status": "declined"},
        )
        self.assertEqual(resp.status_code, 200, resp.text)
        self.assertEqual(resp.json()["status"], "declined")

        # public respond cannot set pending
        bad = self.client.post(
            f"/public/events/invitation/{token}/respond",
            json={"status": "pending"},
        )
        self.assertEqual(bad.status_code, 400, bad.text)

    def test_checkin_by_token(self):
        event_id = self._create_event()
        guest = self.client.post(
            f"/events/{event_id}/guests",
            json={"name": "Pedro"},
            headers=self.headers,
        ).json()
        token = guest["token"]

        r = self.client.post(
            f"/events/{event_id}/checkin", params={"token": token}, headers=self.headers
        )
        self.assertEqual(r.status_code, 200, r.text)
        self.assertFalse(r.json()["already_checked_in"])
        self.assertIsNotNone(r.json()["guest"]["checked_in_at"])

        # second scan -> already checked in
        r2 = self.client.post(
            f"/events/{event_id}/checkin", params={"token": token}, headers=self.headers
        )
        self.assertTrue(r2.json()["already_checked_in"])

        # unknown token -> 404
        r3 = self.client.post(
            f"/events/{event_id}/checkin", params={"token": "deadbeefdeadbeef"}, headers=self.headers
        )
        self.assertEqual(r3.status_code, 404, r3.text)

    def test_delete_event_with_guests(self):
        event_id = self._create_event()
        self.client.post(f"/events/{event_id}/guests", json={"name": "Lola"}, headers=self.headers)
        self.client.post(f"/events/{event_id}/guests", json={"name": "Beto"}, headers=self.headers)
        r = self.client.delete(f"/events/{event_id}", headers=self.headers)
        self.assertEqual(r.status_code, 200, r.text)
        self.assertEqual(r.json()["status"], "deleted")
        # event gone -> 404
        self.assertEqual(self.client.get(f"/events/{event_id}", headers=self.headers).status_code, 404)

    def test_rbac_denies_role_without_event_permission(self):
        event_id = self._create_event()
        kitchen_headers = _headers(self.kitchen)
        r = self.client.get("/events", headers=kitchen_headers)
        self.assertEqual(r.status_code, 403, r.text)
        r2 = self.client.post(
            f"/events/{event_id}/guests",
            json={"name": "X"},
            headers=kitchen_headers,
        )
        self.assertEqual(r2.status_code, 403, r2.text)


if __name__ == "__main__":
    unittest.main()
