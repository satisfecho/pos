"""
Verify Product.image_filename matches public-menu images for linked catalog products.

Exit 0 when healthy; exit 1 when public menu shows an image but /products would not.

Run after catalog import + sync_product_images (deploy uses TENANT_ID=1).

Usage:
  docker compose exec back python -m app.seeds.check_product_image_health
  TENANT_ID=1 docker compose exec back python -m app.seeds.check_product_image_health
"""

from __future__ import annotations

import os
import sys

from sqlmodel import Session

from app.db import engine
from app.models import Tenant
from app.provider_images import (
    product_image_consistency_errors,
    sync_product_images_for_tenant,
)


def run(tenant_id: int | None = None, *, auto_sync: bool = True) -> int:
    with Session(engine) as session:
        if tenant_id is None:
            tenant_id = int(os.environ.get("TENANT_ID", "1"))
        tenant = session.get(Tenant, tenant_id)
        if not tenant:
            print(f"Tenant {tenant_id} not found.", file=sys.stderr)
            return 1

        if auto_sync and os.environ.get("SKIP_PRODUCT_IMAGE_SYNC", "").strip() != "1":
            stats = sync_product_images_for_tenant(session, tenant_id)
            print(
                f"sync_product_images tenant={tenant_id}: "
                f"repaired={stats['repaired']} cleared={stats['cleared']}"
            )

        errors = product_image_consistency_errors(session, tenant_id)
        if errors:
            print(f"Product image health FAIL (tenant {tenant_id}):", file=sys.stderr)
            for err in errors:
                print(f"  - {err}", file=sys.stderr)
            return 1

    print(f"Product image health OK (tenant {tenant_id}).")
    return 0


if __name__ == "__main__":
    tid = os.environ.get("TENANT_ID")
    sys.exit(run(int(tid) if tid else None))
