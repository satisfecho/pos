"""
Link tenant products that have no image to catalog provider products that have images.
So GET /products can backfill Product.image_filename from ProviderProduct when the user loads /products.

Runs after catalog imports (beer, pizza, wine). Idempotent: only creates TenantProduct
for Product rows that have no image and no existing TenantProduct link.

Usage:
  docker compose exec back python -m app.seeds.link_demo_products_to_catalog
  cd back && python -m app.seeds.link_demo_products_to_catalog
"""

from sqlmodel import Session, select

from app.db import engine
from app.models import Product, ProductCatalog, ProviderProduct, TenantProduct


def _normalize(name: str) -> str:
    if not name:
        return ""
    return " ".join(name.strip().lower().split())


def run() -> None:
    with Session(engine) as session:
        # Products that have no image and no TenantProduct linking them to catalog
        products_without_image = session.exec(
            select(Product).where(Product.image_filename.is_(None))
        ).all()
        if not products_without_image:
            print("No products without images. Nothing to link.")
            return

        # Products already linked (have a TenantProduct with this product_id for same tenant)
        linked = {
            (tp.tenant_id, tp.product_id)
            for tp in session.exec(select(TenantProduct).where(TenantProduct.product_id.is_not(None)))
            if tp.product_id is not None
        }
        to_link = [p for p in products_without_image if (p.tenant_id, p.id) not in linked]
        if not to_link:
            print("All products without images are already linked. Nothing to do.")
            return

        # Provider products that have an image (catalog imports store under uploads/providers/...)
        provider_products_with_image = session.exec(
            select(ProviderProduct).where(ProviderProduct.image_filename.is_not(None))
        ).all()
        if not provider_products_with_image:
            print("No provider products with images in catalog. Run beer/pizza/wine import first.")
            return

        # Build catalog_id -> ProductCatalog for name matching
        catalog_ids = {pp.catalog_id for pp in provider_products_with_image}
        catalogs = {
            c.id: c
            for c in session.exec(select(ProductCatalog).where(ProductCatalog.id.in_(catalog_ids)))
        }

        # Assign each product to a provider product: try name match, else round-robin
        pp_list = list(provider_products_with_image)
        created = 0
        for i, product in enumerate(to_link):
            norm = _normalize(product.name)
            chosen_pp = None
            for pp in pp_list:
                cat = catalogs.get(pp.catalog_id)
                if cat and _normalize(cat.name) == norm:
                    chosen_pp = pp
                    break
                if _normalize(pp.name) == norm:
                    chosen_pp = pp
                    break
            if chosen_pp is None:
                chosen_pp = pp_list[i % len(pp_list)]

            tp = TenantProduct(
                tenant_id=product.tenant_id,
                catalog_id=chosen_pp.catalog_id,
                provider_product_id=chosen_pp.id,
                product_id=product.id,
                name=product.name,
                price_cents=product.price_cents,
                ingredients=product.ingredients,
            )
            session.add(tp)
            created += 1

        if created:
            session.commit()
            print(f"Created {created} TenantProduct link(s). Load /products to backfill images.")
        else:
            print("No new links created.")

    print("Done.")


if __name__ == "__main__":
    run()
