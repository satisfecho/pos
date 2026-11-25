"""Unit tests for careers at-rest encryption (#447)."""

from app.careers_crypto import (
    decrypt_careers_file_bytes,
    decrypt_careers_pii,
    encrypt_careers_file_bytes,
    encrypt_careers_pii,
)


def test_careers_pii_roundtrip():
    data = {
        "name": "Ada Lovelace",
        "email": "ada@amvara.de",
        "phone": "+34911222333",
        "message": "Interested in kitchen",
        "cv_original_name": "ada.pdf",
    }
    ct = encrypt_careers_pii(data)
    assert ct != data["email"]
    assert "Ada" not in ct
    assert decrypt_careers_pii(ct) == data


def test_careers_file_roundtrip():
    raw = b"%PDF-1.4 fake cv bytes"
    enc = encrypt_careers_file_bytes(raw)
    assert enc != raw
    assert decrypt_careers_file_bytes(enc) == raw


def test_careers_pii_bad_ciphertext():
    assert decrypt_careers_pii(None) is None
    assert decrypt_careers_pii("not-valid") is None
