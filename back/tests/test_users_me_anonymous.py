"""GET /users/me returns 200 + null for anonymous (no 401)."""
import sys
import unittest
from pathlib import Path

from fastapi.testclient import TestClient

_ROOT = Path(__file__).resolve().parent.parent
if str(_ROOT) not in sys.path:
    sys.path.insert(0, str(_ROOT))

from app.main import app


class TestUsersMeAnonymous(unittest.TestCase):
    def test_users_me_without_cookie_returns_200_null(self):
        with TestClient(app) as client:
            r = client.get("/users/me")
        self.assertEqual(r.status_code, 200, r.text)
        self.assertIsNone(r.json())
