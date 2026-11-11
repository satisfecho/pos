"""
Regression: POST /register/resend-verification must return Starlette Response when SlowAPI is enabled.

Plain dict returns trigger slowapi's wrapper to call _inject_headers(...) with no Response
(500: parameter `response` must be an instance of …). See #442 tester FAIL.
"""
from __future__ import annotations

import subprocess
import sys
from pathlib import Path

import pytest

_BACK_ROOT = Path(__file__).resolve().parent.parent


_SUBPROCESS = r"""
import os
import sys

os.environ["RATE_LIMIT_ENABLED"] = "true"

sys.path.insert(0, r"%s")

from unittest.mock import AsyncMock, patch
from fastapi.testclient import TestClient

from app.main import app


def main() -> int:
    with (
        patch("app.owner_signup.email_svc.send_owner_signup_verification_email", new_callable=AsyncMock) as mock_send,
        patch("app.owner_signup.email_svc.smtp_credentials_configured", return_value=True),
    ):
        mock_send.return_value = True
        client = TestClient(app)
        r = client.post(
            "/register/resend-verification",
            json={"email": "nobody-resend-slowapi@amvara.de"},
        )
    if r.status_code != 200:
        print("resend failed", r.status_code, r.text)
        return 1
    body = r.json()
    if body.get("status") != "ok":
        print("unexpected body", body)
        return 1
    print("ok")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
""" % (
    str(_BACK_ROOT).replace("\\", "\\\\"),
)


def test_owner_signup_resend_with_slowapi_enabled_subprocess() -> None:
    """Fresh interpreter so app loads with RATE_LIMIT_ENABLED=true (limiter.enabled)."""
    r = subprocess.run(
        [sys.executable, "-c", _SUBPROCESS],
        cwd=str(_BACK_ROOT),
        capture_output=True,
        text=True,
        timeout=120,
    )
    assert r.returncode == 0, f"stderr={r.stderr!r} stdout={r.stdout!r}"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
