"""
Seed demo reservations for tenant 1 so Reports (Informes) show reservation counts and by-source breakdown.

Creates reservations spread over the last ±90 days (more in last 30) and a few upcoming (next 14 days).
Mix of statuses: finished, booked, and a few seated/cancelled. Mix of public (token set) vs staff (no token).

Idempotent: runs only when tenant 1 has no reservations (clean deployment). Does not delete or change existing.

Usage:
  docker compose exec back python -m app.seeds.seed_demo_reservations
  cd back && python -m app.seeds.seed_demo_reservations
"""

import random
from datetime import date, timedelta, time, timezone
from uuid import uuid4

from sqlmodel import Session, select

from app.db import engine
from app.models import Reservation, ReservationStatus, Table, Tenant

DEMO_TENANT_ID = 1
DAYS_BACK = 90
DAYS_FORWARD = 14
NUM_PAST_RESERVATIONS = 25
NUM_UPCOMING_RESERVATIONS = 5
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
        created = 0

        for i in range(NUM_PAST_RESERVATIONS + NUM_UPCOMING_RESERVATIONS):
            is_upcoming = i >= NUM_PAST_RESERVATIONS
            rdate = _random_date_in_range(DAYS_BACK, DAYS_FORWARD)
            rtime = _random_time_slot()
            # Past reservations: mostly finished, some cancelled; upcoming: booked
            if rdate < date.today():
                status = random.choices(
                    [ReservationStatus.finished, ReservationStatus.finished, ReservationStatus.cancelled],
                    weights=[85, 10, 5],
                )[0]
                table_id = random.choice(table_ids) if status == ReservationStatus.finished else None
            else:
                status = ReservationStatus.booked
                table_id = None

            use_token = random.random() < PUBLIC_FRACTION
            token = str(uuid4()) if use_token else None
            customer_name = random.choice(DEMO_NAMES)
            customer_phone = random.choice(DEMO_PHONE_PREFIXES) + str(random.randint(1000000, 9999999))

            res = Reservation(
                tenant_id=DEMO_TENANT_ID,
                customer_name=customer_name,
                customer_phone=customer_phone,
                reservation_date=rdate,
                reservation_time=rtime,
                party_size=random.randint(1, 6),
                status=status,
                table_id=table_id,
                token=token,
            )
            session.add(res)
            created += 1

        session.commit()
        print(f"Tenant {DEMO_TENANT_ID}: created {created} demo reservations for Reports.")

    print("Done.")


if __name__ == "__main__":
    run()
