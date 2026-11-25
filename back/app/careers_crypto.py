"""Application-level Fernet encryption for careers PII and CV files (#447).

Key: CAREERS_ENCRYPTION_KEY (url-safe Fernet key) when set; otherwise derived from
SECRET_KEY + ":careers_fernet_v1" (same pattern as clock QR / delivery credentials).
"""

from __future__ import annotations

import base64
import hashlib
import json
import os

from cryptography.fernet import Fernet, InvalidToken

from app.settings import settings

CAREERS_KEY_ENV = "CAREERS_ENCRYPTION_KEY"


def _careers_fernet() -> Fernet:
    raw = (os.environ.get(CAREERS_KEY_ENV) or getattr(settings, "careers_encryption_key", "") or "").strip()
    if raw:
        # Accept raw Fernet key or any secret string (hash to 32 bytes)
        try:
            return Fernet(raw.encode("ascii") if isinstance(raw, str) else raw)
        except (ValueError, TypeError):
            key = base64.urlsafe_b64encode(hashlib.sha256(raw.encode("utf-8")).digest())
            return Fernet(key)
    key = base64.urlsafe_b64encode(
        hashlib.sha256((settings.secret_key + ":careers_fernet_v1").encode()).digest()
    )
    return Fernet(key)


def encrypt_careers_pii(data: dict) -> str:
    """Encrypt a PII dict (name/email/phone/message/cv_original_name) to ascii ciphertext."""
    raw = json.dumps(data, separators=(",", ":"), sort_keys=True).encode("utf-8")
    return _careers_fernet().encrypt(raw).decode("ascii")


def decrypt_careers_pii(stored: str | None) -> dict | None:
    if not stored or not str(stored).strip():
        return None
    try:
        plain = _careers_fernet().decrypt(str(stored).strip().encode("ascii")).decode("utf-8")
        out = json.loads(plain)
        return out if isinstance(out, dict) else None
    except (InvalidToken, ValueError, UnicodeError, json.JSONDecodeError):
        return None


def encrypt_careers_file_bytes(data: bytes) -> bytes:
    """Encrypt raw file bytes for at-rest storage under uploads/{tenant}/careers/."""
    return _careers_fernet().encrypt(data)


def decrypt_careers_file_bytes(stored: bytes | None) -> bytes | None:
    if not stored:
        return None
    try:
        return _careers_fernet().decrypt(stored)
    except (InvalidToken, ValueError):
        return None
