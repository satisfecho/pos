"""Public tenant menu for marketing websites (GET /public/tenants/{tenant_id}/menu)."""

from __future__ import annotations

import re
from datetime import datetime, timezone
from zoneinfo import ZoneInfo

from sqlmodel import Session, select

from . import models
from .tenant_currency import normalize_tenant_currency_fields
from .translation_service import TranslationService

_UNCategorized_CATEGORY = "Other"
_UNCategorized_SLUG = "other"

_SENSITIVE_PRODUCT_KEYS = frozenset(
    {
        "cost_cents",
        "ingredients",
        "tax_id",
        "kitchen_station_id",
        "tenant_id",
        "_source",
        "questions",
        "wine_type",
        "category_code",
        "subcategory_codes",
        "display_name",
        "display_ingredients",
        "display_description",
        "detailed_description",
        "country",
        "region",
        "wine_style",
        "vintage",
        "winery",
        "grape_variety",
        "aromas",
        "elaboration",
        "image_filename",
    }
)


def format_public_price(price_cents: int, lang: str = "en") -> str:
    """Format cents as a decimal string (e.g. 250 -> '2,50' for es/ca)."""
    amount = price_cents / 100
    formatted = f"{amount:.2f}"
    if lang.startswith(("es", "ca")):
        return formatted.replace(".", ",")
    return formatted


def resolve_product_image_url(tenant_id: int, image_filename: str | None) -> str | None:
    if not image_filename:
        return None
    if image_filename.startswith("providers/"):
        return f"/uploads/{image_filename}"
    return f"/uploads/{tenant_id}/products/{image_filename}"


def _category_slug(name: str) -> str:
    s = name.strip().lower()
    s = re.sub(r"[^\w\s-]", "", s, flags=re.UNICODE)
    s = re.sub(r"[\s_]+", "-", s).strip("-")
    return s or _UNCategorized_SLUG


def _is_available_today(
    available_from,
    available_until,
    today,
) -> bool:
    if available_from is not None and available_from > today:
        return False
    if available_until is not None and available_until < today:
        return False
    return True


def _tenant_today(tenant: models.Tenant | None):
    try:
        tz = ZoneInfo(tenant.timezone) if tenant and tenant.timezone else timezone.utc
    except Exception:
        tz = timezone.utc
    return datetime.now(tz).date()


def _resolve_tenant_product_image(
    session: Session,
    tenant_id: int,
    tp: models.TenantProduct,
) -> str | None:
    image_filename = tp.image_filename
    if not image_filename and tp.provider_product_id:
        provider_product = session.get(models.ProviderProduct, tp.provider_product_id)
        if provider_product and provider_product.image_filename:
            provider = session.get(models.Provider, provider_product.provider_id)
            if provider:
                image_filename = (
                    f"providers/{provider.token}/products/{provider_product.image_filename}"
                )
    return resolve_product_image_url(tenant_id, image_filename)


def _translated_name(
    session: Session,
    tenant_id: int,
    entity_type: str,
    entity_id: int,
    canonical: str,
    lang: str,
) -> str:
    if lang == "en":
        return canonical
    translated = TranslationService.get_translated_field(
        session,
        tenant_id,
        entity_type,
        entity_id,
        "name",
        lang,
        canonical,
    )
    return translated or canonical


def _translated_description(
    session: Session,
    tenant_id: int,
    entity_type: str,
    entity_id: int,
    canonical: str | None,
    lang: str,
) -> str | None:
    if not canonical:
        return None
    if lang == "en":
        return canonical
    translated = TranslationService.get_translated_field(
        session,
        tenant_id,
        entity_type,
        entity_id,
        "description",
        lang,
        canonical,
    )
    return translated or canonical


