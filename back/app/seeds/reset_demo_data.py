"""
Clear tenant 1's orders, reservations, and waiting-list entries, then re-seed
demo courier (when missing), orders, reservations, waiting-list samples, and
delivery fee/zone settings.
Use this to refresh demo data on a server (e.g. amvara9) so Informes show meaningful data.
Re-seed includes a demo courier user when missing (see seed_demo_courier_user),
table orders plus Satisfecho Delivery samples (see seed_demo_orders), a small
waiting-list queue (see seed_demo_waiting_list), and demo delivery fee/zone
coverage when unset (see seed_demo_delivery_settings).

Does NOT remove tables, products, or users—only orders, order items, order payments /
payment line allocations, fiscal invoices, inventory rows tied to those orders,
reservations, and waiting_list_entry for tenant 1.

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
        # Split-bill payment lines reference orderitem; payment legs reference order.
        # Live FKs may lack ON DELETE CASCADE (CREATE TABLE IF NOT EXISTS), so delete
        # explicitly before orderitem / order (tenant 1 only).
        deleted_payment_items = session.execute(
            text("DELETE FROM order_payment_item WHERE tenant_id = :tid"),
            {"tid": DEMO_TENANT_ID},
        ).rowcount
        deleted_payments = session.execute(
            text("DELETE FROM order_payment WHERE tenant_id = :tid"),
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
        deleted_waiting = session.execute(
            text("DELETE FROM waiting_list_entry WHERE tenant_id = :tid"),
            {"tid": DEMO_TENANT_ID},
        ).rowcount
        session.commit()

        print(
            f"Tenant {DEMO_TENANT_ID}: removed {deleted_orders} orders, "
            f"{deleted_items} order items, {deleted_payment_items} payment items, "
            f"{deleted_payments} payments, {deleted_invoices} fiscal invoices, "
            f"{deleted_inv_tx} inventory transactions, "
            f"{deleted_reservations} reservations, "
            f"{deleted_waiting} waiting-list entries."
        )

    from app.seeds.seed_demo_courier_user import run as run_courier_user
    from app.seeds.seed_demo_delivery_settings import run as run_delivery_settings
    from app.seeds.seed_demo_orders import run as run_orders
    from app.seeds.seed_demo_reservations import run as run_reservations
    from app.seeds.seed_demo_waiting_list import run as run_waiting_list

    run_delivery_settings()
    run_courier_user()
    run_orders()
    run_reservations()
    run_waiting_list()
    print("Demo data reset and re-seeded.")


if __name__ == "__main__":
    run()
