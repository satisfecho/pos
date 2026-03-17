"""
Phone number normalization for E.164 (e.g. for WhatsApp/Twilio).
Used when sending reservation reminders via WhatsApp.
"""

import re

# ISO 3166-1 alpha-2 -> E.164 country calling code (without +)
# Partial list; add more as needed.
_COUNTRY_CODES: dict[str, str] = {
    "AD": "376",
    "AT": "43",
    "BE": "32",
    "CA": "1",
    "CH": "41",
    "CN": "86",
    "DE": "49",
    "ES": "34",
    "FR": "33",
    "GB": "44",
    "HK": "852",
    "IE": "353",
    "IN": "91",
    "IT": "39",
    "MX": "52",
    "NL": "31",
    "PL": "48",
    "PT": "351",
    "US": "1",
    "ZA": "27",
}


def normalize_phone_to_e164(phone: str, default_country: str = "ES") -> str | None:
    """
    Normalize a phone number to E.164 format (e.g. +34931234567).

    - Strips spaces, dashes, parentheses.
    - If the number already starts with +, treat as international and ensure digits only after +.
    - Otherwise, prepend the country calling code for default_country (ISO 3166-1 alpha-2).

    Returns None if the result is too short to be valid (e.g. < 10 digits) or invalid.
    """
    if not phone or not isinstance(phone, str):
        return None
    raw = re.sub(r"[\s\-\(\)\.]", "", phone.strip())
    if not raw:
        return None

    if raw.startswith("+"):
        digits = raw[1:].lstrip("0") if raw[1:].startswith("0") else raw[1:]
        digits = re.sub(r"\D", "", digits)
        if len(digits) < 8:
            return None
        return "+" + digits

    digits_only = re.sub(r"\D", "", raw)
    if len(digits_only) < 8:
        return None
    country_upper = (default_country or "ES").upper()[:2]
    prefix = _COUNTRY_CODES.get(country_upper, "34")
    # If number already starts with country code, use as-is with +
    if digits_only.startswith(prefix) and len(digits_only) >= len(prefix) + 6:
        return "+" + digits_only
    return "+" + prefix + digits_only
