"""Self-hosted login CAPTCHA (#452)."""

from __future__ import annotations

from unittest.mock import patch

import pytest

from app import login_captcha


@pytest.fixture(autouse=True)
def _clear_memory_store():
    with login_captcha._memory_lock:
        login_captcha._memory.clear()
    yield
    with login_captcha._memory_lock:
        login_captcha._memory.clear()


def test_create_and_verify_challenge_memory():
    with patch.object(login_captcha, "_redis", return_value=None):
        with patch.object(login_captcha.settings, "login_captcha_fixed_code", "TESTA"):
            with patch.object(login_captcha.settings, "is_production", False):
                ch = login_captcha.create_challenge()
        assert ch["id"]
        assert "<svg" in ch["svg"]
        assert login_captcha.verify_and_consume(ch["id"], "testa") is True
        # one-time
        assert login_captcha.verify_and_consume(ch["id"], "TESTA") is False


def test_requires_captcha_after_threshold():
    with patch.object(login_captcha, "_redis", return_value=None):
        with patch.object(login_captcha, "after_failures", return_value=3):
            key = "test-ip-1"
            assert login_captcha.requires_captcha(key) is False
            assert login_captcha.record_failure(key) == 1
            assert login_captcha.record_failure(key) == 2
            assert login_captcha.requires_captcha(key) is False
            assert login_captcha.record_failure(key) == 3
            assert login_captcha.requires_captcha(key) is True
            login_captcha.clear_failures(key)
            assert login_captcha.requires_captcha(key) is False


def test_wrong_answer_rejected():
    with patch.object(login_captcha, "_redis", return_value=None):
        with patch.object(login_captcha.settings, "login_captcha_fixed_code", "ABCDE"):
            with patch.object(login_captcha.settings, "is_production", False):
                ch = login_captcha.create_challenge()
        assert login_captcha.verify_and_consume(ch["id"], "ZZZZZ") is False
