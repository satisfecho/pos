"""HMAC-SHA256 storage for per-tenant staff clock QR tokens (no plaintext in DB).

Encrypted ciphertext (Fernet) is stored alongside the digest so admins can re-download
the QR URL after reload; decryption uses the app secret (server-side only).
"""

from __future__ import annotations

import base64
import hashlib
import hmac
import secrets

from cryptography.fernet import Fernet, InvalidToken

from app.settings import settings


def _clock_qr_fernet() -> Fernet:
    key = base64.urlsafe_b64encode(
        hashlib.sha256((settings.secret_key + ":clock_qr_fernet_v1").encode()).digest()
    )
    return Fernet(key)


def encrypt_clock_qr_token_for_storage(token: str) -> str:
    """Encrypts the plain token for at-rest storage (Fernet, key from SECRET_KEY)."""
    return _clock_qr_fernet().encrypt(token.encode("utf-8")).decode("ascii")


def decrypt_clock_qr_token_from_storage(stored: str | None) -> str | None:
    """Decrypts ciphertext from DB; returns None if missing, invalid, or wrong key."""
    if not stored or not stored.strip():
        return None
    try:
        return _clock_qr_fernet().decrypt(stored.strip().encode("ascii")).decode("utf-8")
    except (InvalidToken, ValueError, UnicodeError):
        return None


def generate_clock_qr_token() -> str:
    """URL-safe random token for printed QR / deep links (32 bytes hex)."""
    return secrets.token_hex(32)


def hash_clock_qr_token(token: str) -> str:
    """Deterministic digest for persistence; uses app secret as pepper."""
    key = settings.secret_key.encode("utf-8")
    msg = token.encode("utf-8")
    return hmac.new(key, msg, hashlib.sha256).hexdigest()


def clock_qr_tokens_equal(stored_hash: str | None, token: str | None) -> bool:
    if not stored_hash or not token or not token.strip():
        return False
    digest = hash_clock_qr_token(token.strip())
    return hmac.compare_digest(stored_hash, digest)
