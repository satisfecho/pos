"""Provider product image paths: only expose URLs/refs when the file exists on disk."""

from __future__ import annotations

from pathlib import Path

from sqlmodel import Session, select

from app import models

UPLOADS_DIR = Path(__file__).parent.parent / "uploads"


def provider_product_file_path(provider_token: str, image_filename: str) -> Path:
    """Absolute path for a provider product image file."""
    return UPLOADS_DIR / "providers" / provider_token / "products" / image_filename


def provider_product_image_url(provider_token: str, image_filename: str | None) -> str | None:
    """Public /uploads URL when image_filename is set and the file exists; else None."""
    if not image_filename:
        return None
    fn = image_filename.replace("\\", "/").strip("/")
    if "/" in fn or fn.startswith("."):
        return None
    if not provider_product_file_path(provider_token, fn).is_file():
        return None
    return f"/uploads/providers/{provider_token}/products/{fn}"


def provider_product_stored_image_path(
    provider_token: str, image_filename: str | None
) -> str | None:
    """Relative path stored on Product.image_filename when the file exists; else None."""
    if not image_filename:
        return None
    fn = image_filename.replace("\\", "/").strip("/")
    if "/" in fn or fn.startswith("."):
        return None
    if not provider_product_file_path(provider_token, fn).is_file():
        return None
    return f"providers/{provider_token}/products/{fn}"


def product_stored_image_exists(tenant_id: int, image_filename: str | None) -> bool:
    """True when image_filename points at a file under uploads/ (tenant or provider path)."""
    if not image_filename:
        return False
    fn = image_filename.replace("\\", "/").strip("/")
    if not fn or fn.startswith(".") or ".." in fn.split("/"):
        return False
    if fn.startswith("providers/"):
        return (UPLOADS_DIR / fn).is_file()
    if "/" in fn:
        return False
    return (UPLOADS_DIR / str(tenant_id) / "products" / fn).is_file()


def resolve_linked_tenant_product_image_filename(
    session: Session,
    tenant_product: models.TenantProduct,
) -> str | None:
    """Best stored path for a linked TenantProduct (tenant upload or provider catalog)."""
    if tenant_product.image_filename and product_stored_image_exists(
        tenant_product.tenant_id, tenant_product.image_filename
    ):
        return tenant_product.image_filename
    if tenant_product.provider_product_id:
        provider_product = session.get(
            models.ProviderProduct, tenant_product.provider_product_id
        )
        if provider_product and provider_product.image_filename:
            provider = session.get(models.Provider, provider_product.provider_id)
            if provider:
                stored = provider_product_stored_image_path(
                    provider.token, provider_product.image_filename
                )
                if stored:
                    return stored
    return None


def repair_product_image_filename(
    session: Session,
    product: models.Product,
    tenant_product: models.TenantProduct | None,
) -> str | None:
    """
    Image path to store on Product.

  Never replaces a custom tenant upload or any path whose file exists on disk.
  Repairs stale provider catalog refs after re-import when a linked TenantProduct exists.
    """
    current = product.image_filename
    if current and product_stored_image_exists(product.tenant_id, current):
        return current
    if tenant_product:
        resolved = resolve_linked_tenant_product_image_filename(session, tenant_product)
        if resolved:
            return resolved
    return None


def sync_product_images_for_tenant(session: Session, tenant_id: int) -> dict[str, int]:
    """Repair Product.image_filename rows for one tenant (idempotent)."""
    repaired = 0
    cleared = 0
    unchanged = 0
    products = session.exec(
        select(models.Product).where(models.Product.tenant_id == tenant_id)
    ).all()
    for product in products:
        tenant_product = session.exec(
            select(models.TenantProduct).where(
                models.TenantProduct.product_id == product.id,
                models.TenantProduct.tenant_id == tenant_id,
            )
        ).first()
        target = repair_product_image_filename(session, product, tenant_product)
        if target == product.image_filename:
            unchanged += 1
            continue
        if target is None and product.image_filename:
            cleared += 1
        else:
            repaired += 1
        product.image_filename = target
        session.add(product)
    if repaired or cleared:
        session.commit()
    return {
        "repaired": repaired,
        "cleared": cleared,
        "unchanged": unchanged,
    }


def product_image_consistency_errors(
    session: Session,
    tenant_id: int,
) -> list[str]:
    """
    Products that show an image on the public menu but lack a valid Product.image_filename.

    Public menu resolves live from TenantProduct/provider; /products uses Product rows.
    """
    from .public_tenant_menu import build_public_tenant_menu

    menu = build_public_tenant_menu(session, tenant_id, "en")
    public_names_with_image: set[str] = set()
    for category in menu.get("categories") or []:
        for row in category.get("products") or []:
            if row.get("image_url") and row.get("name"):
                public_names_with_image.add(str(row["name"]))

    if not public_names_with_image:
        return []

    errors: list[str] = []
    products = session.exec(
        select(models.Product).where(models.Product.tenant_id == tenant_id)
    ).all()
    by_name = {p.name: p for p in products if p.name}
    for name in sorted(public_names_with_image):
        product = by_name.get(name)
        if product is None:
            continue
        tenant_product = session.exec(
            select(models.TenantProduct).where(
                models.TenantProduct.product_id == product.id,
                models.TenantProduct.tenant_id == tenant_id,
            )
        ).first()
        if tenant_product is None:
            continue
        if product_stored_image_exists(product.tenant_id, product.image_filename):
            continue
        errors.append(
            f"{name!r}: public menu has image but Product.image_filename is missing or orphan"
        )
    return errors


def clear_orphan_provider_product_images(session: Session) -> dict[str, int]:
    """
    Clear ProviderProduct.image_filename (and Product refs under providers/) when the file is missing.

    Idempotent. Does not delete rows or files that exist.
    """
    providers = {p.id: p for p in session.exec(select(models.Provider)).all()}
    cleared_pp = 0
    for pp in session.exec(
        select(models.ProviderProduct).where(models.ProviderProduct.image_filename.is_not(None))
    ).all():
        provider = providers.get(pp.provider_id)
        if not provider or not pp.image_filename:
            continue
        fn = pp.image_filename.replace("\\", "/").strip("/")
        if "/" in fn or fn.startswith(".") or not provider_product_file_path(provider.token, fn).is_file():
            pp.image_filename = None
            session.add(pp)
            cleared_pp += 1

    cleared_product = 0
    for product in session.exec(
        select(models.Product).where(models.Product.image_filename.is_not(None))
    ).all():
        fn = (product.image_filename or "").replace("\\", "/").strip("/")
        if not fn.startswith("providers/"):
            continue
        path = UPLOADS_DIR / fn
        if not path.is_file():
            product.image_filename = None
            session.add(product)
            cleared_product += 1

    if cleared_pp or cleared_product:
        session.commit()

    return {
        "provider_products_cleared": cleared_pp,
        "products_cleared": cleared_product,
    }
