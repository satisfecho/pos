"""
Seed demo restaurant with one floor and tables T01–T09 (4 and 2 seats).

Use for tenant_id=1 (demo restaurant). Idempotent: creates missing tables only;
does not delete or change existing tables. Uses raw SQL for floor so it works
even if floor table lacks optional columns (e.g. default_waiter_id).

Usage (from repo root, with back as cwd or PYTHONPATH):
  cd back && python -m app.seeds.seed_demo_tables

Or via Docker:
  docker compose exec back python -m app.seeds.seed_demo_tables
"""

import sys
from uuid import uuid4

from sqlalchemy import text
from sqlmodel import Session

from app.db import engine
from app.models import Tenant

DEMO_TENANT_ID = 1
FLOOR_NAME = "Main"
# T01–T05: 4 seats; T06–T09: 2 seats
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
]


def run() -> None:
    with Session(engine) as session:
        tenant = session.get(Tenant, DEMO_TENANT_ID)
        if not tenant:
            print(f"Tenant id={DEMO_TENANT_ID} not found. Create a tenant (e.g. via register) first.")
            sys.exit(1)

        # Ensure floor exists (raw SQL to avoid needing every floor column)
        result = session.execute(
            text("SELECT id FROM floor WHERE tenant_id = :tid AND name = :name"),
            {"tid": DEMO_TENANT_ID, "name": FLOOR_NAME},
        )
        row = result.fetchone()
        if row:
            floor_id = row[0]
            print(f"Floor already exists: {FLOOR_NAME} (id={floor_id})")
        else:
            session.execute(
                text(
                    "INSERT INTO floor (tenant_id, name, sort_order, created_at) VALUES (:tid, :name, 0, NOW())"
                ),
                {"tid": DEMO_TENANT_ID, "name": FLOOR_NAME},
            )
            session.commit()
            result = session.execute(
                text("SELECT id FROM floor WHERE tenant_id = :tid AND name = :name"),
                {"tid": DEMO_TENANT_ID, "name": FLOOR_NAME},
            )
            floor_id = result.fetchone()[0]
            print(f"Created floor: {FLOOR_NAME} (id={floor_id})")

        # Get existing tables: name -> (id, seat_count)
        result = session.execute(
            text('SELECT name, id, seat_count FROM "table" WHERE tenant_id = :tid'),
            {"tid": DEMO_TENANT_ID},
        )
        existing = {row[0]: (row[1], row[2]) for row in result.fetchall()}

        created = 0
        updated = 0
        for name, seat_count in TABLE_SPECS:
            if name not in existing:
                token = str(uuid4())
                session.execute(
                    text(
                        '''INSERT INTO "table" (tenant_id, name, token, floor_id, seat_count)
                           VALUES (:tid, :name, :token, :floor_id, :seat_count)'''
                    ),
                    {
                        "tid": DEMO_TENANT_ID,
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
                print(f"Created {created} tables: {[s[0] for s in TABLE_SPECS if s[0] not in existing]}")
            if updated:
                print(f"Updated {updated} table(s) to expected seat counts.")
        else:
            print("All demo tables (T01–T09) already exist with correct seat counts.")

    print("Done.")


if __name__ == "__main__":
    run()
