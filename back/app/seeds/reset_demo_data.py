"""
Clear tenant 1's orders and reservations, then re-seed demo orders and demo reservations.
Use this to refresh demo data on a server (e.g. amvara9) so Informes show meaningful data.

Does NOT remove tables, products, or users—only orders, order items, and reservations for tenant 1.

Usage (on server, from repo root):
  docker compose --env-file config.env exec -T back python -m app.seeds.reset_demo_data

Or locally:
  cd back && python -m app.seeds.reset_demo_data
"""

from sqlalchemy import text
from sqlmodel import Session, select

from app.db import engine
from app.models import Order, OrderItem, Reservation

DEMO_TENANT_ID = 1


def run() -> None:
    with Session(engine) as session:
        # Unlink tables from active orders so we can delete orders
        session.execute(
            text('UPDATE "table" SET active_order_id = NULL WHERE tenant_id = :tid'),
            {"tid": DEMO_TENANT_ID},
        )
        session.commit()

        orders = session.exec(select(Order).where(Order.tenant_id == DEMO_TENANT_ID)).all()
        for order in orders:
            items = session.exec(select(OrderItem).where(OrderItem.order_id == order.id)).all()
            for item in items:
                session.delete(item)
            session.delete(order)
        session.commit()
        deleted_orders = len(orders)

        reservations = session.exec(
            select(Reservation).where(Reservation.tenant_id == DEMO_TENANT_ID)
        ).all()
        for r in reservations:
            session.delete(r)
        session.commit()
        deleted_reservations = len(reservations)

        print(
            f"Tenant {DEMO_TENANT_ID}: removed {deleted_orders} orders and {deleted_reservations} reservations."
        )

    from app.seeds.seed_demo_orders import run as run_orders
    from app.seeds.seed_demo_reservations import run as run_reservations

    run_orders()
    run_reservations()
    print("Demo data reset and re-seeded.")


if __name__ == "__main__":
    run()
