"""Guest feedback public POST and tenant list."""
import unittest
from datetime import date, time

from pg_client_mixin import PgClientTestCase
from sqlmodel import select

from app import models


class TestGuestFeedback(PgClientTestCase):
    def setUp(self):
        super().setUp()
        tenant = models.Tenant(
            name="T1",
            address="123 Main St",
            public_google_review_url="https://g.page/r/test-place/review",
            public_google_maps_url="https://maps.google.com/?q=Test",
        )
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

    def test_public_tenant_includes_google_review_url(self):
        r = self.client.get(f"/public/tenants/{self.tenant_id}")
        self.assertEqual(r.status_code, 200, r.text)
        data = r.json()
        self.assertEqual(data.get("public_google_review_url"), "https://g.page/r/test-place/review")
        self.assertEqual(data.get("public_google_maps_url"), "https://maps.google.com/?q=Test")
        self.assertEqual(data.get("address"), "123 Main St")

    def test_submit_guest_feedback_minimal(self):
        r = self.client.post(
            f"/public/tenants/{self.tenant_id}/guest-feedback",
            json={"rating": 5, "comment": "Great"},
        )
        self.assertEqual(r.status_code, 200, r.text)
        self.assertTrue(r.json().get("ok"))
        row = self.session.exec(
            select(models.GuestFeedback)
            .where(models.GuestFeedback.tenant_id == self.tenant_id)
            .order_by(models.GuestFeedback.id.desc())
        ).first()
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
        row = self.session.exec(
            select(models.GuestFeedback)
            .where(models.GuestFeedback.tenant_id == self.tenant_id)
            .order_by(models.GuestFeedback.id.desc())
        ).first()
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
