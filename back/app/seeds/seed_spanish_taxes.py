"""
Seed Spanish IVA tax rates for a tenant (10%, 21%, 0%).
Idempotent: creates taxes only if none exist for the tenant.
Optionally sets default_tax_id to the 10% tax (food/drinks for immediate consumption).

Usage:
  docker compose exec back python -m app.seeds.seed_spanish_taxes
  docker compose exec back python -m app.seeds.seed_spanish_taxes --tenant-id 1
  cd back && python -m app.seeds.seed_spanish_taxes
"""

import argparse
from datetime import date

from sqlmodel import Session, select

from app.db import engine
from app.models import Tax, Tenant


def seed_spanish_taxes(tenant_id: int = 1, set_default: bool = True) -> dict:
    """
    Create the three Spanish IVA rates for the tenant if they don't exist.
    - 10%: food and drinks for immediate consumption
    - 21%: certain services (events, catering, third-party delivery)
    - 0%: exempt (e.g. donations to non-profits)
    """
    with Session(engine) as session:
        tenant = session.get(Tenant, tenant_id)
        if not tenant:
            return {"error": f"Tenant {tenant_id} not found", "created": 0}

        existing = session.exec(select(Tax).where(Tax.tenant_id == tenant_id)).all()
        if existing:
            return {"message": f"Tenant {tenant_id} already has {len(existing)} tax(es)", "created": 0}

        today = date.today()
        taxes = [
            Tax(
                tenant_id=tenant_id,
                name="IVA 10% (alimentos y bebidas)",
                rate_percent=10,
                valid_from=today,
                valid_to=None,
            ),
            Tax(
                tenant_id=tenant_id,
                name="IVA 21% (servicios)",
                rate_percent=21,
                valid_from=today,
                valid_to=None,
            ),
            Tax(
                tenant_id=tenant_id,
                name="IVA 0% (exento)",
                rate_percent=0,
                valid_from=today,
                valid_to=None,
            ),
        ]
        for t in taxes:
            session.add(t)
        session.commit()
        session.refresh(taxes[0])
        session.refresh(taxes[1])
        session.refresh(taxes[2])

        default_id = taxes[0].id  # 10% as general default
        if set_default and default_id:
            tenant.default_tax_id = default_id
            session.add(tenant)
            session.commit()

        return {"created": 3, "default_tax_id": default_id if set_default else None}


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Seed Spanish IVA taxes for a tenant")
    parser.add_argument("--tenant-id", type=int, default=1, help="Tenant ID (default: 1)")
    parser.add_argument("--no-default", action="store_true", help="Do not set default tax to 10%")
    args = parser.parse_args()
    result = seed_spanish_taxes(tenant_id=args.tenant_id, set_default=not args.no_default)
    print(result)
