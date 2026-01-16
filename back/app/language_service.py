"""
Language service for normalizing language codes and managing translations.
"""

from fastapi import Query, Header

SUPPORTED_LANGUAGES = [
    "en",  # English
    "es",  # Spanish
    "ca",  # Catalan
    "de",  # German
    "zh-CN",  # Chinese Simplified
    "hi",  # Hindi
]


def normalize_language_code(lang: str) -> str | None:
    """
    Normalize language codes from various formats to supported ones.

    Examples:
    - 'zh', 'zh-Hans', 'zh_CN' -> 'zh-CN'
    - 'es-MX', 'es_ES' -> 'es'
    - 'en-US', 'en' -> 'en'

    Returns None if language is not supported.
    """
    if not lang:
        return None

    # Convert to lowercase and replace underscores with hyphens
    normalized = lang.lower().replace("_", "-")

    # Handle Chinese variants
    if normalized.startswith("zh"):
        return "zh-CN"

    # Extract base language (everything before first hyphen)
    base_lang = normalized.split("-")[0]

    # Check if base language is supported
    if base_lang in SUPPORTED_LANGUAGES:
        return base_lang

    # Check for exact matches with region codes
    if normalized in SUPPORTED_LANGUAGES:
        return normalized

    return None


def get_supported_languages() -> list[str]:
    """Return list of supported language codes."""
    return SUPPORTED_LANGUAGES.copy()


def get_requested_language(
    lang: str | None = Query(None, description="Language code (e.g. en, es, zh-CN)"),
    accept_language: str | None = Header(
        None, alias="Accept-Language", description="Accept-Language header"
    ),
) -> str:
    """
    Determine the requested language based on query param or Accept-Language header.
    Returns normalized language code or 'en' as fallback.
    """
    # 1. Check explicit lang query parameter
    if lang:
        normalized = normalize_language_code(lang)
        if normalized:
            return normalized

    # 2. Parse Accept-Language header
    if accept_language:
        # Simple parsing - take the first language with highest quality
        # Format: "en-US,en;q=0.9,es;q=0.8"
        languages = []
        for part in accept_language.split(","):
            lang_part = part.strip().split(";")[0].strip()
            if lang_part:
                normalized = normalize_language_code(lang_part)
                if normalized:
                    languages.append(normalized)

        if languages:
            return languages[0]  # Return highest priority

    # 3. Fallback to English
    return "en"
