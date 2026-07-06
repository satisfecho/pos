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


_CATALOG_STALE_MARKERS = (
    "lager",
    "stout",
    "malt",
    "vino",
    "beer",
    "wine",
    "guinness",
    "damm",
    "espumoso",
    "cava",
    "rosado",
    "tinto",
    "blanco",
    "winery",
    "vintage",
)


def _looks_like_catalog_backfill(description: str | None) -> bool:
    if not description:
        return False
    low = description.lower()
    return any(marker in low for marker in _CATALOG_STALE_MARKERS)


def _clear_stale_product_backfill(product: Product) -> bool:
    """Reset Product fields left by /products backfill after a bad catalog link."""
    changed = False
    if product.image_filename:
        product.image_filename = None
        changed = True
    if product.description:
        product.description = None
        changed = True
    return changed


def repair_stale_product_backfills(session: Session) -> int:
    """
    Clear image/description on Product rows with no TenantProduct link when values
    look like stale catalog backfill (e.g. beer description on Coca Cola).
    """
    linked_product_ids = {
        tp.product_id
        for tp in session.exec(
            select(TenantProduct).where(TenantProduct.product_id.is_not(None))
        )
        if tp.product_id is not None
    }
    repaired = 0
    for product in session.exec(select(Product)):
        if product.id in linked_product_ids:
            continue
        stale_image = bool(
            product.image_filename
            and str(product.image_filename).startswith("providers/")
        )
        stale_description = _looks_like_catalog_backfill(product.description)
        if not stale_image and not stale_description:
            continue
        if _clear_stale_product_backfill(product):
            session.add(product)
            repaired += 1
    if repaired:
        session.commit()
    return repaired


def repair_mismatched_links(session: Session) -> int:
    """
    Remove TenantProduct rows linked to a Product whose name does not match
    the catalog or provider product (bad links from prior round-robin runs).
    Also clears stale Product image/description backfilled via GET /products.
    """
    linked = session.exec(
        select(TenantProduct).where(TenantProduct.product_id.is_not(None))
    ).all()
    removed = 0
    products_to_clear: list[Product] = []
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
        products_to_clear.append(product)
        removed += 1
    cleared = 0
    for product in products_to_clear:
        if _clear_stale_product_backfill(product):
            session.add(product)
            cleared += 1
    if removed or cleared:
        session.commit()
    return removed


def link_products(session: Session) -> tuple[int, int, int, int]:
    """
    Repair bad links and create new name-matched TenantProduct rows.
    Returns (removed_mismatched, cleared_stale_backfills, created, skipped_no_match).
    """
    removed = repair_mismatched_links(session)
    cleared = repair_stale_product_backfills(session)

    products_without_image = session.exec(
        select(Product).where(Product.image_filename.is_(None))
    ).all()
    if not products_without_image:
        return removed, cleared, 0, 0

    linked = {
        (tp.tenant_id, tp.product_id)
        for tp in session.exec(select(TenantProduct).where(TenantProduct.product_id.is_not(None)))
        if tp.product_id is not None
    }
    to_link = [p for p in products_without_image if (p.tenant_id, p.id) not in linked]
    if not to_link:
        return removed, cleared, 0, 0

    provider_products_with_image = session.exec(
        select(ProviderProduct).where(ProviderProduct.image_filename.is_not(None))
    ).all()
    if not provider_products_with_image:
        return removed, cleared, 0, 0

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
    return removed, cleared, created, skipped


def run() -> None:
    with Session(engine) as session:
        removed, cleared, created, skipped = link_products(session)
        if removed:
            print(f"Removed {removed} mismatched TenantProduct link(s).")
        if cleared:
            print(f"Cleared stale backfill on {cleared} product(s).")
        if created:
            print(f"Created {created} TenantProduct link(s). Load /products to backfill images.")
        if skipped:
            print(f"Skipped {skipped} product(s) with no catalog name match.")
        if removed == 0 and cleared == 0 and created == 0 and skipped == 0:
            print("Nothing to link or repair.")

    print("Done.")


if __name__ == "__main__":
    run()
