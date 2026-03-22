"""Guest feedback public POST and tenant list."""
import os
import sys
import unittest
from datetime import date, time

from fastapi.testclient import TestClient
from sqlmodel import Session, SQLModel, create_engine, select
from sqlalchemy.pool import StaticPool

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

from back.app.main import app, get_session
from back.app import models


class TestGuestFeedback(unittest.TestCase):
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
        tenant = models.Tenant(name="T1", public_google_review_url="https://g.page/r/test-place/review")
        self.session.add(tenant)
        self.session.commit()
        self.session.refresh(tenant)
        self.tenant_id = tenant.id
        res = models.Reservation(
            tenant_id=self.tenant_id,
            customer_name="A",
            customer_phone="+34123456789",
            reservation_date=date.today(),
            reservation_time=time(20, 0),
            party_size=2,
            status=models.ReservationStatus.finished,
            token="tok-test-1",
        )
        self.session.add(res)
        self.session.commit()
        self.session.refresh(res)
        self.res_id = res.id

    def tearDown(self):
        app.dependency_overrides.clear()
        self.session.close()

    def test_public_tenant_includes_google_review_url(self):
        r = self.client.get(f"/public/tenants/{self.tenant_id}")
        self.assertEqual(r.status_code, 200, r.text)
        self.assertEqual(r.json().get("public_google_review_url"), "https://g.page/r/test-place/review")

    def test_submit_guest_feedback_minimal(self):
        r = self.client.post(
            f"/public/tenants/{self.tenant_id}/guest-feedback",
            json={"rating": 5, "comment": "Great"},
        )
        self.assertEqual(r.status_code, 200, r.text)
        self.assertTrue(r.json().get("ok"))
        row = self.session.exec(select(models.GuestFeedback)).first()
        self.assertIsNotNone(row)
        assert row is not None
        self.assertEqual(row.rating, 5)
        self.assertEqual(row.comment, "Great")

    def test_submit_with_reservation_token(self):
        r = self.client.post(
            f"/public/tenants/{self.tenant_id}/guest-feedback",
            json={"rating": 4, "reservation_token": "tok-test-1"},
        )
        self.assertEqual(r.status_code, 200, r.text)
        row = self.session.exec(select(models.GuestFeedback)).first()
        self.assertIsNotNone(row)
        assert row is not None
        self.assertEqual(row.reservation_id, self.res_id)

    def test_invalid_reservation_token_400(self):
        r = self.client.post(
            f"/public/tenants/{self.tenant_id}/guest-feedback",
            json={"rating": 3, "reservation_token": "nope"},
        )
        self.assertEqual(r.status_code, 400, r.text)


if __name__ == "__main__":
    unittest.main()
