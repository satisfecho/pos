"""TTL cleanup for abandoned unpaid public Satisfecho Delivery orders."""
from __future__ import annotations

from datetime import datetime, timedelta, timezone

from sqlmodel import select

from pg_client_mixin import PgClientTestCase

from app import models
from app.cleanup_unpaid_public_delivery import cleanup_unpaid_public_delivery_orders
from app.delivery_order_service import PUBLIC_SATISFECHO_DELIVERY_SESSION_ID


class TestCleanupUnpaidPublicDelivery(PgClientTestCase):
    def setUp(self) -> None:
        super().setUp()
        self.tenant = models.Tenant(name="Cleanup SD Tenant", address="St 1")
        self.session.add(self.tenant)
        self.session.commit()
        self.session.refresh(self.tenant)

        self.product = models.Product(
            tenant_id=self.tenant.id,
            name="Cleanup Burger",
            price_cents=900,
            category="Main",
        )
        self.session.add(self.product)
        self.session.commit()
        self.session.refresh(self.product)

        self.now = datetime(2026, 7, 23, 12, 0, 0, tzinfo=timezone.utc)

    def _insert_order(
        self,
        *,
        public: bool,
        created_at: datetime,
        status: models.OrderStatus = models.OrderStatus.pending,
        payment_method: str | None = None,
        paid_at: datetime | None = None,
    ) -> models.Order:
        order = models.Order(
            table_id=None,
            tenant_id=self.tenant.id,
            status=status,
            session_id=PUBLIC_SATISFECHO_DELIVERY_SESSION_ID if public else None,
            customer_name="Guest",
            customer_phone="+34600111222",
            order_channel=models.OrderChannel.satisfecho_delivery,
            delivery_address="Calle Cleanup 1",
            payment_method=payment_method,
            paid_at=paid_at,
            created_at=created_at,
        )
        self.session.add(order)
        self.session.flush()
        self.session.add(
            models.OrderItem(
                order_id=order.id,
                product_id=self.product.id,
                product_name=self.product.name,
                quantity=1,
                price_cents=900,
                status=models.OrderItemStatus.pending,
            )
        )
        self.session.flush()
        self.session.refresh(order)
        return order

    def test_unpaid_past_ttl_is_cancelled(self) -> None:
        order = self._insert_order(
            public=True,
            created_at=self.now - timedelta(hours=3),
        )
        self.assertEqual(order.session_id, PUBLIC_SATISFECHO_DELIVERY_SESSION_ID)

        result = cleanup_unpaid_public_delivery_orders(
            self.session, ttl_hours=2, now=self.now
        )
        self.assertEqual(result["matched"], 1)
        self.assertEqual(result["cancelled"], 1)

        self.session.refresh(order)
        self.assertEqual(order.status, models.OrderStatus.cancelled)
        self.assertEqual(order.cancelled_by, "ttl_cleanup")
        self.assertIsNotNone(order.cancelled_at)
        self.assertIsNotNone(order.deleted_at)
        self.assertIsNone(order.session_id)

        items = list(
            self.session.exec(
                select(models.OrderItem).where(models.OrderItem.order_id == order.id)
            ).all()
        )
        self.assertTrue(items)
        self.assertTrue(all(i.status == models.OrderItemStatus.cancelled for i in items))

    def test_unpaid_within_ttl_kept(self) -> None:
        order = self._insert_order(
            public=True,
            created_at=self.now - timedelta(minutes=30),
        )
        result = cleanup_unpaid_public_delivery_orders(
            self.session, ttl_hours=2, now=self.now
        )
        self.assertEqual(result["matched"], 0)
        self.assertEqual(result["cancelled"], 0)
        self.session.refresh(order)
        self.assertEqual(order.status, models.OrderStatus.pending)
        self.assertIsNone(order.deleted_at)

    def test_paid_public_order_kept(self) -> None:
        order = self._insert_order(
            public=True,
            created_at=self.now - timedelta(hours=5),
            status=models.OrderStatus.paid,
            payment_method="stripe",
            paid_at=self.now - timedelta(hours=4),
        )

        result = cleanup_unpaid_public_delivery_orders(
            self.session, ttl_hours=2, now=self.now
        )
        self.assertEqual(result["matched"], 0)
        self.session.refresh(order)
        self.assertEqual(order.status, models.OrderStatus.paid)
        self.assertIsNone(order.deleted_at)

    def test_staff_created_never_auto_cleaned(self) -> None:
        order = self._insert_order(
            public=False,
            created_at=self.now - timedelta(hours=10),
        )
        self.assertIsNone(order.session_id)
        self.assertIsNone(order.payment_method)

        result = cleanup_unpaid_public_delivery_orders(
            self.session, ttl_hours=2, now=self.now
        )
        self.assertEqual(result["matched"], 0)
        self.session.refresh(order)
        self.assertEqual(order.status, models.OrderStatus.pending)
        self.assertIsNone(order.deleted_at)

    def test_dry_run_does_not_mutate(self) -> None:
        order = self._insert_order(
            public=True,
            created_at=self.now - timedelta(hours=3),
        )
        result = cleanup_unpaid_public_delivery_orders(
            self.session, ttl_hours=2, dry_run=True, now=self.now
        )
        self.assertEqual(result["matched"], 1)
        self.assertEqual(result["cancelled"], 0)
        self.session.refresh(order)
        self.assertEqual(order.status, models.OrderStatus.pending)
