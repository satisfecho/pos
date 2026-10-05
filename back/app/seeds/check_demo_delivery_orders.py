"""
Check that tenant 1 has Satisfecho Delivery demo orders.

Exits 0 when tenant 1 has at least MIN_DELIVERY_ORDERS rows with
order_channel=satisfecho_delivery; exits 1 otherwise. Soft-warns (non-fail)
when none of those rows have courier_user_id set. Use after seed_demo_orders
or reset_demo_data.

Usage:
  cd back && python -m app.seeds.check_demo_delivery_orders
  docker compose exec back python -m app.seeds.check_demo_delivery_orders
"""

import sys

from sqlalchemy import text
from sqlmodel import Session

from app.db import engine
from app.models import OrderChannel

DEMO_TENANT_ID = 1
# Seed creates NUM_PAID_DELIVERY_ORDERS + NUM_ACTIVE_DELIVERY_ORDERS (9) on empty
# tenant; assert ≥1 so a regression that drops Delivery seeding fails the check.
MIN_DELIVERY_ORDERS = 1


def run() -> int:
    channel = OrderChannel.satisfecho_delivery.value
    with Session(engine) as session:
        row = session.execute(
            text(
                'SELECT COUNT(*), '
                "COUNT(*) FILTER (WHERE courier_user_id IS NOT NULL) "
                'FROM "order" '
                "WHERE tenant_id = :tid AND order_channel = :ch"
            ),
            {"tid": DEMO_TENANT_ID, "ch": channel},
        ).one()
        total = int(row[0] or 0)
        with_courier = int(row[1] or 0)

    if total < MIN_DELIVERY_ORDERS:
        print(
            f"Missing Satisfecho Delivery orders for tenant {DEMO_TENANT_ID}: "
            f"got {total}, need ≥{MIN_DELIVERY_ORDERS}. "
            "Run: python -m app.seeds.reset_demo_data "
            "(or seed_demo_orders; Delivery samples are added even if table orders exist)."
        )
        return 1

    print(
        f"OK: tenant {DEMO_TENANT_ID} has {total} "
        f"order_channel={channel} order(s)."
    )
    if with_courier == 0:
        print(
            "WARN: none of those delivery orders have courier_user_id set "
            "(run seed_demo_courier_user before seed_demo_orders / reset_demo_data)."
        )
    else:
        print(f"  ({with_courier} with courier_user_id assigned)")
    return 0


if __name__ == "__main__":
    sys.exit(run())
