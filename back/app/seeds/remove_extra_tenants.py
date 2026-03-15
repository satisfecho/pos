"""
Remove all tenants except one named "Cobalto" (the restaurant to keep).
If no tenant is named "Cobalto", keeps tenant id=1 and renames it to "Cobalto", then deletes the rest.

Deletes tenant data in FK-safe order: orderitem -> order -> reservation -> table -> floor ->
product -> tenantproduct -> i18n_text (tenant-scoped) -> user -> tenant.

WARNING: This deletes ALL users belonging to removed tenants (e.g. ralf@roeber.de if that
user was in a non-Cobalto tenant). It is NOT run by deploy-amvara9.sh. If you run it on
amvara9, the demo account (and any other non-Cobalto tenant users) will be gone. To restore
a demo login: either re-register at /register, or set the password of the remaining Cobalto
user with set_user_password (USER_EMAIL=... NEW_PASSWORD=...).

Usage (on server, from repo root):
  docker compose --env-file config.env exec -T back python -m app.seeds.remove_extra_tenants

Or locally:
  cd back && python -m app.seeds.remove_extra_tenants
"""

import sys

from sqlalchemy import text
from sqlmodel import Session, select

from app.db import engine
from app.models import (
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

KEEP_NAME = "Cobalto"


def run() -> None:
    with Session(engine) as session:
        # Find tenant to keep: by name "Cobalto" or fallback to id=1
        cobalto = session.exec(select(Tenant).where(Tenant.name == KEEP_NAME)).first()
        if cobalto:
            keep_id = cobalto.id
            print(f"Keeping tenant id={keep_id} (name='{KEEP_NAME}').")
        else:
            first = session.exec(select(Tenant).order_by(Tenant.id)).first()
            if not first:
                print("No tenants in database.")
                return
            keep_id = first.id
            first.name = KEEP_NAME
            session.add(first)
            session.commit()
            print(f"No '{KEEP_NAME}' tenant found. Keeping tenant id={keep_id} and renaming to '{KEEP_NAME}'.")

        # All other tenant ids
        all_tenants = session.exec(select(Tenant.id)).all()
        to_delete = [tid for tid in all_tenants if tid != keep_id]
        if not to_delete:
            print(f"Only one tenant (id={keep_id}) exists. Nothing to remove.")
            return

        print(f"Removing {len(to_delete)} tenant(s): {to_delete}")

        for tid in to_delete:
            # Null table.active_order_id so we can delete orders
            session.execute(text('UPDATE "table" SET active_order_id = NULL WHERE tenant_id = :tid'), {"tid": tid})
            session.commit()

            # Order: orderitem -> order -> reservation -> table -> floor -> product -> tenantproduct -> i18n_text -> user -> tenant
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

            for tp in session.exec(select(TenantProduct).where(TenantProduct.tenant_id == tid)).all():
                session.delete(tp)
            session.commit()

            # I18nText with this tenant_id
            i18n = session.exec(select(I18nText).where(I18nText.tenant_id == tid)).all()
            for row in i18n:
                session.delete(row)
            session.commit()

            for u in session.exec(select(User).where(User.tenant_id == tid)).all():
                session.delete(u)
            session.commit()

            tenant = session.get(Tenant, tid)
            if tenant:
                session.delete(tenant)
                session.commit()
                print(f"  Deleted tenant id={tid} (name='{tenant.name}').")

    print("Done. Only Cobalto restaurant remains.")


if __name__ == "__main__":
    run()
