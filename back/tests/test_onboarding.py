"""Tests for guided signup onboarding helpers and API."""

import uuid

from sqlmodel import Session, select

from app import models
from app.db import engine
from app.onboarding import STARTER_PRODUCTS, assign_maps_url, seed_starter_products


def _create_owner(session: Session, email: str) -> models.User:
    tenant = models.Tenant(name="Onboarding Test")
    session.add(tenant)
    session.commit()
    session.refresh(tenant)
    user = models.User(
        email=email,
        hashed_password="x",
        tenant_id=tenant.id,
        role=models.UserRole.owner,
    )
    session.add(user)
    session.commit()
    session.refresh(user)
    return user


def test_assign_maps_url_openstreetmap():
    tenant = models.Tenant(name="Maps Test")
    assign_maps_url(tenant, "https://www.openstreetmap.org/node/1")
    assert tenant.public_openstreetmap_url == "https://www.openstreetmap.org/node/1"
    assert tenant.public_google_maps_url is None


def test_assign_maps_url_google():
    tenant = models.Tenant(name="Maps Test")
    assign_maps_url(tenant, "https://maps.google.com/?q=test")
    assert tenant.public_google_maps_url == "https://maps.google.com/?q=test"
    assert tenant.public_openstreetmap_url is None


def test_seed_starter_products_idempotent():
    with Session(engine) as session:
        user = _create_owner(session, f"onboarding-seed-{uuid.uuid4().hex}@test.local")
        tenant_id = user.tenant_id
        assert tenant_id is not None

        first = seed_starter_products(
            session,
            tenant_id,
            [
                {"name": "Coffee", "price_cents": 200, "enabled": True},
                {"name": "Coca Cola", "price_cents": 300, "enabled": True},
                {"name": "Water", "price_cents": 0, "enabled": False},
            ],
        )
        assert len(first) == 2
        names = {p.name for p in first}
        assert names == {"Coffee", "Coca Cola"}

        second = seed_starter_products(
            session,
            tenant_id,
            [{"name": "Coffee", "price_cents": 275, "enabled": True}],
        )
        assert len(second) == 1
        assert second[0].price_cents == 275

        products = session.exec(
            select(models.Product).where(models.Product.tenant_id == tenant_id)
        ).all()
        assert len(products) == 2
        coffee = next(p for p in products if p.name == "Coffee")
        assert coffee.price_cents == 275


def test_starter_products_constants():
    assert set(STARTER_PRODUCTS.keys()) == {"Coffee", "Coca Cola", "Water"}
