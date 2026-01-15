#!/usr/bin/env python3
"""
Seed script for basic global translations.

This script adds some common translations for catalog items that might be shared
across multiple tenants. In a production environment, this would be run after
migration or as part of the initial setup.
"""

import asyncio
from sqlmodel import Session, select
from app.db import create_db_and_tables, engine
from app.models import ProductCatalog, I18nText


async def seed_global_translations():
    """Seed basic global translations for common catalog items."""

    # Create database tables
    create_db_and_tables()

    with Session(engine) as session:
        # Find some common catalog items to translate
        catalog_items = session.exec(
            select(ProductCatalog).where(ProductCatalog.name.is_not(None)).limit(10)
        ).all()

        translations_added = 0

        for item in catalog_items:
            # Skip if already has translations
            existing = session.exec(
                select(I18nText).where(
                    I18nText.tenant_id.is_(None),  # Global
                    I18nText.entity_type == "product_catalog",
                    I18nText.entity_id == item.id,
                    I18nText.field == "name",
                )
            ).first()

            if existing:
                continue

            # Add basic translations (this is just a demo - real translations would be more comprehensive)
            translations = []

            # Spanish
            if item.name:
                if "wine" in item.name.lower():
                    translations.append(
                        I18nText(
                            tenant_id=None,
                            entity_type="product_catalog",
                            entity_id=item.id,
                            field="name",
                            lang="es",
                            text=item.name.replace("Wine", "Vino")
                            .replace("Red", "Tinto")
                            .replace("White", "Blanco"),
                        )
                    )

            # German
            if item.name:
                if "wine" in item.name.lower():
                    translations.append(
                        I18nText(
                            tenant_id=None,
                            entity_type="product_catalog",
                            entity_id=item.id,
                            field="name",
                            lang="de",
                            text=item.name.replace("Wine", "Wein")
                            .replace("Red", "Rot")
                            .replace("White", "Weiß"),
                        )
                    )

            # Add translations to session
            for translation in translations:
                session.add(translation)
                translations_added += 1

        session.commit()
        print(f"Added {translations_added} global translations for catalog items")


if __name__ == "__main__":
    asyncio.run(seed_global_translations())
