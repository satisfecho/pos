"""
PostgreSQL-backed FastAPI TestClient tests with per-test rollback.

Full `SQLModel.metadata.create_all` on SQLite fails (JSONB, etc.). These tests use the
same Postgres URL as the app, bind a Session to a connection that is wrapped in an
outer transaction, and roll back after each test so data never persists.
"""
from __future__ import annotations

import os
import sys

# Must run before `app` import (also covers `python path/to/test.py` without pytest).
os.environ["RATE_LIMIT_ENABLED"] = "false"
import unittest
from pathlib import Path

from fastapi.testclient import TestClient
from sqlalchemy.engine import Connection
from sqlmodel import Session

_ROOT = Path(__file__).resolve().parent.parent
if str(_ROOT) not in sys.path:
    sys.path.insert(0, str(_ROOT))

from app.db import engine  # noqa: E402
from app.main import app, get_session  # noqa: E402


class PgClientTestCase(unittest.TestCase):
    """Binds TestClient to a Session on a rolled-back connection transaction."""

    connection: Connection
    _outer_trans: object
    session: Session
    client: TestClient

    def setUp(self) -> None:
        self.connection = engine.connect()
        self._outer_trans = self.connection.begin()
        # join_transaction_mode default uses savepoints when the connection is in a transaction,
        # so route-level session.commit() does not commit the outer transaction.
        self.session = Session(bind=self.connection, join_transaction_mode="create_savepoint")

        def _session_override():
            yield self.session

        app.dependency_overrides[get_session] = _session_override
        self.client = TestClient(app)

    def tearDown(self) -> None:
        app.dependency_overrides.clear()
        self.session.close()
        self._outer_trans.rollback()
        self.connection.close()
