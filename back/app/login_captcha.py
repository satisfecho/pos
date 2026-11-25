"""Self-hosted login CAPTCHA (SVG text challenge) after failed attempts (#452).

No third-party providers. Challenges and failure counters use Redis when available,
with a process-local in-memory fallback so single-instance DEV still works.
"""

from __future__ import annotations

import hashlib
import logging
import secrets
import threading
import time
from typing import Any

import redis

from .rate_limits import rate_limit_key, rate_limit_redis_url
from .settings import settings

logger = logging.getLogger(__name__)

# Ambiguous glyphs omitted (0/O, 1/I/L).
_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
_CHALLENGE_PREFIX = "login_captcha:chal:"
_FAIL_PREFIX = "login_captcha:fail:"

_memory_lock = threading.Lock()
_memory: dict[str, tuple[str, float]] = {}  # key -> (value, expires_at)


def is_enabled() -> bool:
    return bool(getattr(settings, "login_captcha_enabled", True))


def after_failures() -> int:
    n = int(getattr(settings, "login_captcha_after_failures", 3) or 3)
    return max(1, n)


def challenge_ttl_seconds() -> int:
    n = int(getattr(settings, "login_captcha_ttl_seconds", 300) or 300)
    return max(60, n)


def fail_window_seconds() -> int:
    """Align with login rate-limit window (15 minutes)."""
    return 15 * 60


def _redis() -> redis.Redis | None:
    try:
        r = redis.Redis.from_url(
            rate_limit_redis_url(),
            decode_responses=True,
            socket_connect_timeout=0.5,
            socket_timeout=0.5,
        )
        r.ping()
        return r
    except Exception as e:
        logger.warning("Login CAPTCHA Redis unavailable (using memory): %s", e)
        return None


def _mem_set(key: str, value: str, ttl: int) -> None:
    with _memory_lock:
        _memory[key] = (value, time.monotonic() + ttl)


def _mem_get(key: str) -> str | None:
    with _memory_lock:
        item = _memory.get(key)
        if not item:
            return None
        value, expires = item
        if time.monotonic() > expires:
            _memory.pop(key, None)
            return None
        return value


def _mem_delete(key: str) -> None:
    with _memory_lock:
        _memory.pop(key, None)


def _mem_incr(key: str, ttl: int) -> int:
    with _memory_lock:
        item = _memory.get(key)
        now = time.monotonic()
        if not item or now > item[1]:
            _memory[key] = ("1", now + ttl)
            return 1
        n = int(item[0]) + 1
        _memory[key] = (str(n), item[1])
        return n


def _hash_answer(answer: str) -> str:
    normalized = (answer or "").strip().upper().replace(" ", "")
    return hashlib.sha256(normalized.encode("utf-8")).hexdigest()


def _random_text(length: int = 5) -> str:
    fixed = (getattr(settings, "login_captcha_fixed_code", "") or "").strip()
    if fixed and not settings.is_production:
        return fixed.upper()[:length].ljust(length, "A")[:length]
    return "".join(secrets.choice(_CHARS) for _ in range(length))


def _svg_for(text: str) -> str:
    """Minimal SVG captcha (no external image libs)."""
    width = 160
    height = 48
    parts: list[str] = [
        f'<svg xmlns="http://www.w3.org/2000/svg" width="{width}" height="{height}" '
        f'viewBox="0 0 {width} {height}" role="img" aria-label="CAPTCHA">'
        f'<rect width="100%" height="100%" fill="#f4f4f5"/>'
    ]
    for _ in range(4):
        x1, y1 = secrets.randbelow(width), secrets.randbelow(height)
        x2, y2 = secrets.randbelow(width), secrets.randbelow(height)
        parts.append(
            f'<line x1="{x1}" y1="{y1}" x2="{x2}" y2="{y2}" '
            f'stroke="#a1a1aa" stroke-width="1" opacity="0.7"/>'
        )
    start_x = 18
    for i, ch in enumerate(text):
        x = start_x + i * 26
        y = 30 + secrets.randbelow(7) - 3
        rot = secrets.randbelow(25) - 12
        parts.append(
            f'<text x="{x}" y="{y}" font-family="ui-monospace,monospace" font-size="22" '
            f'font-weight="700" fill="#18181b" transform="rotate({rot} {x} {y})">{ch}</text>'
        )
    parts.append("</svg>")
    return "".join(parts)


def create_challenge() -> dict[str, str]:
    """Create a challenge; returns id + svg markup (no plaintext answer)."""
    answer = _random_text(5)
    challenge_id = secrets.token_urlsafe(16)
    key = f"{_CHALLENGE_PREFIX}{challenge_id}"
    value = _hash_answer(answer)
    ttl = challenge_ttl_seconds()
    r = _redis()
    if r is not None:
        try:
            r.setex(key, ttl, value)
        except Exception as e:
            logger.warning("Login CAPTCHA Redis setex failed: %s", e)
            _mem_set(key, value, ttl)
    else:
        _mem_set(key, value, ttl)
    return {"id": challenge_id, "svg": _svg_for(answer)}


def verify_and_consume(challenge_id: str | None, answer: str | None) -> bool:
    if not challenge_id or not answer:
        return False
    key = f"{_CHALLENGE_PREFIX}{challenge_id.strip()}"
    expected: str | None = None
    r = _redis()
    if r is not None:
        try:
            expected = r.get(key)
            if expected is not None:
                r.delete(key)
        except Exception as e:
            logger.warning("Login CAPTCHA Redis get/delete failed: %s", e)
            expected = None
    if expected is None:
        expected = _mem_get(key)
        _mem_delete(key)
    if expected is None:
        return False
    return secrets.compare_digest(expected, _hash_answer(answer))


def failure_count(client_key: str) -> int:
    key = f"{_FAIL_PREFIX}{client_key}"
    r = _redis()
    if r is not None:
        try:
            raw = r.get(key)
            return int(raw) if raw else 0
        except Exception as e:
            logger.warning("Login CAPTCHA Redis get fail count failed: %s", e)
    raw = _mem_get(key)
    return int(raw) if raw else 0


def record_failure(client_key: str) -> int:
    key = f"{_FAIL_PREFIX}{client_key}"
    ttl = fail_window_seconds()
    r = _redis()
    if r is not None:
        try:
            n = int(r.incr(key))
            if n == 1:
                r.expire(key, ttl)
            return n
        except Exception as e:
            logger.warning("Login CAPTCHA Redis incr failed: %s", e)
    return _mem_incr(key, ttl)


def clear_failures(client_key: str) -> None:
    key = f"{_FAIL_PREFIX}{client_key}"
    r = _redis()
    if r is not None:
        try:
            r.delete(key)
        except Exception as e:
            logger.warning("Login CAPTCHA Redis delete fail count failed: %s", e)
    _mem_delete(key)


def requires_captcha(client_key: str) -> bool:
    if not is_enabled():
        return False
    return failure_count(client_key) >= after_failures()


def client_key_from_request(request: Any) -> str:
    return rate_limit_key(request)
