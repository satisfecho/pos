from app.tenant_currency import (
    apply_tenant_currency_api_dict,
    normalize_tenant_currency_fields,
    sync_tenant_currency_symbol_from_code,
)


def test_normalize_defaults_to_eur():
    assert normalize_tenant_currency_fields(None, None) == ("EUR", "€")
    assert normalize_tenant_currency_fields("", "$") == ("EUR", "€")


def test_normalize_usd():
    assert normalize_tenant_currency_fields("usd", None) == ("USD", "$")


def test_apply_dict_mutates():
    d = {"currency_code": None, "currency": "$"}
    apply_tenant_currency_api_dict(d)
    assert d["currency_code"] == "EUR"
    assert d["currency"] == "€"


def test_apply_dict_keeps_usd():
    d = {"currency_code": "USD", "currency": "€"}
    apply_tenant_currency_api_dict(d)
    assert d["currency_code"] == "USD"
    assert d["currency"] == "$"


def test_sync_symbol():
    assert sync_tenant_currency_symbol_from_code("EUR") == "€"
    assert sync_tenant_currency_symbol_from_code(None) is None
