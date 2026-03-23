"""POS tip presets and mark-paid tip amount (GitHub #58)."""
import unittest

from fastapi import HTTPException
from pg_client_mixin import PgClientTestCase

from app import models
from app.main import _allowed_tip_presets, _resolve_tip_on_mark_paid
from app.security import get_password_hash


class TestOrderTip(PgClientTestCase):
    def setUp(self):
        super().setUp()
        self.tenant = models.Tenant(
            name="Tip Test",
            tip_preset_percents=[10, 20],
            tip_tax_rate_percent=10,
        )
        self.session.add(self.tenant)
        self.session.commit()
        self.session.refresh(self.tenant)

        self.user = models.User(
            email="tip-owner@test.local",
            hashed_password=get_password_hash("secret"),
            role=models.UserRole.owner,
            tenant_id=self.tenant.id,
        )
        self.session.add(self.user)
        self.session.commit()

        floor = models.Floor(name="Main", tenant_id=self.tenant.id)
        self.session.add(floor)
        self.session.commit()
        self.session.refresh(floor)

        self.table = models.Table(
            name="T1",
            tenant_id=self.tenant.id,
            floor_id=floor.id,
            is_active=True,
        )
        self.session.add(self.table)
        self.session.commit()
        self.session.refresh(self.table)

        self.product = models.Product(
            name="Coffee",
            price_cents=1000,
            tenant_id=self.tenant.id,
        )
        self.session.add(self.product)
        self.session.commit()
        self.session.refresh(self.product)

        self.order = models.Order(
            table_id=self.table.id,
            tenant_id=self.tenant.id,
            status=models.OrderStatus.pending,
        )
        self.session.add(self.order)
        self.session.commit()
        self.session.refresh(self.order)

        item = models.OrderItem(
            order_id=self.order.id,
            product_id=self.product.id,
            product_name=self.product.name,
            quantity=1,
            price_cents=1000,
            status=models.OrderItemStatus.pending,
        )
        self.session.add(item)
        self.session.commit()

    def test_allowed_presets_from_tenant(self):
        self.assertEqual(_allowed_tip_presets(self.tenant), [10, 20])

    def test_resolve_tip_ten_percent(self):
        pct, amt = _resolve_tip_on_mark_paid(
            self.session, self.tenant, self.order.id, 10
        )
        self.assertEqual(pct, 10)
        self.assertEqual(amt, 100)

    def test_resolve_no_tip(self):
        pct, amt = _resolve_tip_on_mark_paid(
            self.session, self.tenant, self.order.id, None
        )
        self.assertIsNone(pct)
        self.assertEqual(amt, 0)

    def test_resolve_explicit_zero_percent(self):
        pct, amt = _resolve_tip_on_mark_paid(
            self.session, self.tenant, self.order.id, 0
        )
        self.assertIsNone(pct)
        self.assertEqual(amt, 0)

    def test_tip_amount_rounds_half_up(self):
        from sqlmodel import select

        item = self.session.exec(
            select(models.OrderItem).where(models.OrderItem.order_id == self.order.id)
        ).first()
        item.price_cents = 335
        item.quantity = 1
        self.session.add(item)
        self.session.commit()
        # (335 * 10 + 50) // 100 = 34
        pct, amt = _resolve_tip_on_mark_paid(
            self.session, self.tenant, self.order.id, 10
        )
        self.assertEqual(pct, 10)
        self.assertEqual(amt, 34)

    def test_reject_tip_when_order_subtotal_zero(self):
        empty = models.Order(
            table_id=self.table.id,
            tenant_id=self.tenant.id,
            status=models.OrderStatus.pending,
        )
        self.session.add(empty)
        self.session.commit()
        self.session.refresh(empty)
        with self.assertRaises(HTTPException) as ctx:
            _resolve_tip_on_mark_paid(
                self.session, self.tenant, empty.id, 10
            )
        self.assertEqual(ctx.exception.status_code, 400)

    def test_reject_percent_not_in_presets(self):
        with self.assertRaises(HTTPException) as ctx:
            _resolve_tip_on_mark_paid(
                self.session, self.tenant, self.order.id, 15
            )
        self.assertEqual(ctx.exception.status_code, 400)

    def test_legacy_null_presets_default(self):
        t = models.Tenant(name="Legacy")
        self.session.add(t)
        self.session.commit()
        self.session.refresh(t)
        self.assertEqual(_allowed_tip_presets(t), [5, 10, 15, 20])

    def test_empty_presets_disable_tips(self):
        t = models.Tenant(name="No tips", tip_preset_percents=[])
        self.session.add(t)
        self.session.commit()
        self.session.refresh(t)
        self.assertEqual(_allowed_tip_presets(t), [])
        with self.assertRaises(HTTPException) as ctx:
            _resolve_tip_on_mark_paid(self.session, t, self.order.id, 10)
        self.assertEqual(ctx.exception.status_code, 400)


if __name__ == "__main__":
    unittest.main()
