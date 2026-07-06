"""
Link tenant products that have no image to catalog provider products that have images.
So GET /products can backfill Product.image_filename from ProviderProduct when the user loads /products.

Runs after catalog imports (beer, pizza, wine). Idempotent: only creates TenantProduct
for Product rows that have no image and no existing TenantProduct link.
Links only when normalized names match (Product vs ProviderProduct or ProductCatalog).

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


def _names_match(product_name: str, catalog: ProductCatalog | None, provider_product: ProviderProduct | None) -> bool:
    """True when product name matches catalog or provider product name (normalized)."""
    norm = _normalize(product_name)
    if not norm:
        return False
    if catalog and _normalize(catalog.name) == norm:
        return True
    if provider_product and _normalize(provider_product.name) == norm:
        return True
    return False


def _find_matching_provider_product(
    product_name: str,
    provider_products: list[ProviderProduct],
    catalogs: dict[int, ProductCatalog],
) -> ProviderProduct | None:
    norm = _normalize(product_name)
    if not norm:
        return None
    for pp in provider_products:
        cat = catalogs.get(pp.catalog_id)
        if cat and _normalize(cat.name) == norm:
            return pp
        if _normalize(pp.name) == norm:
            return pp
    return None


def repair_mismatched_links(session: Session) -> int:
    """
    Remove TenantProduct rows linked to a Product whose name does not match
    the catalog or provider product (bad links from prior round-robin runs).
    """
    linked = session.exec(
        select(TenantProduct).where(TenantProduct.product_id.is_not(None))
    ).all()
    removed = 0
    for tp in linked:
        product = session.get(Product, tp.product_id)
        if not product:
            continue
        catalog = session.get(ProductCatalog, tp.catalog_id)
        provider_product = (
            session.get(ProviderProduct, tp.provider_product_id)
            if tp.provider_product_id
            else None
        )
        if _names_match(product.name, catalog, provider_product):
            continue
        session.delete(tp)
        removed += 1
    if removed:
        session.commit()
    return removed


def link_products(session: Session) -> tuple[int, int, int]:
    """
    Repair bad links and create new name-matched TenantProduct rows.
    Returns (removed_mismatched, created, skipped_no_match).
    """
    removed = repair_mismatched_links(session)

    products_without_image = session.exec(
        select(Product).where(Product.image_filename.is_(None))
    ).all()
    if not products_without_image:
        return removed, 0, 0

    linked = {
        (tp.tenant_id, tp.product_id)
        for tp in session.exec(select(TenantProduct).where(TenantProduct.product_id.is_not(None)))
        if tp.product_id is not None
    }
    to_link = [p for p in products_without_image if (p.tenant_id, p.id) not in linked]
    if not to_link:
        return removed, 0, 0

    provider_products_with_image = session.exec(
        select(ProviderProduct).where(ProviderProduct.image_filename.is_not(None))
    ).all()
    if not provider_products_with_image:
        return removed, 0, 0

    catalog_ids = {pp.catalog_id for pp in provider_products_with_image}
    catalogs = {
        c.id: c
        for c in session.exec(select(ProductCatalog).where(ProductCatalog.id.in_(catalog_ids)))
    }

    pp_list = list(provider_products_with_image)
    created = 0
    skipped = 0
    for product in to_link:
        chosen_pp = _find_matching_provider_product(product.name, pp_list, catalogs)
        if chosen_pp is None:
            skipped += 1
            continue

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
    return removed, created, skipped


def run() -> None:
    with Session(engine) as session:
        removed, created, skipped = link_products(session)
        if removed:
            print(f"Removed {removed} mismatched TenantProduct link(s).")
        if created:
            print(f"Created {created} TenantProduct link(s). Load /products to backfill images.")
        if skipped:
            print(f"Skipped {skipped} product(s) with no catalog name match.")
        if removed == 0 and created == 0 and skipped == 0:
            print("Nothing to link or repair.")

    print("Done.")


if __name__ == "__main__":
    run()
