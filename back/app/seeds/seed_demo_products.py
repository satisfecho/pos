"""
Seed default products for any tenant that has no products.
Idempotent: creates only products that don't exist (by tenant_id + name).
No image filenames so it works on any new deployment.

Usage:
  docker compose exec back python -m app.seeds.seed_demo_products
  cd back && python -m app.seeds.seed_demo_products
"""

from sqlalchemy import text
from sqlmodel import Session

from app.db import engine
from app.models import Product

# Default menu: name, price_cents, category, ingredients (optional)
DEMO_PRODUCTS = [
    # Main courses
    ("Enchiladas", 2000, "Main Course", "tortillas, chiles, protein, cheese, cream"),
    ("Chile Relleno", 1500, "Main Course", "poblano peppers, cheese, eggs, tomato sauce"),
    ("Tacos de Carne Asada", 1200, "Main Course", "beef, tortillas, onion, cilantro, salsa"),
    ("Mole Poblano", 1500, "Main Course", "chocolate, chiles, chicken, sesame, almonds"),
    ("Pozole", 1800, "Main Course", "hominy, pork or chicken, chiles, oregano"),
    # Beverages
    ("Coca Cola", 300, "Beverages", None),
    ("Tecate Roja", 400, "Beverages", None),
    ("Tecate Light", 400, "Beverages", None),
    ("Water", 0, "Beverages", None),
    ("Coffee", 250, "Beverages", None),
]


def _seed_tenant_products(session, tenant_id: int) -> int:
    """Create missing demo products for tenant. Returns number created."""
    result = session.execute(
        text('SELECT name FROM product WHERE tenant_id = :tid'),
        {"tid": tenant_id},
    )
    existing_names = {row[0] for row in result.fetchall()}
    created = 0
    for name, price_cents, category, ingredients in DEMO_PRODUCTS:
        if name in existing_names:
            continue
        product = Product(
            tenant_id=tenant_id,
            name=name,
            price_cents=price_cents,
            category=category,
            ingredients=ingredients,
            image_filename=None,
            description=None,
        )
        session.add(product)
        created += 1
    return created


def run() -> None:
    with Session(engine) as session:
        result = session.execute(text("SELECT id FROM tenant ORDER BY id"))
        tenant_ids = [row[0] for row in result.fetchall()]
        if not tenant_ids:
            print("No tenants found.")
            return

        result = session.execute(text("SELECT tenant_id FROM product GROUP BY tenant_id"))
        tenants_with_products = {row[0] for row in result.fetchall()}
        to_seed = [tid for tid in tenant_ids if tid not in tenants_with_products]

        if not to_seed:
            print("All tenants already have products. Nothing to seed.")
            return

        for tenant_id in to_seed:
            created = _seed_tenant_products(session, tenant_id)
            if created:
                session.commit()
                print(f"Tenant {tenant_id}: created {created} demo products.")

    print("Done.")


if __name__ == "__main__":
    run()
