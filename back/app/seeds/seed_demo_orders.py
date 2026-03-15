"""
Seed demo orders for tenant 1 on clean deployment so Reports (Informes) show meaningful data.

Creates a mix of orders with statuses: pending, preparing, ready, completed, and paid.
Paid/completed orders are spread over the last ±90 days (more density in the last 30 days)
so the default report date range shows revenue, by product, by table, etc.

Idempotent: runs only when tenant 1 has no orders (clean deployment). Does not delete or
change existing orders.

Usage:
  docker compose exec back python -m app.seeds.seed_demo_orders
  cd back && python -m app.seeds.seed_demo_orders
"""

import random
from datetime import datetime, timedelta, timezone

from sqlmodel import Session, select

from app.db import engine
from app.models import (
    Order,
    OrderItem,
    OrderItemStatus,
    OrderStatus,
    Product,
    Table,
)

DEMO_TENANT_ID = 1
# Focus dates within ±90 days of today; weight more in last 30 days for default report range
DAYS_BACK = 90
# Approximate count: paid orders (for reports) + a few active orders (pending/preparing/ready/completed)
NUM_PAID_ORDERS = 35
NUM_ACTIVE_ORDERS = 5


def _random_date_in_window(days_back: int, bias_last_days: int = 30) -> datetime:
    """Return a random datetime in the last days_back days, with more weight in the last bias_last_days."""
    now = datetime.now(timezone.utc)
    # 60% chance in last bias_last_days, 40% in the rest
    if random.random() < 0.6:
        day_offset = random.randint(0, min(bias_last_days, days_back))
    else:
        day_offset = random.randint(0, days_back)
    d = now - timedelta(days=day_offset)
    # Random time during typical service hours 10:00–22:00
    hour = random.randint(10, 21)
    minute = random.randint(0, 59)
    return d.replace(hour=hour, minute=minute, second=0, microsecond=0)


def _seed_demo_orders(session: Session, tenant_id: int) -> int:
    """Create demo orders and items for tenant. Returns number of orders created."""
    tables = session.exec(select(Table).where(Table.tenant_id == tenant_id)).all()
    products = session.exec(select(Product).where(Product.tenant_id == tenant_id)).all()
    if not tables or not products:
        return 0

    table_ids = [t.id for t in tables]
    # Products with price > 0 so revenue looks realistic (skip Water 0 cents if we want)
    products_for_orders = [p for p in products if p.price_cents >= 0]
    if not products_for_orders:
        return 0

    created = 0
    # Paid orders: appear in Reports (informes)
    for _ in range(NUM_PAID_ORDERS):
        order_date = _random_date_in_window(DAYS_BACK, bias_last_days=30)
        table_id = random.choice(table_ids)
        num_items = random.randint(1, 4)
        chosen = random.choices(products_for_orders, k=num_items)
        order = Order(
            tenant_id=tenant_id,
            table_id=table_id,
            status=OrderStatus.paid,
            created_at=order_date,
            paid_at=order_date + timedelta(minutes=random.randint(15, 90)),
            paid_by_user_id=None,
            payment_method=random.choice(["cash", "terminal", "stripe"]),
        )
        session.add(order)
        session.flush()
        for p in chosen:
            qty = random.randint(1, 3)
            session.add(
                OrderItem(
                    order_id=order.id,
                    product_id=p.id,
                    product_name=p.name,
                    quantity=qty,
                    price_cents=p.price_cents,
                    status=OrderItemStatus.delivered,
                )
            )
        created += 1

    # Active orders: pending, preparing, ready, completed (not paid) so Orders list and kitchen have something
    statuses_active = [
        OrderStatus.pending,
        OrderStatus.preparing,
        OrderStatus.ready,
        OrderStatus.completed,
    ]
    item_status_for_order = {
        OrderStatus.pending: OrderItemStatus.pending,
        OrderStatus.preparing: OrderItemStatus.preparing,
        OrderStatus.ready: OrderItemStatus.ready,
        OrderStatus.completed: OrderItemStatus.delivered,
    }
    for _ in range(NUM_ACTIVE_ORDERS):
        order_date = _random_date_in_window(DAYS_BACK, bias_last_days=7)
        table_id = random.choice(table_ids)
        num_items = random.randint(1, 3)
        chosen = random.choices(products_for_orders, k=num_items)
        status = random.choice(statuses_active)
        order = Order(
            tenant_id=tenant_id,
            table_id=table_id,
            status=status,
            created_at=order_date,
            paid_at=None,
        )
        session.add(order)
        session.flush()
        item_status = item_status_for_order[status]
        for p in chosen:
            qty = random.randint(1, 2)
            session.add(
                OrderItem(
                    order_id=order.id,
                    product_id=p.id,
                    product_name=p.name,
                    quantity=qty,
                    price_cents=p.price_cents,
                    status=item_status,
                )
            )
        created += 1

    return created


def run() -> None:
    with Session(engine) as session:
        # Only run when tenant 1 has no orders (clean deployment)
        existing = session.exec(
            select(Order.id).where(Order.tenant_id == DEMO_TENANT_ID).limit(1)
        ).first()
        if existing is not None:
            print("Tenant 1 already has orders. Skipping demo orders seed.")
            return

        # Verify tenant and dependencies exist
        from app.models import Tenant

        tenant = session.get(Tenant, DEMO_TENANT_ID)
        if not tenant:
            print("Tenant 1 not found. Run bootstrap_demo first.")
            return

        n = _seed_demo_orders(session, DEMO_TENANT_ID)
        if n:
            session.commit()
            print(f"Tenant {DEMO_TENANT_ID}: created {n} demo orders (paid + active) for Reports and Orders.")
        else:
            print("Tenant 1: no tables or products found. Run seed_demo_tables and seed_demo_products first.")

    print("Done.")


if __name__ == "__main__":
    run()
