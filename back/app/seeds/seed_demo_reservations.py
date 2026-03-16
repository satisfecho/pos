"""
Seed demo reservations for tenant 1 so the Reservations page and Reports (Informes) show meaningful data.

- Guarantees reservations for **today** and **tomorrow** so the Reservations page (default filter = today) shows a full list.
- Adds more over the last ±90 days (and next 14 days) for Reports and variety.
- Mix of statuses: booked, seated, finished, cancelled. Mix of public (token) vs staff (no token).

Idempotent: runs only when tenant 1 has no reservations (clean deployment). Does not delete or change existing.

Usage:
  docker compose exec back python -m app.seeds.seed_demo_reservations
  cd back && python -m app.seeds.seed_demo_reservations
"""

import random
from datetime import date, timedelta, time
from uuid import uuid4

from sqlmodel import Session, select

from app.db import engine
from app.models import Reservation, ReservationStatus, Table, Tenant

DEMO_TENANT_ID = 1
DAYS_BACK = 90
DAYS_FORWARD = 14
# Reservations for today so the Reservations page (default filter = today) shows a full list
NUM_TODAY_BOOKED = 3
NUM_TODAY_SEATED = 2
NUM_TODAY_FINISHED = 3
NUM_TODAY_CANCELLED = 1
NUM_TOMORROW_BOOKED = 4
# Past/upcoming spread for Reports and variety
NUM_PAST_RESERVATIONS = 20
NUM_UPCOMING_OTHER = 4
# Fraction with token (public book page) vs no token (staff-created)
PUBLIC_FRACTION = 0.4

DEMO_NAMES = [
    "Maria García", "Hans Müller", "Sophie Martin", "Luca Rossi", "Emma Wilson",
    "Carlos López", "Anna Schmidt", "Pierre Dubois", "Laura Fernández", "Thomas Weber",
]
DEMO_PHONE_PREFIXES = ["+34 6", "+49 1", "+33 6", "+39 3", "+44 7"]


def _random_date_in_range(days_back: int, days_forward: int, bias_last_days: int = 30) -> date:
    """Random date in [today - days_back, today + days_forward], weighted to last 30 days."""
    today = date.today()
    # 60% in last bias_last_days, 40% in rest of past or future
    if random.random() < 0.6:
        day_offset = random.randint(0, min(bias_last_days, days_back))
        return today - timedelta(days=day_offset)
    if random.random() < 0.7:
        day_offset = random.randint(0, days_back)
        return today - timedelta(days=day_offset)
    day_offset = random.randint(0, days_forward)
    return today + timedelta(days=day_offset)


def _random_time_slot() -> time:
    """Typical reservation times: lunch 12–14, dinner 19–21."""
    if random.random() < 0.5:
        hour = random.randint(12, 14)
    else:
        hour = random.randint(19, 21)
    minute = random.choice([0, 15, 30, 45])
    return time(hour, minute, 0)


def _add_reservation(
    session: Session,
    tenant_id: int,
    rdate: date,
    rtime: time,
    party_size: int,
    status: ReservationStatus,
    table_ids: list[int],
    use_public_token: bool,
) -> None:
    table_id = random.choice(table_ids) if status == ReservationStatus.finished or status == ReservationStatus.seated else None
    token = str(uuid4()) if use_public_token else None
    customer_name = random.choice(DEMO_NAMES)
    customer_phone = random.choice(DEMO_PHONE_PREFIXES) + str(random.randint(1000000, 9999999))
    session.add(
        Reservation(
            tenant_id=tenant_id,
            customer_name=customer_name,
            customer_phone=customer_phone,
            reservation_date=rdate,
            reservation_time=rtime,
            party_size=party_size,
            status=status,
            table_id=table_id,
            token=token,
        )
    )


