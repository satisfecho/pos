"""
Remove any tenant(s) named "Rate Limit Test Tenant" from the database.
These are created by the rate-limit test script (test-rate-limit.mjs) when it
hits POST /register multiple times.

Deletes tenant data in FK-safe order (same as remove_extra_tenants): table active_order_id,
orderitem -> order -> reservation -> table -> floor -> product -> tenantproduct ->
i18n_text (tenant-scoped) -> billing_customer -> user -> tenant.

Usage (from repo root with backend in Docker):
  docker compose exec back python -m app.seeds.remove_rate_limit_test_tenants

Or locally:
  cd back && python -m app.seeds.remove_rate_limit_test_tenants
"""

from sqlalchemy import text
from sqlmodel import Session, select

from app.db import engine
from app.models import (
    BillingCustomer,
    Floor,
    I18nText,
    Order,
    OrderItem,
    Product,
    Reservation,
    Table,
    Tenant,
    TenantProduct,
    User,
)

RATE_LIMIT_TEST_TENANT_NAME = "Rate Limit Test Tenant"


def run() -> None:
    with Session(engine) as session:
        tenants = list(
            session.exec(select(Tenant).where(Tenant.name == RATE_LIMIT_TEST_TENANT_NAME)).all()
        )
        if not tenants:
            print("No tenant named 'Rate Limit Test Tenant' found. Nothing to remove.")
            return

        for tenant in tenants:
            tid = tenant.id
            print(f"Removing tenant id={tid} (name='{tenant.name}').")

            session.execute(
                text('UPDATE "table" SET active_order_id = NULL WHERE tenant_id = :tid'),
                {"tid": tid},
            )
            session.commit()

            orders = session.exec(select(Order).where(Order.tenant_id == tid)).all()
            for order in orders:
                items = session.exec(select(OrderItem).where(OrderItem.order_id == order.id)).all()
                for item in items:
                    session.delete(item)
                session.delete(order)
            session.commit()

            for r in session.exec(select(Reservation).where(Reservation.tenant_id == tid)).all():
                session.delete(r)
            session.commit()

            for t in session.exec(select(Table).where(Table.tenant_id == tid)).all():
                session.delete(t)
            session.commit()

            for f in session.exec(select(Floor).where(Floor.tenant_id == tid)).all():
                session.delete(f)
            session.commit()

            for p in session.exec(select(Product).where(Product.tenant_id == tid)).all():
                session.delete(p)
            session.commit()

            for tp in session.exec(
                select(TenantProduct).where(TenantProduct.tenant_id == tid)
            ).all():
                session.delete(tp)
            session.commit()

            for row in session.exec(select(I18nText).where(I18nText.tenant_id == tid)).all():
                session.delete(row)
            session.commit()

            for bc in session.exec(
                select(BillingCustomer).where(BillingCustomer.tenant_id == tid)
            ).all():
                session.delete(bc)
            session.commit()

            for u in session.exec(select(User).where(User.tenant_id == tid)).all():
                session.delete(u)
            session.commit()

            session.delete(tenant)
            session.commit()
            print(f"  Deleted tenant id={tid}.")

    print("Done.")


if __name__ == "__main__":
    run()
