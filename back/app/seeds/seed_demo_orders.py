"""
Seed demo orders for tenant 1 on clean deployment so Reports (Informes) show meaningful data.

Creates a mix of **table** orders (pending, preparing, ready, completed, paid) plus a small
set of **Satisfecho Delivery** samples (`order_channel=satisfecho_delivery`, no table) so the
staff Delivery tab, kitchen cards, and courier Mine list are non-empty after bootstrap /
`reset_demo_data`.

Paid/completed orders are spread over the last ±90 days (more density in the last 30 days)
so the default report date range shows revenue, by product, by table, etc.

Idempotent: runs only when tenant 1 has no orders (clean deployment). Does not delete or
change existing orders. Assigns `courier_user_id` only when a courier-role user already
exists for the tenant (never creates users or passwords).

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
    OrderChannel,
    OrderItem,
    OrderItemStatus,
    OrderStatus,
    Product,
    Table,
    User,
    UserRole,
)

DEMO_TENANT_ID = 1
# Focus dates within ±90 days of today; weight more in last 30 days for default report range
DAYS_BACK = 90
# Approximate count: paid orders (for reports) + a few active orders (pending/preparing/ready/completed)
NUM_PAID_ORDERS = 35
NUM_ACTIVE_ORDERS = 5
# Satisfecho Delivery samples (staff Delivery tab / courier / kitchen demo)
NUM_PAID_DELIVERY_ORDERS = 5
NUM_ACTIVE_DELIVERY_ORDERS = 4

_DEMO_DELIVERY_ADDRESSES = (
    "Calle Mayor 10, 28013 Madrid",
    "Calle de Alcalá 45, 28014 Madrid",
    "Paseo de la Castellana 100, 28046 Madrid",
    "Calle Fuencarral 78, 28004 Madrid",
    "Avenida de América 25, 28002 Madrid",
    "Calle Serrano 50, 28001 Madrid",
)
_DEMO_DELIVERY_PHONES = (
    "+34600111222",
    "+34600333444",
    "+34600555666",
    "+34600777888",
)
_DEMO_DELIVERY_NAMES = (
    "Ana García",
    "Carlos Ruiz",
    "María López",
    "Pedro Martín",
)


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


def _existing_courier_user_id(session: Session, tenant_id: int) -> int | None:
    """Return an existing courier-role user id for the tenant, or None (do not create users)."""
    courier = session.exec(
        select(User)
        .where(User.tenant_id == tenant_id, User.role == UserRole.courier)
        .limit(1)
    ).first()
    return courier.id if courier is not None else None


def _add_order_items(
    session: Session,
    order_id: int,
    products: list[Product],
    item_status: OrderItemStatus,
    qty_max: int = 3,
) -> None:
    for p in products:
        qty = random.randint(1, qty_max)
        session.add(
            OrderItem(
                order_id=order_id,
                product_id=p.id,
                product_name=p.name,
                quantity=qty,
                price_cents=p.price_cents,
                status=item_status,
            )
        )


def _seed_demo_delivery_orders(
    session: Session,
    tenant_id: int,
    products_for_orders: list[Product],
) -> int:
    """Create Satisfecho Delivery demo orders (no table). Returns count created."""
    courier_user_id = _existing_courier_user_id(session, tenant_id)
    created = 0

    for _ in range(NUM_PAID_DELIVERY_ORDERS):
        order_date = _random_date_in_window(DAYS_BACK, bias_last_days=30)
        chosen = random.choices(products_for_orders, k=random.randint(1, 3))
        assign_courier = courier_user_id is not None and random.random() < 0.7
        order = Order(
            tenant_id=tenant_id,
            table_id=None,
            status=OrderStatus.paid,
            order_channel=OrderChannel.satisfecho_delivery,
            delivery_address=random.choice(_DEMO_DELIVERY_ADDRESSES),
            customer_phone=random.choice(_DEMO_DELIVERY_PHONES),
            customer_name=random.choice(_DEMO_DELIVERY_NAMES),
            courier_user_id=courier_user_id if assign_courier else None,
            created_at=order_date,
            paid_at=order_date + timedelta(minutes=random.randint(20, 120)),
            paid_by_user_id=None,
            payment_method=random.choice(["cash", "terminal", "stripe"]),
        )
        session.add(order)
        session.flush()
        _add_order_items(session, order.id, chosen, OrderItemStatus.delivered)
        created += 1

    # Active: kitchen + courier demos (include one out_for_delivery when a courier exists)
    active_specs: list[tuple[OrderStatus, OrderItemStatus, bool]] = [
        (OrderStatus.pending, OrderItemStatus.pending, False),
        (OrderStatus.preparing, OrderItemStatus.preparing, False),
        (OrderStatus.ready, OrderItemStatus.ready, True),
        (
            OrderStatus.out_for_delivery if courier_user_id else OrderStatus.ready,
            OrderItemStatus.ready,
            True,
        ),
    ]
    for status, item_status, assign_courier in active_specs[:NUM_ACTIVE_DELIVERY_ORDERS]:
        order_date = _random_date_in_window(DAYS_BACK, bias_last_days=3)
        chosen = random.choices(products_for_orders, k=random.randint(1, 3))
        use_courier = (
            assign_courier and courier_user_id is not None
        ) or (status == OrderStatus.out_for_delivery and courier_user_id is not None)
        order = Order(
            tenant_id=tenant_id,
            table_id=None,
            status=status,
            order_channel=OrderChannel.satisfecho_delivery,
            delivery_address=random.choice(_DEMO_DELIVERY_ADDRESSES),
            customer_phone=random.choice(_DEMO_DELIVERY_PHONES),
            customer_name=random.choice(_DEMO_DELIVERY_NAMES),
            courier_user_id=courier_user_id if use_courier else None,
            created_at=order_date,
            paid_at=None,
        )
        session.add(order)
        session.flush()
        _add_order_items(session, order.id, chosen, item_status, qty_max=2)
        created += 1

    return created


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
        _add_order_items(session, order.id, chosen, OrderItemStatus.delivered)
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
        _add_order_items(
            session, order.id, chosen, item_status_for_order[status], qty_max=2
        )
        created += 1

    created += _seed_demo_delivery_orders(session, tenant_id, products_for_orders)
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
            print(
                f"Tenant {DEMO_TENANT_ID}: created {n} demo orders "
                f"(table + Satisfecho Delivery paid/active) for Reports, Orders, and Delivery."
            )
        else:
            print("Tenant 1: no tables or products found. Run seed_demo_tables and seed_demo_products first.")

    print("Done.")


if __name__ == "__main__":
    run()
