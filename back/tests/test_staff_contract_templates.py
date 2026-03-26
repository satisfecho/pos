"""Staff contract templates CRUD and print HTML merge."""
from __future__ import annotations

import unittest
from datetime import timedelta

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


class TestStaffContractTemplates(PgClientTestCase):
    def setUp(self) -> None:
        super().setUp()
        tenant = models.Tenant(name="Tpl test tenant", address="1 Test St")
        self.session.add(tenant)
        self.session.commit()
        self.session.refresh(tenant)
        self.tenant_id = tenant.id

        self.admin = models.User(
            email="tpl-admin@test.local",
            hashed_password=security.get_password_hash("secret"),
            full_name="Admin",
            tenant_id=self.tenant_id,
            role=models.UserRole.admin,
        )
        self.waiter = models.User(
            email="tpl-waiter@test.local",
            hashed_password=security.get_password_hash("secret"),
            full_name="Waiter W",
            tenant_id=self.tenant_id,
            role=models.UserRole.waiter,
        )
        self.session.add(self.admin)
        self.session.add(self.waiter)
        self.session.commit()
        self.session.refresh(self.admin)
        self.session.refresh(self.waiter)

    def test_waiter_cannot_manage_templates(self) -> None:
        h = _bearer_headers(self.waiter)
        r = self.client.get("/staff-contract-templates", headers=h)
        self.assertEqual(r.status_code, 403, r.text)

    def test_crud_print_and_delete_blocked_when_in_use(self) -> None:
        ha = _bearer_headers(self.admin)
        hw = _bearer_headers(self.waiter)

        r0 = self.client.post(
            "/staff-contract-templates",
            headers=ha,
            json={
                "template_key": "waiter_temp",
                "name": "Temporary waiter",
                "body": "<p>Worker: {{worker_name}} / {{role_title}}</p>",
                "kind": "employee",
            },
        )
        self.assertEqual(r0.status_code, 200, r0.text)
        tid = r0.json()["id"]

        lst = self.client.get("/staff-contract-templates", headers=ha)
        self.assertEqual(lst.status_code, 200, lst.text)
        self.assertEqual(len(lst.json()), 1)

        rc = self.client.post(
            "/staff-contracts",
            headers=ha,
            json={
                "subject_user_id": self.waiter.id,
                "kind": "employee",
                "role_title": "Hostelry waiter",
                "template_key": "waiter_temp",
            },
        )
        self.assertEqual(rc.status_code, 200, rc.text)
        cid = rc.json()["id"]

        pr = self.client.get(f"/staff-contracts/{cid}/print", headers=hw)
        self.assertEqual(pr.status_code, 200, pr.text)
        self.assertIn("text/html", pr.headers.get("content-type", ""))
        self.assertIn("Waiter W", pr.text)
        self.assertIn("Hostelry waiter", pr.text)

        dl = self.client.delete(f"/staff-contract-templates/{tid}", headers=ha)
        self.assertEqual(dl.status_code, 409, dl.text)

        up = self.client.patch(f"/staff-contracts/{cid}", headers=ha, json={"template_key": None})
        self.assertEqual(up.status_code, 200, up.text)

        dl2 = self.client.delete(f"/staff-contract-templates/{tid}", headers=ha)
        self.assertEqual(dl2.status_code, 200, dl2.json())

        empty = self.client.get("/staff-contract-templates", headers=ha)
        self.assertEqual(len(empty.json()), 0)

    def test_invalid_template_key_rejected(self) -> None:
        ha = _bearer_headers(self.admin)
        r = self.client.post(
            "/staff-contract-templates",
            headers=ha,
            json={"template_key": "bad key!", "name": "X", "body": "y"},
        )
        self.assertEqual(r.status_code, 400, r.text)


if __name__ == "__main__":
    unittest.main()
