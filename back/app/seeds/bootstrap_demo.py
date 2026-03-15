"""
Bootstrap a demo tenant on virgin deployment so the first registration gets tables and products.

If no tenants exist, creates tenant 1 "Demo Restaurant", then runs seed_demo_tables and
seed_demo_products for it. Deploy runs this after migrations so that:
- First user to register is assigned to this tenant (see register() in main.py) and gets T01–T10 + demo products.
- No manual "run seeds after first register" step.

Usage:
  docker compose exec back python -m app.seeds.bootstrap_demo
"""

from sqlmodel import Session, select

from app.db import engine
from app.models import Tenant

DEMO_TENANT_NAME = "Demo Restaurant"


def run() -> None:
    with Session(engine) as session:
        existing = session.exec(select(Tenant)).all()
        if existing:
            print("Tenants already exist. Skipping bootstrap.")
            return
        tenant = Tenant(name=DEMO_TENANT_NAME)
        session.add(tenant)
        session.commit()
        session.refresh(tenant)
        print(f"Created tenant id={tenant.id} ({DEMO_TENANT_NAME}).")

    from app.seeds.seed_demo_tables import run as run_tables
    from app.seeds.seed_demo_products import run as run_products

    run_tables()
    run_products()
    print("Bootstrap done.")


if __name__ == "__main__":
    run()
