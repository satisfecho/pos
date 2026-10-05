"""Reject CORS_ORIGINS=* (and empty) when PRODUCTION=true (#421).

Cases run in a subprocess so PRODUCTION / CORS_ORIGINS are set before Settings loads.
"""
from __future__ import annotations

import os
import subprocess
import sys
from pathlib import Path

import pytest

_BACK_ROOT = Path(__file__).resolve().parent.parent

_OK_SECRET = "unit-test-secret-key-not-a-placeholder-421"
_OK_REFRESH = "unit-test-refresh-secret-not-a-placeholder-421"
_OK_CORS = "https://satisfecho.de,http://localhost:4202"


def _run_snippet(snippet: str) -> subprocess.CompletedProcess[str]:
    code = f"""
import sys
sys.path.insert(0, {_BACK_ROOT.as_posix()!r})
{snippet}
"""
    return subprocess.run(
        [sys.executable, "-c", code],
        cwd=str(_BACK_ROOT),
        capture_output=True,
        text=True,
        timeout=60,
        env=os.environ.copy(),
    )


def test_reject_wildcard_cors_in_production() -> None:
    proc = _run_snippet(
        f"""
import os
os.environ["PRODUCTION"] = "true"
os.environ["SECRET_KEY"] = {_OK_SECRET!r}
os.environ["REFRESH_SECRET_KEY"] = {_OK_REFRESH!r}
os.environ["CORS_ORIGINS"] = "*"
try:
    import app.settings  # noqa: F401
except Exception as e:
    msg = str(e)
    if "CORS_ORIGINS" in msg and "*" in msg:
        print("ok-reject")
        raise SystemExit(0)
    print("unexpected", type(e).__name__, msg)
    raise SystemExit(2)
print("fail-booted")
raise SystemExit(1)
"""
    )
    if proc.returncode != 0 or "ok-reject" not in proc.stdout:
        pytest.fail(f"stdout={proc.stdout!r}\nstderr={proc.stderr!r}")


def test_reject_wildcard_mixed_with_origin_in_production() -> None:
    proc = _run_snippet(
        f"""
import os
os.environ["PRODUCTION"] = "true"
os.environ["SECRET_KEY"] = {_OK_SECRET!r}
os.environ["REFRESH_SECRET_KEY"] = {_OK_REFRESH!r}
os.environ["CORS_ORIGINS"] = "https://satisfecho.de,*"
try:
    import app.settings  # noqa: F401
except Exception as e:
    msg = str(e)
    if "CORS_ORIGINS" in msg and "*" in msg:
        print("ok-reject")
        raise SystemExit(0)
    print("unexpected", type(e).__name__, msg)
    raise SystemExit(2)
print("fail-booted")
raise SystemExit(1)
"""
    )
    if proc.returncode != 0 or "ok-reject" not in proc.stdout:
        pytest.fail(f"stdout={proc.stdout!r}\nstderr={proc.stderr!r}")


def test_reject_empty_cors_in_production() -> None:
    proc = _run_snippet(
        f"""
import os
os.environ["PRODUCTION"] = "true"
os.environ["SECRET_KEY"] = {_OK_SECRET!r}
os.environ["REFRESH_SECRET_KEY"] = {_OK_REFRESH!r}
os.environ["CORS_ORIGINS"] = "  ,  "
try:
    import app.settings  # noqa: F401
except Exception as e:
    msg = str(e)
    if "CORS_ORIGINS" in msg:
        print("ok-reject")
        raise SystemExit(0)
    print("unexpected", type(e).__name__, msg)
    raise SystemExit(2)
print("fail-booted")
raise SystemExit(1)
"""
    )
    if proc.returncode != 0 or "ok-reject" not in proc.stdout:
        pytest.fail(f"stdout={proc.stdout!r}\nstderr={proc.stderr!r}")


def test_allow_wildcard_cors_in_dev() -> None:
    proc = _run_snippet(
        f"""
import os
os.environ["PRODUCTION"] = "false"
os.environ["CORS_ORIGINS"] = "*"
from app.settings import settings
assert settings.is_production is False
assert settings.cors_origins.strip() == "*"
print("ok")
"""
    )
    if proc.returncode != 0 or "ok" not in proc.stdout:
        pytest.fail(f"stdout={proc.stdout!r}\nstderr={proc.stderr!r}")


def test_allow_explicit_cors_in_production() -> None:
    proc = _run_snippet(
        f"""
import os
os.environ["PRODUCTION"] = "true"
os.environ["SECRET_KEY"] = {_OK_SECRET!r}
os.environ["REFRESH_SECRET_KEY"] = {_OK_REFRESH!r}
os.environ["CORS_ORIGINS"] = {_OK_CORS!r}
from app.settings import settings
assert settings.is_production is True
assert "*" not in settings.cors_origins
assert "https://satisfecho.de" in settings.cors_origins
print("ok")
"""
    )
    if proc.returncode != 0 or "ok" not in proc.stdout:
        pytest.fail(f"stdout={proc.stdout!r}\nstderr={proc.stderr!r}")