def _load_flat_products(
    session: Session,
    tenant_id: int,
    lang: str,
    currency_code: str,
) -> list[dict]:
    """Load customer-visible products using the same sources/filters as GET /menu/{table_token}."""
    tenant_products = session.exec(
        select(models.TenantProduct).where(
            models.TenantProduct.tenant_id == tenant_id,
            models.TenantProduct.is_active == True,  # noqa: E712
        )
    ).all()

    legacy_products = session.exec(
        select(models.Product).where(models.Product.tenant_id == tenant_id)
    ).all()

    tenant = session.get(models.Tenant, tenant_id)
    today = _tenant_today(tenant)

    tenant_products = [
        tp
        for tp in tenant_products
        if _is_available_today(tp.available_from, tp.available_until, today)
    ]
    legacy_products = [
        p
        for p in legacy_products
        if _is_available_today(p.available_from, p.available_until, today)
    ]

    products: list[dict] = []

    linked_legacy_product_ids = {
        tp.product_id for tp in tenant_products if tp.product_id is not None
    }

    for tp in tenant_products:
        catalog_item = session.get(models.ProductCatalog, tp.catalog_id)
        category = catalog_item.category if catalog_item else None
        subcategory = catalog_item.subcategory if catalog_item else None
        description = None
        if tp.product_id:
            custom_product = session.get(models.Product, tp.product_id)
            if custom_product and custom_product.description:
                description = custom_product.description
        if not description and catalog_item and catalog_item.description:
            description = catalog_item.description

        entity_type = "tenant_product"
        entity_id = tp.id
        if tp.product_id and description:
            entity_type = "product"
            entity_id = tp.product_id

        name = _translated_name(
            session, tenant_id, "tenant_product", tp.id, tp.name or "", lang
        )
        description = _translated_description(
            session,
            tenant_id,
            entity_type,
            entity_id,
            description,
            lang,
        )

        products.append(
            {
                "id": tp.id,
                "name": name,
                "price_cents": tp.price_cents,
                "price_formatted": format_public_price(tp.price_cents, lang),
                "description": description,
                "category": category,
                "subcategory": subcategory,
                "image_url": _resolve_tenant_product_image(session, tenant_id, tp),
                "available": True,
            }
        )

    for lp in legacy_products:
        if lp.id in linked_legacy_product_ids:
            continue
        name = _translated_name(
            session, tenant_id, "product", lp.id, lp.name or "", lang
        )
        description = _translated_description(
            session, tenant_id, "product", lp.id, lp.description, lang
        )
        products.append(
            {
                "id": lp.id,
                "name": name,
                "price_cents": lp.price_cents,
                "price_formatted": format_public_price(lp.price_cents, lang),
                "description": description,
                "category": lp.category,
                "subcategory": lp.subcategory,
                "image_url": resolve_product_image_url(tenant_id, lp.image_filename),
                "available": True,
            }
        )

    return products


def group_products_into_categories(products: list[dict]) -> list[dict]:
    """Group flat product dicts into categories sorted by name."""
    by_category: dict[str, list[dict]] = {}
    for product in products:
        category_name = (product.get("category") or "").strip() or _UNCategorized_CATEGORY
        by_category.setdefault(category_name, []).append(product)

    categories = []
    for name in sorted(by_category.keys(), key=lambda n: n.lower()):
        items = sorted(by_category[name], key=lambda p: (p.get("name") or "").lower())
        categories.append(
            {
                "id": _category_slug(name),
                "name": name,
                "products": items,
            }
        )
    return categories


def build_public_tenant_menu(
    session: Session,
    tenant_id: int,
    lang: str,
) -> dict:
    tenant = session.get(models.Tenant, tenant_id)
    if not tenant:
        return None  # type: ignore[return-value]

    currency_code, _currency_symbol = normalize_tenant_currency_fields(
        tenant.currency_code,
        tenant.currency,
    )
    tenant_name = tenant.name or ""
    if lang != "en":
        translated = TranslationService.get_translated_field(
            session, tenant.id, "tenant", tenant.id, "name", lang, tenant_name
        )
        if translated:
            tenant_name = translated

    products = _load_flat_products(session, tenant_id, lang, currency_code)
    categories = group_products_into_categories(products)

    return {
        "tenant_id": tenant_id,
        "tenant_name": tenant_name,
        "currency": currency_code,
        "lang": lang,
        "categories": categories,
    }


def assert_no_sensitive_product_fields(product: dict) -> None:
    """Raise AssertionError if internal product fields are present."""
    for key in _SENSITIVE_PRODUCT_KEYS:
        if key in product:
            raise AssertionError(f"Sensitive field {key!r} must not be exposed")
