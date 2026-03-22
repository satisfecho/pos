"""Normalize and validate contact fields (email, phone) for registration and reservations."""

from email_validator import EmailNotValidError, validate_email
from phonenumbers import NumberParseException, PhoneNumberFormat, format_number, is_valid_number, parse

MAX_DELAY_NOTICE_CHARS = 500


def normalize_email_address(raw: str) -> str:
    """
    Validate and normalize email (RFC-like). Raises ValueError if invalid.
    Does not perform MX lookup (avoids flaky DNS in some environments).
    """
    if not raw or not isinstance(raw, str):
        raise ValueError("empty email")
    s = raw.strip()
    if not s:
        raise ValueError("empty email")
    try:
        return validate_email(s, check_deliverability=False).normalized
    except EmailNotValidError as e:
        raise ValueError("invalid email") from e


def normalize_phone_e164(raw: str, default_region: str) -> str:
    """
    Parse and validate phone; return E.164 (e.g. +34912345678).
    default_region: ISO 3166-1 alpha-2 (e.g. ES) for numbers without country code.
    """
    if not raw or not isinstance(raw, str):
        raise ValueError("empty phone")
    s = raw.strip()
    if not s:
        raise ValueError("empty phone")
    region = (default_region or "ES").upper()[:2]
    try:
        num = parse(s, region)
    except NumberParseException as e:
        raise ValueError("invalid phone") from e
    if not is_valid_number(num):
        raise ValueError("invalid phone")
    return format_number(num, PhoneNumberFormat.E164)
