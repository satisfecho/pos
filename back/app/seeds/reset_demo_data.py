"""
Clear tenant 1's orders and reservations, then re-seed demo orders and demo reservations.
Use this to refresh demo data on a server (e.g. amvara9) so Informes show meaningful data.

Does NOT remove tables, products, or users—only orders, order items, fiscal invoices,
inventory rows tied to those orders, and reservations for tenant 1.

Usage (on server, from repo root):
  docker compose --env-file config.env exec -T back python -m app.seeds.reset_demo_data

Or locally:
  cd back && python -m app.seeds.reset_demo_data
"""

from sqlalchemy import text
from sqlmodel import Session

from app.db import engine

DEMO_TENANT_ID = 1


def run() -> None:
    with Session(engine) as session:
        # Unlink tables from active orders so we can delete orders
        session.execute(
            text('UPDATE "table" SET active_order_id = NULL WHERE tenant_id = :tid'),
            {"tid": DEMO_TENANT_ID},
        )

        # Child rows that reference order (must go before order delete)
        deleted_invoices = session.execute(
            text("DELETE FROM fiscal_invoice WHERE tenant_id = :tid"),
            {"tid": DEMO_TENANT_ID},
        ).rowcount
        deleted_inv_tx = session.execute(
            text(
                """
                DELETE FROM inventory_transaction
                WHERE order_id IN (SELECT id FROM "order" WHERE tenant_id = :tid)
                """
            ),
            {"tid": DEMO_TENANT_ID},
        ).rowcount
        deleted_items = session.execute(
            text(
                """
                DELETE FROM orderitem
                WHERE order_id IN (SELECT id FROM "order" WHERE tenant_id = :tid)
                """
            ),
            {"tid": DEMO_TENANT_ID},
        ).rowcount
        deleted_orders = session.execute(
            text('DELETE FROM "order" WHERE tenant_id = :tid'),
            {"tid": DEMO_TENANT_ID},
        ).rowcount
        deleted_reservations = session.execute(
            text("DELETE FROM reservation WHERE tenant_id = :tid"),
            {"tid": DEMO_TENANT_ID},
        ).rowcount
        session.commit()

        print(
            f"Tenant {DEMO_TENANT_ID}: removed {deleted_orders} orders, "
            f"{deleted_items} order items, {deleted_invoices} fiscal invoices, "
            f"{deleted_inv_tx} inventory transactions, "
            f"{deleted_reservations} reservations."
        )

    from app.seeds.seed_demo_orders import run as run_orders
    from app.seeds.seed_demo_reservations import run as run_reservations

    run_orders()
    run_reservations()
    print("Demo data reset and re-seeded.")


if __name__ == "__main__":
    run()