def run() -> None:
    with Session(engine) as session:
        existing = session.exec(
            select(Reservation.id).where(Reservation.tenant_id == DEMO_TENANT_ID).limit(1)
        ).first()
        if existing is not None:
            print("Tenant 1 already has reservations. Skipping demo reservations seed.")
            return

        tenant = session.get(Tenant, DEMO_TENANT_ID)
        if not tenant:
            print("Tenant 1 not found. Run bootstrap_demo first.")
            return

        tables = session.exec(select(Table).where(Table.tenant_id == DEMO_TENANT_ID)).all()
        if not tables:
            print("Tenant 1 has no tables. Run seed_demo_tables first.")
            return

        table_ids = [t.id for t in tables]
        today = date.today()
        tomorrow = today + timedelta(days=1)
        created = 0

        # Fixed time slots for today/tomorrow so the list looks realistic (not all same time)
        time_slots = [
            time(12, 0, 0), time(12, 30, 0), time(13, 0, 0), time(13, 30, 0),
            time(19, 0, 0), time(19, 30, 0), time(20, 0, 0), time(20, 30, 0), time(21, 0, 0),
        ]

        # Today: mix of statuses so Reservations page (default filter = today) shows a full list
        idx = 0
        for _ in range(NUM_TODAY_BOOKED):
            _add_reservation(
                session, DEMO_TENANT_ID, today, time_slots[idx % len(time_slots)],
                random.randint(2, 5), ReservationStatus.booked, table_ids, random.random() < PUBLIC_FRACTION,
            )
            idx += 1
            created += 1
        for _ in range(NUM_TODAY_SEATED):
            _add_reservation(
                session, DEMO_TENANT_ID, today, time_slots[idx % len(time_slots)],
                random.randint(2, 4), ReservationStatus.seated, table_ids, random.random() < PUBLIC_FRACTION,
            )
            idx += 1
            created += 1
        for _ in range(NUM_TODAY_FINISHED):
            _add_reservation(
                session, DEMO_TENANT_ID, today, time_slots[idx % len(time_slots)],
                random.randint(1, 6), ReservationStatus.finished, table_ids, random.random() < PUBLIC_FRACTION,
            )
            idx += 1
            created += 1
        for _ in range(NUM_TODAY_CANCELLED):
            _add_reservation(
                session, DEMO_TENANT_ID, today, time_slots[idx % len(time_slots)],
                random.randint(2, 4), ReservationStatus.cancelled, table_ids, random.random() < PUBLIC_FRACTION,
            )
            idx += 1
            created += 1

        # Tomorrow: booked only
        for i in range(NUM_TOMORROW_BOOKED):
            _add_reservation(
                session, DEMO_TENANT_ID, tomorrow, time_slots[i % len(time_slots)],
                random.randint(2, 6), ReservationStatus.booked, table_ids, random.random() < PUBLIC_FRACTION,
            )
            created += 1

        # Past and other upcoming: spread over ±90 days for Reports and variety
        for i in range(NUM_PAST_RESERVATIONS + NUM_UPCOMING_OTHER):
            rdate = _random_date_in_range(DAYS_BACK, DAYS_FORWARD)
            # Skip today and tomorrow (already added)
            if rdate == today or rdate == tomorrow:
                rdate = today - timedelta(days=random.randint(1, DAYS_BACK))
            rtime = _random_time_slot()
            if rdate < today:
                status = random.choices(
                    [ReservationStatus.finished, ReservationStatus.finished, ReservationStatus.cancelled],
                    weights=[85, 10, 5],
                )[0]
            else:
                status = ReservationStatus.booked
            _add_reservation(
                session, DEMO_TENANT_ID, rdate, rtime, random.randint(1, 6), status, table_ids,
                random.random() < PUBLIC_FRACTION,
            )
            created += 1

        session.commit()
        print(f"Tenant {DEMO_TENANT_ID}: created {created} demo reservations (today, tomorrow, and spread).")

    print("Done.")


if __name__ == "__main__":
    run()
