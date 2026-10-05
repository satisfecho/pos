"""Reject CHANGE_THIS… SECRET_KEY / REFRESH_SECRET_KEY when PRODUCTION=true (#423).

All cases run in a subprocess so PRODUCTION / SECRET_KEY are set before Settings loads,
and so Docker's /app/__init__.py cannot shadow package app when pytest puts / on sys.path.
"""
from __future__ import annotations

import os
import subprocess
import sys
from pathlib import Path

import pytest

_BACK_ROOT = Path(__file__).resolve().parent.parent

_PLACEHOLDER_SECRET = "CHANGE_THIS_TO_A_RANDOM_SECRET_KEY_IN_PRODUCTION"
_PLACEHOLDER_REFRESH = "CHANGE_THIS_TO_ANOTHER_RANDOM_SECRET_IN_PRODUCTION"
_OK_SECRET = "unit-test-secret-key-not-a-placeholder-423"
_OK_REFRESH = "unit-test-refresh-secret-not-a-placeholder-423"


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


def test_is_placeholder_secret_helper() -> None:
    proc = _run_snippet(
        f"""
from app.settings import _is_placeholder_secret
assert _is_placeholder_secret("CHANGE_THIS_IN_PRODUCTION")
assert _is_placeholder_secret("change_this_to_a_random_secret_key_in_production")
assert _is_placeholder_secret("  CHANGE_THIS_REFRESH_SECRET_IN_PRODUCTION  ")
assert not _is_placeholder_secret({_OK_SECRET!r})
assert not _is_placeholder_secret("")
print("ok")
"""
    )
    if proc.returncode != 0 or "ok" not in proc.stdout:
        pytest.fail(f"stdout={proc.stdout!r}\nstderr={proc.stderr!r}")


def test_reject_placeholder_secret_key_in_production() -> None:
    # Module-level settings = Settings() raises on import when PRODUCTION + placeholder.
    proc = _run_snippet(
        f"""
import os
os.environ["PRODUCTION"] = "true"
os.environ["SECRET_KEY"] = {_PLACEHOLDER_SECRET!r}
os.environ["REFRESH_SECRET_KEY"] = {_OK_REFRESH!r}
try:
    import app.settings  # noqa: F401 — triggers Settings() at import
except Exception as e:
    msg = str(e)
    if "SECRET_KEY" in msg and "placeholder" in msg.lower():
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


def test_reject_placeholder_refresh_secret_in_production() -> None:
    proc = _run_snippet(
        f"""
import os
os.environ["PRODUCTION"] = "true"
os.environ["SECRET_KEY"] = {_OK_SECRET!r}
os.environ["REFRESH_SECRET_KEY"] = {_PLACEHOLDER_REFRESH!r}
try:
    import app.settings  # noqa: F401
except Exception as e:
    msg = str(e)
    if "REFRESH_SECRET_KEY" in msg and "placeholder" in msg.lower():
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


def test_allow_placeholder_secrets_in_dev() -> None:
    proc = _run_snippet(
        f"""
import os
os.environ["PRODUCTION"] = "false"
os.environ["SECRET_KEY"] = {_PLACEHOLDER_SECRET!r}
os.environ["REFRESH_SECRET_KEY"] = {_PLACEHOLDER_REFRESH!r}
from app.settings import settings
assert settings.is_production is False
assert settings.secret_key.startswith("CHANGE_THIS")
print("ok")
"""
    )
    if proc.returncode != 0 or "ok" not in proc.stdout:
        pytest.fail(f"stdout={proc.stdout!r}\nstderr={proc.stderr!r}")


def test_allow_non_placeholder_secrets_in_production() -> None:
    proc = _run_snippet(
        f"""
import os
os.environ["PRODUCTION"] = "true"
os.environ["SECRET_KEY"] = {_OK_SECRET!r}
os.environ["REFRESH_SECRET_KEY"] = {_OK_REFRESH!r}
from app.settings import settings
assert settings.is_production is True
assert settings.secret_key == {_OK_SECRET!r}
print("ok")
"""
    )
    if proc.returncode != 0 or "ok" not in proc.stdout:
        pytest.fail(f"stdout={proc.stdout!r}\nstderr={proc.stderr!r}")
