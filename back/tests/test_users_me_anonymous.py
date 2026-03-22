"""GET /users/me returns 200 + null for anonymous (no 401)."""
import os
import sys
import unittest

from fastapi.testclient import TestClient
from sqlmodel import Session, SQLModel, create_engine
from sqlalchemy.pool import StaticPool

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

from back.app.main import app, get_session
from back.app import models


class TestUsersMeAnonymous(unittest.TestCase):
    def setUp(self):
        self.engine = create_engine(
            "sqlite://",
            connect_args={"check_same_thread": False},
            poolclass=StaticPool,
        )
        SQLModel.metadata.create_all(self.engine)

        def get_session_override():
            with Session(self.engine) as session:
                yield session

        app.dependency_overrides[get_session] = get_session_override
        self.client = TestClient(app)
        self.session = Session(self.engine)

    def tearDown(self):
        app.dependency_overrides.clear()
        self.session.close()

    def test_users_me_without_cookie_returns_200_null(self):
        r = self.client.get("/users/me")
        self.assertEqual(r.status_code, 200, r.text)
        self.assertIsNone(r.json())

