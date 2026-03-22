import pytest

from app.contact_validation import normalize_email_address, normalize_phone_e164


def test_normalize_email_accepts_common():
    assert normalize_email_address("  Test@Amvara.DE ") == "Test@amvara.de"


def test_normalize_email_rejects_garbage():
    with pytest.raises(ValueError):
        normalize_email_address("not-an-email")
    with pytest.raises(ValueError):
        normalize_email_address("")


def test_normalize_phone_es_mobile():
    out = normalize_phone_e164("612 345 678", "ES")
    assert out == "+34612345678"


def test_normalize_phone_e164_pass_through():
    assert normalize_phone_e164("+1 415 555 0100", "ES") == "+14155550100"


def test_normalize_phone_rejects_short():
    with pytest.raises(ValueError):
        normalize_phone_e164("123", "ES")
