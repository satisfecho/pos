"""
CLI for inactive tenant housekeeping (#442).

Usage (from repo root with backend in Docker):
  docker compose exec back python -m app.seeds.inactive_tenant_housekeeping
  docker compose exec back python -m app.seeds.inactive_tenant_housekeeping --dry-run
  docker compose exec back python -m app.seeds.inactive_tenant_housekeeping --include-demo

Or locally:
  cd back && python -m app.seeds.inactive_tenant_housekeeping --dry-run
"""

from __future__ import annotations

import argparse
import asyncio
import json

from sqlmodel import Session

from app.db import engine
from app.inactive_tenant_housekeeping import (
    DEFAULT_HARD_DELETE_DAYS_AFTER_SOFT,
    DEFAULT_INACTIVE_DAYS,
    DEFAULT_WARNING_GRACE_DAYS,
    run_inactive_tenant_housekeeping,
)


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Warn / soft-delete / hard-delete inactive restaurant tenants (#442)."
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Report matches without writing or deleting",
    )
    parser.add_argument(
        "--include-demo",
        action="store_true",
        help="Also process tenant id 1 (demo); default skips it",
    )
    parser.add_argument(
        "--inactive-days",
        type=int,
        default=DEFAULT_INACTIVE_DAYS,
        help=f"Days without owner login before warning (default {DEFAULT_INACTIVE_DAYS})",
    )
    parser.add_argument(
        "--warning-grace-days",
        type=int,
        default=DEFAULT_WARNING_GRACE_DAYS,
        help=f"Days after warning before soft-delete (default {DEFAULT_WARNING_GRACE_DAYS})",
    )
    parser.add_argument(
        "--hard-delete-days",
        type=int,
        default=DEFAULT_HARD_DELETE_DAYS_AFTER_SOFT,
        help=(
            "Days after soft-delete before hard purge "
            f"(default {DEFAULT_HARD_DELETE_DAYS_AFTER_SOFT})"
        ),
    )
    parser.add_argument(
        "--no-emails",
        action="store_true",
        help="Skip sending warning emails (still set timestamps when not dry-run)",
    )
    parser.add_argument(
        "--tenant-id",
        type=int,
        action="append",
        default=None,
        help="Limit to one or more tenant ids (repeatable); default: all tenants",
    )
    args = parser.parse_args()

    with Session(engine) as session:
        result = asyncio.run(
            run_inactive_tenant_housekeeping(
                session,
                dry_run=args.dry_run,
                inactive_days=args.inactive_days,
                warning_grace_days=args.warning_grace_days,
                hard_delete_days_after_soft=args.hard_delete_days,
                include_demo=args.include_demo,
                send_emails=not args.no_emails,
                tenant_ids=args.tenant_id,
            )
        )
    print(json.dumps(result, indent=2, sort_keys=True))


if __name__ == "__main__":
    main()
