"""
Cancel abandoned unpaid public Satisfecho Delivery orders past TTL.

Public checkout tags orders with session_id ``public_satisfecho_delivery``.
Default TTL is 2 hours (past ``public_order_token`` ~1h lifetime). Staff-created
Satisfecho Delivery orders are never tagged and are never cleaned.

Usage (from repo root with backend in Docker):
  docker compose exec back python -m app.seeds.cleanup_unpaid_public_delivery
  docker compose exec back python -m app.seeds.cleanup_unpaid_public_delivery --dry-run
  docker compose exec back python -m app.seeds.cleanup_unpaid_public_delivery --ttl-hours 4

Or locally:
  cd back && python -m app.seeds.cleanup_unpaid_public_delivery
"""

from __future__ import annotations

import argparse

from sqlmodel import Session

from app.cleanup_unpaid_public_delivery import (
    DEFAULT_TTL_HOURS,
    cleanup_unpaid_public_delivery_orders,
)
from app.db import engine


def run(
    *,
    ttl_hours: float = DEFAULT_TTL_HOURS,
    dry_run: bool = False,
    tenant_id: int | None = None,
) -> dict:
    with Session(engine) as session:
        result = cleanup_unpaid_public_delivery_orders(
            session,
            ttl_hours=ttl_hours,
            dry_run=dry_run,
            tenant_id=tenant_id,
        )
        if not dry_run and result.get("cancelled"):
            session.commit()
    return result


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Cancel unpaid public Satisfecho Delivery orders past TTL."
    )
    parser.add_argument(
        "--ttl-hours",
        type=float,
        default=DEFAULT_TTL_HOURS,
        help=f"Age threshold in hours (default {DEFAULT_TTL_HOURS})",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Count matches without cancelling",
    )
    parser.add_argument(
        "--tenant-id",
        type=int,
        default=None,
        help="Limit to one tenant (default: all tenants)",
    )
    args = parser.parse_args()
    result = run(
        ttl_hours=args.ttl_hours,
        dry_run=args.dry_run,
        tenant_id=args.tenant_id,
    )
    mode = "dry-run" if result["dry_run"] else "applied"
    print(
        f"[{mode}] matched={result['matched']} cancelled={result['cancelled']} "
        f"ttl_hours={result['ttl_hours']} cutoff={result['cutoff_iso']}"
    )


if __name__ == "__main__":
    main()
