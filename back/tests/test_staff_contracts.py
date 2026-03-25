"""Staff contracts API: RBAC, versioning, PDF upload/download."""
from __future__ import annotations

import io
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


_MIN_PDF = b"%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF\n"


class TestStaffContracts(PgClientTestCase):
    def setUp(self) -> None:
        super().setUp()
        tenant = models.Tenant(name="Contracts test tenant")
        self.session.add(tenant)
        self.session.commit()
        self.session.refresh(tenant)
        self.tenant_id = tenant.id

        self.admin = models.User(
            email="sc-admin@test.local",
            hashed_password=security.get_password_hash("secret"),
            full_name="Admin",
            tenant_id=self.tenant_id,
            role=models.UserRole.admin,
        )
        self.waiter = models.User(
            email="sc-waiter@test.local",
            hashed_password=security.get_password_hash("secret"),
            full_name="Waiter W",
            tenant_id=self.tenant_id,
            role=models.UserRole.waiter,
        )
        self.other = models.User(
            email="sc-other@test.local",
            hashed_password=security.get_password_hash("secret"),
            full_name="Other O",
            tenant_id=self.tenant_id,
            role=models.UserRole.waiter,
        )
        self.session.add(self.admin)
        self.session.add(self.waiter)
        self.session.add(self.other)
        self.session.commit()
        self.session.refresh(self.admin)
        self.session.refresh(self.waiter)
        self.session.refresh(self.other)

    def test_waiter_cannot_create(self) -> None:
        h = _bearer_headers(self.waiter)
        r = self.client.post(
            "/staff-contracts",
            headers=h,
            json={
                "subject_user_id": self.waiter.id,
                "kind": "employee",
                "role_title": "Chef",
            },
        )
        self.assertEqual(r.status_code, 403, r.text)

    def test_admin_creates_waiter_sees_only_own(self) -> None:
        ha = _bearer_headers(self.admin)
        hw = _bearer_headers(self.waiter)

        r1 = self.client.post(
            "/staff-contracts",
            headers=ha,
            json={
                "subject_user_id": self.waiter.id,
                "kind": "employee",
                "status": "draft",
                "role_title": "Waiter",
                "compensation_summary": "Monthly",
                "tax_identifier_subject": "ES11111111A",
            },
        )
        self.assertEqual(r1.status_code, 200, r1.text)
        c1 = r1.json()
        self.assertEqual(c1["subject_user_id"], self.waiter.id)
        self.assertEqual(c1["payment_structure"], "payroll")

        r2 = self.client.post(
            "/staff-contracts",
            headers=ha,
            json={
                "subject_user_id": self.other.id,
                "kind": "freelancer",
                "role_title": "Consultant",
            },
        )
        self.assertEqual(r2.status_code, 200, r2.text)
        self.assertEqual(r2.json()["payment_structure"], "invoice")

        lw = self.client.get("/staff-contracts", headers=hw)
        self.assertEqual(lw.status_code, 200, lw.text)
        self.assertEqual(len(lw.json()), 1)

        la = self.client.get("/staff-contracts", headers=ha)
        self.assertEqual(la.status_code, 200, la.text)
        self.assertEqual(len(la.json()), 2)

    def test_waiter_no_tax_id_for_other_contract(self) -> None:
        ha = _bearer_headers(self.admin)
        hw = _bearer_headers(self.waiter)

        self.client.post(
            "/staff-contracts",
            headers=ha,
            json={
                "subject_user_id": self.other.id,
                "kind": "freelancer",
                "tax_identifier_subject": "SECRET-TAX",
            },
        )

        lw = self.client.get("/staff-contracts", headers=hw)
        self.assertEqual(len(lw.json()), 0)

    def test_new_version_and_pdf(self) -> None:
        ha = _bearer_headers(self.admin)
        hw = _bearer_headers(self.waiter)

        r = self.client.post(
            "/staff-contracts",
            headers=ha,
            json={"subject_user_id": self.waiter.id, "kind": "employee", "role_title": "Staff"},
        )
        cid = r.json()["id"]
        group = r.json()["contract_group_id"]

        rnv = self.client.post(f"/staff-contracts/{cid}/new-version", headers=ha)
        self.assertEqual(rnv.status_code, 200, rnv.text)
        self.assertEqual(rnv.json()["version"], 2)
        self.assertEqual(rnv.json()["contract_group_id"], group)

        cid2 = rnv.json()["id"]
        up = self.client.post(
            f"/staff-contracts/{cid2}/document",
            headers=ha,
            files={"file": ("signed.pdf", io.BytesIO(_MIN_PDF), "application/pdf")},
        )
        self.assertEqual(up.status_code, 200, up.text)
        self.assertTrue(up.json()["has_document"])

        dl = self.client.get(f"/staff-contracts/{cid2}/document", headers=hw)
        self.assertEqual(dl.status_code, 200, dl.headers.get("content-type", ""))
        self.assertIn("pdf", dl.headers.get("content-type", ""))

        dl_other = self.client.get(f"/staff-contracts/{cid2}/document", headers=_bearer_headers(self.other))
        self.assertEqual(dl_other.status_code, 404)
