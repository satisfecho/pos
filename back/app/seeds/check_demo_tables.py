"""
Check that demo tables T01–T10 exist for tenant 1.

Exits 0 if all exist with expected seat counts (T01–T05: 4, T06–T10: 2);
exits 1 otherwise. Use after seed_demo_tables or to verify DB state.

Usage:
  cd back && python -m app.seeds.check_demo_tables
  docker compose exec back python -m app.seeds.check_demo_tables
"""

import sys

from sqlalchemy import text
from sqlmodel import Session

from app.db import engine

DEMO_TENANT_ID = 1
EXPECTED = [
    ("T01", 4), ("T02", 4), ("T03", 4), ("T04", 4), ("T05", 4),
    ("T06", 2), ("T07", 2), ("T08", 2), ("T09", 2), ("T10", 2),
]


def run() -> int:
    with Session(engine) as session:
        result = session.execute(
            text('SELECT name, seat_count FROM "table" WHERE tenant_id = :tid'),
            {"tid": DEMO_TENANT_ID},
        )
        tables = {row[0]: row[1] for row in result.fetchall()}

    missing = []
    wrong_seats = []
    for name, expected_seats in EXPECTED:
        if name not in tables:
            missing.append(name)
        elif tables[name] != expected_seats:
            wrong_seats.append(f"{name}(expected={expected_seats}, got={tables[name]})")

    if missing:
        print(f"Missing tables for tenant {DEMO_TENANT_ID}: {missing}")
    if wrong_seats:
        print(f"Wrong seat_count: {wrong_seats}")
    if missing or wrong_seats:
        return 1
    print(f"OK: tenant {DEMO_TENANT_ID} has T01–T10 with correct seat counts.")
    return 0


if __name__ == "__main__":
    sys.exit(run())
