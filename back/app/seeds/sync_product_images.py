"""
Sync Product.image_filename with linked TenantProduct / provider catalog files.

Idempotent. Safe for custom tenant uploads (only repairs missing or orphan paths).

Usage:
  docker compose exec back python -m app.seeds.sync_product_images
  TENANT_ID=1 docker compose exec back python -m app.seeds.sync_product_images
"""

from __future__ import annotations

import os
import sys

from sqlmodel import Session, select

from app.db import engine
from app.models import Tenant
from app.provider_images import sync_product_images_for_tenant


def run(tenant_id: int | None = None) -> int:
    with Session(engine) as session:
        if tenant_id is None:
            tenant_id = int(os.environ.get("TENANT_ID", "1"))
        tenant = session.get(Tenant, tenant_id)
        if not tenant:
            print(f"Tenant {tenant_id} not found.", file=sys.stderr)
            return 1
        stats = sync_product_images_for_tenant(session, tenant_id)
    print(
        f"sync_product_images tenant={tenant_id}: "
        f"repaired={stats['repaired']} cleared={stats['cleared']} unchanged={stats['unchanged']}"
    )
    return 0


if __name__ == "__main__":
    tid = os.environ.get("TENANT_ID")
    sys.exit(run(int(tid) if tid else None))
