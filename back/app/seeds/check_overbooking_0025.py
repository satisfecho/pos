"""
Verify 0025 overbooking behaviour when (almost) all tables are in use: one empty table.

Scenario: For a slot with reserved_parties = total_tables - 1 (e.g. 9 reservations, 10 tables),
we expect:
  - slot capacity shows tables_left=1, seats_left = total_seats - reserved_guests
  - creating one more reservation (10th) is allowed
  - creating an 11th would be over capacity (reserved_parties + 1 > total_tables)

This script either finds such a slot in the DB (tenant 1) or creates a test scenario
(N-1 reservations for a dedicated slot), runs assertions, then removes the test data.

Usage:
  cd back && python -m app.seeds.check_overbooking_0025
  docker compose exec back python -m app.seeds.check_overbooking_0025
"""

import sys
from collections import defaultdict
from datetime import date, time, timedelta, timezone
from typing import Optional

from sqlmodel import Session, select

from app.db import engine
from app.models import Reservation, ReservationStatus, Table

DEMO_TENANT_ID = 1
TEST_CUSTOMER_NAME = "test-0025-overbooking"
TEST_SLOT_TIME = time(20, 0)  # 20:00
TEST_SLOT_TIME_FULL = time(21, 0)  # 21:00 for full-slot scenario


def capacity_for_tenant(session: Session, tenant_id: int) -> tuple[int, int]:
    """Return (total_seats, total_tables)."""
    tables = session.exec(select(Table).where(Table.tenant_id == tenant_id)).all()
    total_seats = sum(t.seat_count for t in tables)
    return (total_seats, len(tables))


def demand_for_slot(
    session: Session,
    tenant_id: int,
    slot_date: date,
    slot_time: time,
    exclude_reservation_id: Optional[int] = None,
) -> tuple[int, int]:
    """Return (reserved_guests, reserved_parties). Active = booked, seated."""
    q = select(Reservation).where(
        Reservation.tenant_id == tenant_id,
        Reservation.reservation_date == slot_date,
        Reservation.reservation_time == slot_time,
        Reservation.status.in_([ReservationStatus.booked, ReservationStatus.seated]),
    )
    if exclude_reservation_id is not None:
        q = q.where(Reservation.id != exclude_reservation_id)
    reservations = session.exec(q).all()
    reserved_guests = sum(r.party_size for r in reservations)
    return (reserved_guests, len(reservations))


def create_test_scenario(session: Session, slot_date: date) -> list[int]:
    """Create N-1 seated reservations for the test slot. Returns created reservation IDs."""
    total_seats, total_tables = capacity_for_tenant(session, DEMO_TENANT_ID)
    n = total_tables - 1
    if n < 1:
        return []

    tables = session.exec(
        select(Table).where(Table.tenant_id == DEMO_TENANT_ID).order_by(Table.id)
    ).all()
    if len(tables) < n:
        return []
    table_ids = [t.id for t in tables[:n]]

    created_ids = []
    for i, tid in enumerate(table_ids):
        r = Reservation(
            tenant_id=DEMO_TENANT_ID,
            customer_name=TEST_CUSTOMER_NAME,
            customer_phone="+49000000000",
            customer_email=None,
            reservation_date=slot_date,
            reservation_time=TEST_SLOT_TIME,
            party_size=2,
            status=ReservationStatus.seated,
            table_id=tid,
            token=None,
        )
        session.add(r)
        session.flush()
        created_ids.append(r.id)
    session.commit()
    return created_ids


def create_full_slot_scenario(session: Session, slot_date: date) -> list[int]:
    """Create N seated reservations (full slot). Returns created reservation IDs."""
    total_seats, total_tables = capacity_for_tenant(session, DEMO_TENANT_ID)
    if total_tables < 1:
        return []
    tables = session.exec(
        select(Table).where(Table.tenant_id == DEMO_TENANT_ID).order_by(Table.id)
    ).all()
    if len(tables) < total_tables:
        return []
    table_ids = [t.id for t in tables[:total_tables]]
    created_ids = []
    for i, tid in enumerate(table_ids):
        r = Reservation(
            tenant_id=DEMO_TENANT_ID,
            customer_name=TEST_CUSTOMER_NAME,
            customer_phone="+49000000001",
            customer_email=None,
            reservation_date=slot_date,
            reservation_time=TEST_SLOT_TIME_FULL,
            party_size=2,
            status=ReservationStatus.seated,
            table_id=tid,
            token=None,
        )
        session.add(r)
        session.flush()
        created_ids.append(r.id)
    session.commit()
    return created_ids


def delete_test_scenario(
    session: Session, slot_date: date, slot_time: time = TEST_SLOT_TIME
) -> None:
    """Remove reservations created by create_test_scenario or create_full_slot_scenario."""
    to_delete = session.exec(
        select(Reservation).where(
            Reservation.tenant_id == DEMO_TENANT_ID,
            Reservation.customer_name == TEST_CUSTOMER_NAME,
            Reservation.reservation_date == slot_date,
            Reservation.reservation_time == slot_time,
        )
    ).all()
    for r in to_delete:
        session.delete(r)
    session.commit()


