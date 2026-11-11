"""Split bill / partial payments (#318)."""

from __future__ import annotations

from datetime import timedelta

from pg_client_mixin import PgClientTestCase

from app import models, security


def _bearer_headers(user: models.User) -> dict[str, str]:
    data = {
        "sub": user.email,
        "tenant_id": user.tenant_id,
        "provider_id": getattr(user, "provider_id", None),
        "token_version": user.token_version,
    }
    token = security.create_access_token(data, expires_delta=timedelta(minutes=30))
    return {"Authorization": f"Bearer {token}"}


class TestSplitBill(PgClientTestCase):
    def setUp(self) -> None:
        super().setUp()
        self.tenant = models.Tenant(name="Split Cafe")
        self.other = models.Tenant(name="Other Cafe")
        self.session.add(self.tenant)
        self.session.add(self.other)
        self.session.commit()
        self.session.refresh(self.tenant)
        self.session.refresh(self.other)

        pwd = security.get_password_hash("x")
        self.admin = models.User(
            email="split-admin@amvara.de",
            hashed_password=pwd,
            full_name="Admin",
            role=models.UserRole.admin,
            tenant_id=self.tenant.id,
        )
        self.other_admin = models.User(
            email="split-other@amvara.de",
            hashed_password=pwd,
            full_name="Other",
            role=models.UserRole.admin,
            tenant_id=self.other.id,
        )
        self.session.add(self.admin)
        self.session.add(self.other_admin)
        self.session.commit()
        self.session.refresh(self.admin)
        self.session.refresh(self.other_admin)

        floor = models.Floor(tenant_id=self.tenant.id, name="Main", sort_order=0)
        self.session.add(floor)
        self.session.commit()
        self.session.refresh(floor)
        self.table = models.Table(
            tenant_id=self.tenant.id,
            floor_id=floor.id,
            name="T1",
            token="split-t1-token",
            x_position=0,
            y_position=0,
            rotation=0,
            shape="rect",
            width=1,
            height=1,
            seat_count=4,
            is_active=True,
        )
        self.session.add(self.table)
        self.session.commit()
        self.session.refresh(self.table)

        self.product = models.Product(
            tenant_id=self.tenant.id,
            name="Burger",
            price_cents=1000,
            category="Mains",
        )
        self.session.add(self.product)
        self.session.commit()
        self.session.refresh(self.product)

    def _make_order(self, *, qty: int = 2) -> models.Order:
        order = models.Order(
            tenant_id=self.tenant.id,
            table_id=self.table.id,
            status=models.OrderStatus.completed,
            session_id="split-session",
        )
        self.session.add(order)
        self.session.commit()
        self.session.refresh(order)
        item = models.OrderItem(
            order_id=order.id,
            product_id=self.product.id,
            product_name=self.product.name,
            quantity=qty,
            price_cents=self.product.price_cents,
            status=models.OrderItemStatus.delivered,
        )
        self.session.add(item)
        self.session.commit()
        self.session.refresh(order)
        return order

    def test_two_partial_payments_settle_order(self) -> None:
        order = self._make_order(qty=2)  # 2000 cents
        h = _bearer_headers(self.admin)

        r1 = self.client.post(
            f"/orders/{order.id}/payments",
            headers=h,
            json={"amount_cents": 800, "payment_method": "cash", "payer_label": "Guest A"},
        )
        self.assertEqual(r1.status_code, 200, r1.text)
        body1 = r1.json()
        self.assertEqual(body1["status"], "partial")
        self.assertEqual(body1["amount_paid_cents"], 800)
        self.assertEqual(body1["amount_remaining_cents"], 1200)
        self.assertIsNone(body1.get("paid_at"))

        r2 = self.client.post(
            f"/orders/{order.id}/payments",
            headers=h,
            json={"amount_cents": 1200, "payment_method": "terminal", "payer_label": "Guest B"},
        )
        self.assertEqual(r2.status_code, 200, r2.text)
        body2 = r2.json()
        self.assertEqual(body2["status"], "paid")
        self.assertEqual(body2["amount_remaining_cents"], 0)
        self.assertEqual(body2["payment_method"], "split")
        self.assertIsNotNone(body2.get("paid_at"))
        self.assertEqual(len(body2["payments"]), 2)

        self.session.refresh(order)
        # All items already delivered → completed (leaves Active Orders #345)
        self.assertEqual(order.status, models.OrderStatus.completed)
        self.assertIsNotNone(order.paid_at)
        self.assertEqual(order.payment_method, "split")

    def test_reject_overpay_and_tenant_isolation(self) -> None:
        order = self._make_order(qty=1)  # 1000
        h = _bearer_headers(self.admin)
        bad = self.client.post(
            f"/orders/{order.id}/payments",
            headers=h,
            json={"amount_cents": 1500, "payment_method": "cash"},
        )
        self.assertEqual(bad.status_code, 400, bad.text)

        other_h = _bearer_headers(self.other_admin)
        iso = self.client.post(
            f"/orders/{order.id}/payments",
            headers=other_h,
            json={"amount_cents": 100, "payment_method": "cash"},
        )
        self.assertEqual(iso.status_code, 404, iso.text)

    def test_mark_paid_creates_payment_leg_and_unmark_voids(self) -> None:
        order = self._make_order(qty=1)
        h = _bearer_headers(self.admin)
        r = self.client.put(
            f"/orders/{order.id}/mark-paid",
            headers=h,
            json={"payment_method": "cash"},
        )
        self.assertEqual(r.status_code, 200, r.text)
        body = r.json()
        self.assertEqual(body["status"], "paid")
        self.assertEqual(body["amount_paid_cents"], 1000)
        self.assertEqual(len(body["payments"]), 1)

        g = self.client.get(f"/orders/{order.id}/payments", headers=h)
        self.assertEqual(g.status_code, 200, g.text)
        self.assertEqual(g.json()["amount_paid_cents"], 1000)

        u = self.client.put(f"/orders/{order.id}/unmark-paid", headers=h)
        self.assertEqual(u.status_code, 200, u.text)
        g2 = self.client.get(f"/orders/{order.id}/payments", headers=h)
        self.assertEqual(g2.status_code, 200, g2.text)
        self.assertEqual(g2.json()["amount_paid_cents"], 0)
        self.assertEqual(g2.json()["payments"], [])

    def test_void_partial_before_settlement(self) -> None:
        order = self._make_order(qty=2)
        h = _bearer_headers(self.admin)
        r1 = self.client.post(
            f"/orders/{order.id}/payments",
            headers=h,
            json={"amount_cents": 500, "payment_method": "cash"},
        )
        self.assertEqual(r1.status_code, 200, r1.text)
        pid = r1.json()["payment"]["id"]
        d = self.client.delete(f"/orders/{order.id}/payments/{pid}", headers=h)
        self.assertEqual(d.status_code, 200, d.text)
        self.assertEqual(d.json()["amount_paid_cents"], 0)

    def test_split_by_line_two_items(self) -> None:
        """Pay each line separately via order_item_ids (#331)."""
        order = models.Order(
            tenant_id=self.tenant.id,
            table_id=self.table.id,
            status=models.OrderStatus.completed,
            session_id="split-lines",
        )
        self.session.add(order)
        self.session.commit()
        self.session.refresh(order)
        p2 = models.Product(
            tenant_id=self.tenant.id,
            name="Fries",
            price_cents=500,
            category="Sides",
        )
        self.session.add(p2)
        self.session.commit()
        self.session.refresh(p2)
        i1 = models.OrderItem(
            order_id=order.id,
            product_id=self.product.id,
            product_name=self.product.name,
            quantity=1,
            price_cents=1000,
            status=models.OrderItemStatus.delivered,
        )
        i2 = models.OrderItem(
            order_id=order.id,
            product_id=p2.id,
            product_name=p2.name,
            quantity=1,
            price_cents=500,
            status=models.OrderItemStatus.delivered,
        )
        self.session.add(i1)
        self.session.add(i2)
        self.session.commit()
        self.session.refresh(i1)
        self.session.refresh(i2)
        h = _bearer_headers(self.admin)

        r1 = self.client.post(
            f"/orders/{order.id}/payments",
            headers=h,
            json={
                "order_item_ids": [i1.id],
                "payment_method": "cash",
                "payer_label": "Alice",
            },
        )
        self.assertEqual(r1.status_code, 200, r1.text)
        body1 = r1.json()
        self.assertEqual(body1["status"], "partial")
        self.assertEqual(body1["amount_paid_cents"], 1000)
        self.assertEqual(body1["amount_remaining_cents"], 500)
        self.assertEqual(body1["payment"]["order_item_ids"], [i1.id])
        self.assertEqual(body1["unallocated_order_item_ids"], [i2.id])

        # Same line again → reject
        bad = self.client.post(
            f"/orders/{order.id}/payments",
            headers=h,
            json={"order_item_ids": [i1.id], "payment_method": "cash"},
        )
        self.assertEqual(bad.status_code, 400, bad.text)

        r2 = self.client.post(
            f"/orders/{order.id}/payments",
            headers=h,
            json={"order_item_ids": [i2.id], "payment_method": "terminal", "payer_label": "Bob"},
        )
        self.assertEqual(r2.status_code, 200, r2.text)
        body2 = r2.json()
        self.assertEqual(body2["status"], "paid")
        self.assertEqual(body2["amount_remaining_cents"], 0)
        self.assertEqual(body2["payment_method"], "split")
        self.assertEqual(sorted(body2["unallocated_order_item_ids"]), [])

    def test_split_by_guest_session(self) -> None:
        """Pay unallocated lines by added_by_session (#443 D)."""
        order = models.Order(
            tenant_id=self.tenant.id,
            table_id=self.table.id,
            status=models.OrderStatus.completed,
            session_id="shared-table",
        )
        self.session.add(order)
        self.session.commit()
        self.session.refresh(order)
        p2 = models.Product(
            tenant_id=self.tenant.id,
            name="Salad",
            price_cents=700,
            category="Sides",
        )
        self.session.add(p2)
        self.session.commit()
        self.session.refresh(p2)
        i1 = models.OrderItem(
            order_id=order.id,
            product_id=self.product.id,
            product_name=self.product.name,
            quantity=1,
            price_cents=1000,
            status=models.OrderItemStatus.delivered,
            added_by_session="guest-aaa",
        )
        i2 = models.OrderItem(
            order_id=order.id,
            product_id=p2.id,
            product_name=p2.name,
            quantity=1,
            price_cents=700,
            status=models.OrderItemStatus.delivered,
            added_by_session="guest-bbb",
        )
        self.session.add(i1)
        self.session.add(i2)
        self.session.commit()
        self.session.refresh(i1)
        self.session.refresh(i2)
        h = _bearer_headers(self.admin)

        g = self.client.get(f"/orders/{order.id}/payments", headers=h)
        self.assertEqual(g.status_code, 200, g.text)
        sessions = g.json().get("guest_sessions") or []
        self.assertEqual(len(sessions), 2)

        r1 = self.client.post(
            f"/orders/{order.id}/payments",
            headers=h,
            json={"guest_session_id": "guest-aaa", "payment_method": "cash"},
        )
        self.assertEqual(r1.status_code, 200, r1.text)
        body1 = r1.json()
        self.assertEqual(body1["status"], "partial")
        self.assertEqual(body1["amount_paid_cents"], 1000)
        self.assertEqual(body1["payment"]["order_item_ids"], [i1.id])

        r2 = self.client.post(
            f"/orders/{order.id}/payments",
            headers=h,
            json={"guest_session_id": "guest-bbb", "payment_method": "terminal"},
        )
        self.assertEqual(r2.status_code, 200, r2.text)
        self.assertEqual(r2.json()["status"], "paid")
        self.assertEqual(r2.json()["amount_remaining_cents"], 0)
