"""API docs (/docs, /redoc, /openapi.json) are off in production unless ENABLE_API_DOCS (#422)."""
from __future__ import annotations

import subprocess
import sys
from pathlib import Path

import pytest

_BACK_ROOT = Path(__file__).resolve().parent.parent

# Fresh interpreter: avoids Docker workdir `/app/__init__.py` shadowing package `app`
# when pytest puts `/` on sys.path, and ensures PRODUCTION is set before app import.
_SUBPROCESS_PROD_DOCS_OFF = """
import os
import sys

os.environ["PRODUCTION"] = "true"
os.environ.pop("ENABLE_API_DOCS", None)
# Non-placeholder secrets required when PRODUCTION=true (#423).
os.environ["SECRET_KEY"] = "unit-test-secret-key-not-a-placeholder-422"
os.environ["REFRESH_SECRET_KEY"] = "unit-test-refresh-secret-not-a-placeholder-422"
# Explicit CORS allowlist required when PRODUCTION=true (#421).
os.environ["CORS_ORIGINS"] = "https://satisfecho.de"

sys.path.insert(0, {back_root!r})

from app.settings import Settings

assert Settings.model_construct(is_production=False, enable_api_docs=False).api_docs_enabled is True
assert Settings.model_construct(is_production=True, enable_api_docs=False).api_docs_enabled is False
assert Settings.model_construct(is_production=True, enable_api_docs=True).api_docs_enabled is True

from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)
for path in ("/docs", "/redoc", "/openapi.json"):
    r = client.get(path)
    if r.status_code != 404:
        print("fail", path, r.status_code)
        raise SystemExit(1)
r = client.get("/health")
if r.status_code != 200:
    print("fail /health", r.status_code)
    raise SystemExit(1)
print("ok")
""".format(
    back_root=str(_BACK_ROOT),
)


def test_production_hides_docs_and_openapi_subprocess() -> None:
    proc = subprocess.run(
        [sys.executable, "-c", _SUBPROCESS_PROD_DOCS_OFF],
        cwd=str(_BACK_ROOT),
        capture_output=True,
        text=True,
        timeout=120,
    )
    if proc.returncode != 0:
        pytest.fail(
            f"subprocess failed ({proc.returncode}):\n"
            f"stdout={proc.stdout!r}\nstderr={proc.stderr!r}"
        )
    assert "ok" in proc.stdout
