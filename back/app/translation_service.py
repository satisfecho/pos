"""
Translation service for fetching localized content from the database.
"""

from typing import Optional, Dict, Any
from sqlmodel import Session, select
from .models import I18nText


class TranslationService:
    """Service for managing and fetching translations."""

    @staticmethod
    def get_translated_field(
        session: Session,
        tenant_id: Optional[int],
        entity_type: str,
        entity_id: int,
        field: str,
        lang: str,
        fallback_value: str = "",
    ) -> str:
        """
        Get translated text for a specific field.

        Lookup order:
        1. Tenant-specific translation (tenant_id matches)
        2. Global translation (tenant_id IS NULL)
        3. Return fallback_value (usually the canonical field value)

        Returns the translated text or fallback_value if no translation found.
        """
        # First try tenant-specific translation
        if tenant_id is not None:
            stmt = select(I18nText).where(
                I18nText.tenant_id == tenant_id,
                I18nText.entity_type == entity_type,
                I18nText.entity_id == entity_id,
                I18nText.field == field,
                I18nText.lang == lang,
            )
            result = session.exec(stmt).first()
            if result:
                return result.text

        # Then try global translation
        stmt = select(I18nText).where(
            I18nText.tenant_id.is_(None),  # Global translation
            I18nText.entity_type == entity_type,
            I18nText.entity_id == entity_id,
            I18nText.field == field,
            I18nText.lang == lang,
        )
        result = session.exec(stmt).first()
        if result:
            return result.text

        # Return fallback
        return fallback_value

    @staticmethod
    def get_all_translations_for_entity(
        session: Session, tenant_id: Optional[int], entity_type: str, entity_id: int
    ) -> Dict[str, Dict[str, str]]:
        """
        Get all translations for an entity.

        Returns dict structure:
        {
            "name": {"en": "Product Name", "es": "Nombre del Producto"},
            "description": {"en": "Description", "es": "Descripción"}
        }
        """
        translations = {}

        # Get all translations for this entity (both tenant-specific and global)
        stmt = select(I18nText).where(
            I18nText.entity_type == entity_type, I18nText.entity_id == entity_id
        )
        results = session.exec(stmt).all()

        for translation in results:
            field = translation.field
            lang = translation.lang
            text = translation.text

            if field not in translations:
                translations[field] = {}

            # Tenant-specific takes precedence over global for the same field/lang
            if tenant_id is not None and translation.tenant_id == tenant_id:
                translations[field][lang] = text
            elif translation.tenant_id is None and lang not in translations[field]:
                translations[field][lang] = text

        return translations

    @staticmethod
    def set_translation(
        session: Session,
        tenant_id: Optional[int],
        entity_type: str,
        entity_id: int,
        field: str,
        lang: str,
        text: str,
    ) -> I18nText:
        """
        Set or update a translation.

        If tenant_id is provided, creates tenant-specific translation.
        If tenant_id is None, creates global translation.
        """
        # Check if translation already exists
        stmt = select(I18nText).where(
            I18nText.tenant_id == tenant_id,
            I18nText.entity_type == entity_type,
            I18nText.entity_id == entity_id,
            I18nText.field == field,
            I18nText.lang == lang,
        )
        existing = session.exec(stmt).first()

        if existing:
            # Update existing
            existing.text = text
            session.add(existing)
            return existing
        else:
            # Create new
            translation = I18nText(
                tenant_id=tenant_id,
                entity_type=entity_type,
                entity_id=entity_id,
                field=field,
                lang=lang,
                text=text,
            )
            session.add(translation)
            return translation