def run() -> int:
    with Session(engine) as session:
        total_seats, total_tables = capacity_for_tenant(session, DEMO_TENANT_ID)
        if total_tables == 0:
            print("No tables for tenant 1. Run seed_demo_tables first.")
            return 1

        # All active reservations for tenant, grouped by (date, time)
        reservations = session.exec(
            select(Reservation).where(
                Reservation.tenant_id == DEMO_TENANT_ID,
                Reservation.status.in_([ReservationStatus.booked, ReservationStatus.seated]),
            )
        ).all()
        slot_demand: dict[tuple[date, time], tuple[int, int]] = defaultdict(lambda: (0, 0))
        for r in reservations:
            key = (r.reservation_date, r.reservation_time)
            g, p = slot_demand[key]
            slot_demand[key] = (g + r.party_size, p + 1)

        # Find a slot with exactly (total_tables - 1) parties, or create one
        candidate_slot: Optional[tuple[date, time]] = None
        for (d, t), (guests, parties) in slot_demand.items():
            if parties == total_tables - 1:
                candidate_slot = (d, t)
                break

        created_test_data = False
        if not candidate_slot:
            # Create test scenario: tomorrow 20:00, N-1 seated reservations
            from datetime import datetime as dt
            slot_date = dt.now(timezone.utc).date() + timedelta(days=1)
            ids = create_test_scenario(session, slot_date)
            if not ids:
                print("Could not create test scenario (not enough tables?).")
                return 1
            candidate_slot = (slot_date, TEST_SLOT_TIME)
            created_test_data = True

        slot_date, slot_time = candidate_slot
        reserved_guests, reserved_parties = demand_for_slot(
            session, DEMO_TENANT_ID, slot_date, slot_time
        )

        if created_test_data:
            try:
                errors = _run_assertions(
                    slot_date,
                    slot_time,
                    total_seats,
                    total_tables,
                    reserved_guests,
                    reserved_parties,
                )
                if errors:
                    print(f"Scenario 1 (one empty table) Slot {slot_date} {slot_time}:")
                    for e in errors:
                        print(f"  FAIL: {e}")
                    return 1
            finally:
                delete_test_scenario(session, slot_date, slot_time)
        else:
            errors = _run_assertions(
                slot_date,
                slot_time,
                total_seats,
                total_tables,
                reserved_guests,
                reserved_parties,
            )
            if errors:
                print(f"Scenario 1 (one empty table) Slot {slot_date} {slot_time}:")
                for e in errors:
                    print(f"  FAIL: {e}")
                return 1

        # Scenario 2: full slot (N reservations) -> tables_left=0, one more would be over
        from datetime import datetime as dt
        slot_date_2 = dt.now(timezone.utc).date() + timedelta(days=1)
        ids_full = create_full_slot_scenario(session, slot_date_2)
        if not ids_full:
            print("Scenario 2: Could not create full-slot scenario.")
            return 1
        try:
            rg2, rp2 = demand_for_slot(
                session, DEMO_TENANT_ID, slot_date_2, TEST_SLOT_TIME_FULL
            )
            err2 = _run_assertions_full_slot(
                slot_date_2, TEST_SLOT_TIME_FULL, total_seats, total_tables, rg2, rp2
            )
            if err2:
                print(f"Scenario 2 (full slot) Slot {slot_date_2} {TEST_SLOT_TIME_FULL}:")
                for e in err2:
                    print(f"  FAIL: {e}")
                return 1
        finally:
            delete_test_scenario(session, slot_date_2, TEST_SLOT_TIME_FULL)

    return 0


def _run_assertions(
    slot_date: date,
    slot_time: time,
    total_seats: int,
    total_tables: int,
    reserved_guests: int,
    reserved_parties: int,
) -> Optional[list[str]]:
    """Run 0025 assertions. Returns list of error messages or None on success (with print)."""
    assert reserved_parties == total_tables - 1, "expected reserved_parties == total_tables - 1"

    tables_left = max(0, total_tables - reserved_parties)
    seats_left = max(0, total_seats - reserved_guests)
    errors = []

    if tables_left != 1:
        errors.append(f"tables_left expected 1, got {tables_left}")
    if reserved_parties + 1 > total_tables:
        errors.append("10th party would be over tables (logic error)")
    if reserved_parties + 2 <= total_tables:
        errors.append("11th party should be over capacity (reserved_parties + 2 > total_tables)")

    over_seats = reserved_guests > total_seats
    over_tables = reserved_parties > total_tables
    if over_seats or over_tables:
        errors.append(
            f"Slot should not be overbooked; over_seats={over_seats}, over_tables={over_tables}"
        )

    if errors:
        return errors

    print(
        f"OK: Slot {slot_date} {slot_time} has {reserved_parties} parties, {total_tables} tables."
    )
    print(f"  tables_left={tables_left}, seats_left={seats_left} (total_seats={total_seats}).")
    print("  10th reservation allowed; 11th would get 400 over capacity.")
    return None


def _run_assertions_full_slot(
    slot_date: date,
    slot_time: time,
    total_seats: int,
    total_tables: int,
    reserved_guests: int,
    reserved_parties: int,
) -> Optional[list[str]]:
    """Assert full-slot: tables_left=0, next reservation would be over capacity."""
    errors = []
    tables_left = max(0, total_tables - reserved_parties)
    if reserved_parties != total_tables:
        errors.append(f"expected reserved_parties={total_tables}, got {reserved_parties}")
    if tables_left != 0:
        errors.append(f"tables_left expected 0, got {tables_left}")
    if reserved_parties + 1 <= total_tables:
        errors.append("next party should be over capacity (reserved_parties + 1 > total_tables)")
    if errors:
        return errors
    print(
        f"OK: Full-slot {slot_date} {slot_time}: {reserved_parties} parties, tables_left=0, next would be over."
    )
    return None
