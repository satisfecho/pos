"""PUT /users/{id} password changes require the caller's current password."""
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


class TestUserPasswordUpdate(PgClientTestCase):
    def setUp(self) -> None:
        super().setUp()
        tenant = models.Tenant(name="Pwd test tenant", address="1 Test St")
        self.session.add(tenant)
        self.session.commit()
        self.session.refresh(tenant)
        self.tenant_id = tenant.id

        self.owner = models.User(
            email="pwd-owner@test.local",
            hashed_password=security.get_password_hash("owner-secret"),
            full_name="Owner",
            tenant_id=self.tenant_id,
            role=models.UserRole.owner,
        )
        self.waiter = models.User(
            email="pwd-waiter@test.local",
            hashed_password=security.get_password_hash("waiter-old"),
            full_name="Waiter W",
            tenant_id=self.tenant_id,
            role=models.UserRole.waiter,
        )
        self.session.add(self.owner)
        self.session.add(self.waiter)
        self.session.commit()
        self.session.refresh(self.owner)
        self.session.refresh(self.waiter)

    def test_change_user_password_without_actor_password_rejected(self) -> None:
        h = _bearer_headers(self.owner)
        r = self.client.put(
            f"/users/{self.waiter.id}",
            headers=h,
            json={"password": "newpass1"},
        )
        self.assertEqual(r.status_code, 400, r.text)
        self.assertIn("current password", r.json()["detail"].lower(), r.text)

    def test_change_user_password_wrong_actor_password_rejected(self) -> None:
        h = _bearer_headers(self.owner)
        r = self.client.put(
            f"/users/{self.waiter.id}",
            headers=h,
            json={
                "password": "newpass1",
                "actor_current_password": "wrong",
            },
        )
        self.assertEqual(r.status_code, 400, r.text)
        self.assertIn("incorrect", r.json()["detail"].lower(), r.text)

    def test_change_user_password_with_correct_actor_password_ok(self) -> None:
        h = _bearer_headers(self.owner)
        r = self.client.put(
            f"/users/{self.waiter.id}",
            headers=h,
            json={
                "password": "newpass1",
                "actor_current_password": "owner-secret",
            },
        )
        self.assertEqual(r.status_code, 200, r.text)
        self.session.refresh(self.waiter)
        self.assertTrue(
            security.verify_password("newpass1", self.waiter.hashed_password),
            "waiter password should be updated",
        )

    def test_update_full_name_without_password_skips_actor_check(self) -> None:
        h = _bearer_headers(self.owner)
        r = self.client.put(
            f"/users/{self.waiter.id}",
            headers=h,
            json={"full_name": "Updated Waiter Name"},
        )
        self.assertEqual(r.status_code, 200, r.text)

    def test_admin_must_reauth_to_change_password(self) -> None:
        admin = models.User(
            email="pwd-admin@test.local",
            hashed_password=security.get_password_hash("admin-secret"),
            full_name="Admin",
            tenant_id=self.tenant_id,
            role=models.UserRole.admin,
        )
        self.session.add(admin)
        self.session.commit()
        self.session.refresh(admin)

        h = _bearer_headers(admin)
        r = self.client.put(
            f"/users/{self.waiter.id}",
            headers=h,
            json={"password": "another1"},
        )
        self.assertEqual(r.status_code, 400, r.text)

        r2 = self.client.put(
            f"/users/{self.waiter.id}",
            headers=h,
            json={
                "password": "another1",
                "actor_current_password": "admin-secret",
            },
        )
        self.assertEqual(r2.status_code, 200, r2.text)


if __name__ == "__main__":
    unittest.main()
