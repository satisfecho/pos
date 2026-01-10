"""
Seed data for Products table.
Generated: 2026-01-10
Version: 1.0.0

Usage:
    1. Ensure database is set up and running
    2. Run: python -m app.seeds.products
    
    Or import and call seed_products() from your code.
"""

from sqlmodel import Session, select
from app.db import engine
from app.models import Product, Tenant


PRODUCTS_DATA = [
    # Tenant 1 products
    {"tenant_id": 1, "name": "Enchiladas", "price_cents": 20000, "image_filename": "107f0da3-b960-46a7-9e9f-cdfbfb2d7d05.jpeg", "ingredients": "tortillas de maíz, chiles (para la salsa), proteína (pollo, res o queso), aceite, crema, queso fresco, cebolla, lechuga."},
    {"tenant_id": 1, "name": "Chile Relleno", "price_cents": 15000, "image_filename": "53196ee2-fada-4d71-ae72-ce8b8766a946.jpeg", "ingredients": "chiles poblanos, queso (o picadillo de carne), huevos, harina, aceite, jitomates, cebolla, ajo, sal, pimienta."},
    {"tenant_id": 1, "name": "Tecate Roja", "price_cents": 4000, "image_filename": "996f0279-f96c-484c-9407-10c5945a77a8.jpeg", "ingredients": None},
    {"tenant_id": 1, "name": "Tecate Light", "price_cents": 4000, "image_filename": "6032405e-0ee2-46c6-b840-61bdd97bbffe.jpeg", "ingredients": None},
    {"tenant_id": 1, "name": "Pozole", "price_cents": 18000, "image_filename": "ebd3b22c-2b26-4dcd-9d90-b33643e0581b.jpeg", "ingredients": "maíz cacahuazintle (pozolero), carne de cerdo (espinazo, pierna o cabeza) o pollo, agua, cebolla, ajo, chiles secos (guajillo y ancho para el rojo), sal, orégano, lechuga, rábanos, limones, tostadas."},
    {"tenant_id": 1, "name": "Coca Cola", "price_cents": 3000, "image_filename": "a04b8fe7-5635-4861-a70d-06c99c8e8e31.jpeg", "ingredients": None},
    {"tenant_id": 1, "name": "Tacos de Carne Asada", "price_cents": 12000, "image_filename": "25bb8015-c6fb-491e-8e2b-3ceb134101c4.jpeg", "ingredients": "carne de res (arrachera, diezmillo o sirloin), tortillas (de maíz o de harina), cebolla, cilantro, sal, limones, salsa, aguacate."},
    {"tenant_id": 1, "name": "Mole Poblano", "price_cents": 15000, "image_filename": "0a46468d-c7cc-4d58-af2d-ce3057ad76ae.jpeg", "ingredients": "chile ancho, chile mulato, chile pasilla, chocolate de mesa, ajonjolí, almendras, cacahuates, pasas, canela, clavo de olor, pimienta gorda, tortilla (o pan bolillo), ajo, cebolla, manteca de cerdo, caldo de pollo, sal."},
    
    # Tenant 2 products
    {"tenant_id": 2, "name": "Producto 3", "price_cents": 30000, "image_filename": None, "ingredients": None},
    
    # Tenant 3 products
    {"tenant_id": 3, "name": "Mole Poblano", "price_cents": 15000, "image_filename": "7dc35dcb-8fc3-49f5-88c3-b1564408fe64.jpeg", "ingredients": "chile ancho, chile mulato, chile pasilla, chocolate de mesa, ajonjolí, almendras, cacahuates, pasas, canela, clavo de olor, pimienta gorda, tortilla (o pan bolillo), ajo, cebolla, manteca de cerdo, caldo de pollo, sal."},
    {"tenant_id": 3, "name": "Chile Relleno", "price_cents": 20000, "image_filename": "15204724-473b-480f-b4ff-28143d937f0b.jpeg", "ingredients": "chiles poblanos, queso (o picadillo de carne), huevos, harina, aceite, jitomates, cebolla, ajo, sal, pimienta."},
    {"tenant_id": 3, "name": "Enchiladas", "price_cents": 17000, "image_filename": "4c8924ab-bc88-4117-8a25-5c0a1a04639d.jpeg", "ingredients": "tortillas de maíz, chiles (para la salsa), proteína (pollo, res o queso), aceite, crema, queso fresco, cebolla, lechuga."},
    {"tenant_id": 3, "name": "Pozole", "price_cents": 18500, "image_filename": "594218a7-e72c-40cc-94cc-c32d9519f852.jpeg", "ingredients": "maíz cacahuazintle (pozolero), carne de cerdo (espinazo, pierna o cabeza) o pollo, agua, cebolla, ajo, chiles secos (guajillo y ancho para el rojo), sal, orégano, lechuga, rábanos, limones, tostadas."},
    {"tenant_id": 3, "name": "Tacos", "price_cents": 13000, "image_filename": "98d735e9-8c8a-4e64-be62-12a6a35ee38c.jpeg", "ingredients": "carne de res (arrachera, diezmillo o sirloin), tortillas (de maíz o de harina), cebolla, cilantro, sal, limones, salsa, aguacate."},
    {"tenant_id": 3, "name": "Coca Cola", "price_cents": 4000, "image_filename": "eca061e1-f9b9-4a79-b0a5-959ba6cfadcb.jpeg", "ingredients": None},
    {"tenant_id": 3, "name": "Tecate Roja", "price_cents": 5000, "image_filename": "832541cb-acec-4549-b7d0-8a119f96f736.jpeg", "ingredients": None},
    {"tenant_id": 3, "name": "Tecate Light", "price_cents": 5000, "image_filename": "cf37f67a-f96b-4aad-ad9a-bd4cc63644c2.jpeg", "ingredients": None},
]


def seed_products(clear_existing: bool = False) -> int:
    """
    Seed products into the database.
    
    Args:
        clear_existing: If True, deletes all existing products before seeding.
        
    Returns:
        Number of products created.
    """
    with Session(engine) as session:
        if clear_existing:
            # Delete all existing products
            existing = session.exec(select(Product)).all()
            for product in existing:
                session.delete(product)
            session.commit()
            print(f"Deleted {len(existing)} existing products")
        
        created_count = 0
        for product_data in PRODUCTS_DATA:
            # Check if tenant exists
            tenant = session.exec(
                select(Tenant).where(Tenant.id == product_data["tenant_id"])
            ).first()
            
            if not tenant:
                print(f"Warning: Tenant {product_data['tenant_id']} does not exist. Skipping product: {product_data['name']}")
                continue
            
            # Check if product already exists (by name and tenant)
            existing = session.exec(
                select(Product).where(
                    Product.tenant_id == product_data["tenant_id"],
                    Product.name == product_data["name"]
                )
            ).first()
            
            if existing:
                print(f"Product '{product_data['name']}' already exists for tenant {product_data['tenant_id']}. Skipping.")
                continue
            
            product = Product(**product_data)
            session.add(product)
            created_count += 1
        
        session.commit()
        print(f"Created {created_count} products")
        return created_count


if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description="Seed products into the database")
    parser.add_argument("--clear", action="store_true", help="Clear existing products before seeding")
    args = parser.parse_args()
    
    seed_products(clear_existing=args.clear)
