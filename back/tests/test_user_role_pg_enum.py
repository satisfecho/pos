"""Regression: User.role must use PostgreSQL enum type user_role (not userrole)."""

from __future__ import annotations

from pg_client_mixin import PgClientTestCase

from app import models, security


class TestUserRolePgEnum(PgClientTestCase):
    def test_insert_each_role_value(self) -> None:
        tenant = models.Tenant(name="UserRole enum regression")
        self.session.add(tenant)
        self.session.commit()
        self.session.refresh(tenant)

        provider = models.Provider(name="UserRole enum provider")
        self.session.add(provider)
        self.session.commit()
        self.session.refresh(provider)

        tenant_roles = [
            models.UserRole.owner,
            models.UserRole.admin,
            models.UserRole.kitchen,
            models.UserRole.bartender,
            models.UserRole.waiter,
            models.UserRole.receptionist,
        ]
        for i, role in enumerate(tenant_roles):
            u = models.User(
                email=f"urole-{role.value}-{i}@test.local",
                hashed_password=security.get_password_hash("secret"),
                tenant_id=tenant.id,
                role=role,
            )
            self.session.add(u)
        self.session.commit()

        pu = models.User(
            email="urole-provider@test.local",
            hashed_password=security.get_password_hash("secret"),
            tenant_id=None,
            provider_id=provider.id,
            role=models.UserRole.provider,
        )
        self.session.add(pu)
        self.session.commit()
        self.session.refresh(pu)
        self.assertEqual(pu.role, models.UserRole.provider)
