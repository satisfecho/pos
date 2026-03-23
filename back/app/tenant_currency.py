"""Normalize tenant currency fields for API responses (GitHub #41)."""

# Display symbols for common ISO 4217 codes (legacy `Tenant.currency` column + JSON fields).
_DISPLAY_SYMBOL_BY_ISO: dict[str, str] = {
    "EUR": "€",
    "USD": "$",
    "GBP": "£",
    "JPY": "¥",
    "MXN": "$",
    "CHF": "CHF",
    "CAD": "C$",
    "AUD": "A$",
    "INR": "₹",
    "CNY": "¥",
    "TWD": "NT$",
    "BRL": "R$",
    "PLN": "zł",
    "SEK": "kr",
    "NOK": "kr",
    "DKK": "kr",
    "NZD": "NZ$",
    "KRW": "₩",
    "ILS": "₪",
    "ZAR": "R",
    "HKD": "HK$",
    "SGD": "S$",
    "THB": "฿",
    "MYR": "RM",
    "PHP": "₱",
    "CZK": "Kč",
    "HUF": "Ft",
}


def normalize_tenant_currency_fields(
    currency_code: str | None,
    currency: str | None,
) -> tuple[str, str]:
    """Return (iso_code, display_symbol). Missing code defaults to EUR/€."""
    code = (currency_code or "").strip().upper()
    if not code:
        return ("EUR", "€")
    sym = _DISPLAY_SYMBOL_BY_ISO.get(code)
    if sym is not None:
        return (code, sym)
    legacy = (currency or "").strip()
    return (code, legacy if legacy else code)


def apply_tenant_currency_api_dict(d: dict) -> None:
    """Mutate tenant-like dict in place for consistent currency_code + currency."""
    c, s = normalize_tenant_currency_fields(d.get("currency_code"), d.get("currency"))
    d["currency_code"] = c
    d["currency"] = s


def sync_tenant_currency_symbol_from_code(currency_code: str | None) -> str | None:
    """Canonical display symbol to store on Tenant.currency when ISO code is set."""
    if not currency_code or not isinstance(currency_code, str):
        return None
    raw = currency_code.strip().upper()
    if len(raw) != 3 or not raw.isalpha():
        return None
    _, sym = normalize_tenant_currency_fields(raw, None)
    return sym
