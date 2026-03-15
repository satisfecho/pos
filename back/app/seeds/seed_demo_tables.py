"""
Seed demo floor and tables T01–T10 for any tenant that has no tables.
Idempotent: creates missing tables only; does not delete or change existing tables.
Uses raw SQL for floor so it works even if floor table lacks optional columns.

Usage (from repo root, with back as cwd or PYTHONPATH):
  cd back && python -m app.seeds.seed_demo_tables

Or via Docker:
  docker compose exec back python -m app.seeds.seed_demo_tables
"""

from uuid import uuid4

from sqlalchemy import text
from sqlmodel import Session

from app.db import engine
from app.models import Tenant

FLOOR_NAME = "Main"
# T01–T05: 4 seats; T06–T10: 2 seats (10 demo tables per tenant)
TABLE_SPECS = [
    ("T01", 4),
    ("T02", 4),
    ("T03", 4),
    ("T04", 4),
    ("T05", 4),
    ("T06", 2),
    ("T07", 2),
    ("T08", 2),
    ("T09", 2),
    ("T10", 2),
]


def _seed_tenant_tables(session, tenant_id: int) -> None:
    """Ensure one floor and T01–T10 exist for the given tenant."""
    # Ensure floor exists (raw SQL to avoid needing every floor column)
    result = session.execute(
        text("SELECT id FROM floor WHERE tenant_id = :tid AND name = :name"),
        {"tid": tenant_id, "name": FLOOR_NAME},
    )
    row = result.fetchone()
    if row:
        floor_id = row[0]
    else:
        session.execute(
            text(
                "INSERT INTO floor (tenant_id, name, sort_order, created_at) VALUES (:tid, :name, 0, NOW())"
            ),
            {"tid": tenant_id, "name": FLOOR_NAME},
        )
        session.commit()
        result = session.execute(
            text("SELECT id FROM floor WHERE tenant_id = :tid AND name = :name"),
            {"tid": tenant_id, "name": FLOOR_NAME},
        )
        floor_id = result.fetchone()[0]
        print(f"Tenant {tenant_id}: created floor {FLOOR_NAME} (id={floor_id})")

    result = session.execute(
        text('SELECT name, id, seat_count FROM "table" WHERE tenant_id = :tid'),
        {"tid": tenant_id},
    )
    existing = {row[0]: (row[1], row[2]) for row in result.fetchall()}

    created = 0
    updated = 0
    for name, seat_count in TABLE_SPECS:
        if name not in existing:
            token = str(uuid4())
            session.execute(
                text(
                    '''INSERT INTO "table" (tenant_id, name, token, floor_id, seat_count, x_position, y_position, rotation, shape, width, height, is_active)
                       VALUES (:tid, :name, :token, :floor_id, :seat_count, 0, 0, 0, 'rectangle', 100, 60, false)'''
                ),
                {
                    "tid": tenant_id,
                    "name": name,
                    "token": token,
                    "floor_id": floor_id,
                    "seat_count": seat_count,
                },
            )
            created += 1
        else:
            _id, current_seats = existing[name]
            if current_seats != seat_count:
                session.execute(
                    text('UPDATE "table" SET seat_count = :seat_count, floor_id = :floor_id WHERE id = :id'),
                    {"seat_count": seat_count, "floor_id": floor_id, "id": _id},
                )
                updated += 1

    if created or updated:
        session.commit()
        if created:
            print(f"Tenant {tenant_id}: created {created} tables (T01–T10).")
        if updated:
            print(f"Tenant {tenant_id}: updated {updated} table(s) seat counts.")


def run() -> None:
    with Session(engine) as session:
        # All tenant ids
        result = session.execute(text("SELECT id FROM tenant ORDER BY id"))
        tenant_ids = [row[0] for row in result.fetchall()]
        if not tenant_ids:
            print("No tenants found. Create a tenant (e.g. via register) first.")
            return

        # Tenant ids that have no tables
        result = session.execute(
            text('SELECT tenant_id FROM "table" GROUP BY tenant_id')
        )
        tenants_with_tables = {row[0] for row in result.fetchall()}
        to_seed = [tid for tid in tenant_ids if tid not in tenants_with_tables]

        if not to_seed:
            print("All tenants already have tables. Nothing to seed.")
            return

        for tenant_id in to_seed:
            _seed_tenant_tables(session, tenant_id)

    print("Done.")


if __name__ == "__main__":
    run()
