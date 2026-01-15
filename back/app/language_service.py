"""
Language service for normalizing language codes and managing translations.
"""

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
