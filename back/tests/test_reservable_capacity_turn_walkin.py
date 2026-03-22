"""
Unit tests for reservation pool capacity: average turn time and walk-in table buffer.

Run from repo root:
  PYTHONPATH=back python3 -m pytest back/tests/test_reservable_capacity_turn_walkin.py -v
Or from back/:
  PYTHONPATH=. python3 -m pytest tests/test_reservable_capacity_turn_walkin.py -v
"""

import os
import sys
import unittest
from datetime import date, datetime, time, timedelta, timezone

from sqlalchemy.pool import StaticPool
from sqlmodel import Session, SQLModel, create_engine, select

_back = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if _back not in sys.path:
    sys.path.insert(0, _back)

from app import models  # noqa: E402
from app.main import _reservable_capacity_for_tenant  # noqa: E402


class TestReservableCapacityTurnWalkin(unittest.TestCase):
    def setUp(self):
        self.engine = create_engine(
            "sqlite://",
            connect_args={"check_same_thread": False},
            poolclass=StaticPool,
        )
        # Only tables this test needs (full metadata uses PostgreSQL JSONB, unsupported on SQLite).
        SQLModel.metadata.create_all(
            self.engine,
            tables=[
                models.Tenant.__table__,
                models.Floor.__table__,
                models.Table.__table__,
                models.Reservation.__table__,
                models.Order.__table__,
            ],
        )
        self.session = Session(self.engine)

        self.tenant = models.Tenant(
            name="Cap Test",
            timezone="UTC",
            reservation_average_table_turn_minutes=60,
            reservation_walk_in_tables_reserved=0,
        )
        self.session.add(self.tenant)
        self.session.commit()
        self.session.refresh(self.tenant)

        # Three tables: two small, one large (walk-in drops smallest first)
        for name, seats in [("A", 2), ("B", 2), ("C", 6)]:
            t = models.Table(name=name, tenant_id=self.tenant.id, seat_count=seats)
            self.session.add(t)
        self.session.commit()
        self.tables = self.session.exec(
            select(models.Table).where(models.Table.tenant_id == self.tenant.id).order_by(models.Table.id)
        ).all()

    def tearDown(self):
        self.session.close()

    def test_walk_in_reserves_smallest_tables_first(self):
        self.tenant.reservation_walk_in_tables_reserved = 1
        self.session.add(self.tenant)
        self.session.commit()
        d = date(2030, 6, 15)
        st = time(12, 0)
        seats, n_tables = _reservable_capacity_for_tenant(
            self.session, self.tenant.id, d, self.tenant, st
        )
        # Smallest table withheld; remaining = one 2-top + one 6-top
        self.assertEqual(n_tables, 2)
        self.assertEqual(seats, 8)

        self.tenant.reservation_walk_in_tables_reserved = 2
        self.session.add(self.tenant)
        self.session.commit()
        seats2, n2 = _reservable_capacity_for_tenant(
            self.session, self.tenant.id, d, self.tenant, st
        )
        self.assertEqual((n2, seats2), (1, 6))

    def test_walk_in_can_zero_out_pool(self):
        self.tenant.reservation_walk_in_tables_reserved = 10
        self.session.add(self.tenant)
        self.session.commit()
        d = date(2030, 6, 15)
        st = time(12, 0)
        seats, n_tables = _reservable_capacity_for_tenant(
            self.session, self.tenant.id, d, self.tenant, st
        )
        self.assertEqual((seats, n_tables), (0, 0))

    def test_turn_time_frees_table_after_window(self):
        """Seated 90m ago with 60m turn → not busy at 'now' slot."""
        tbl = self.tables[0]
        r = models.Reservation(
            tenant_id=self.tenant.id,
            customer_name="x",
            customer_phone="1",
            reservation_date=date(2030, 6, 10),
            reservation_time=time(18, 0),
            party_size=2,
            status=models.ReservationStatus.seated,
            table_id=tbl.id,
            seated_at=datetime(2030, 6, 10, 17, 0, tzinfo=timezone.utc),
        )
        self.session.add(r)
        self.session.commit()

        now = datetime(2030, 6, 10, 18, 30, tzinfo=timezone.utc)
        seats, n_tables = _reservable_capacity_for_tenant(
            self.session,
            self.tenant.id,
            date(2030, 6, 10),
            self.tenant,
            time(18, 30),
            _now_utc=now,
        )
        self.assertEqual(n_tables, 3)
        self.assertEqual(seats, 10)

    def test_turn_time_blocks_slot_inside_window(self):
        tbl = self.tables[0]
        r = models.Reservation(
            tenant_id=self.tenant.id,
            customer_name="x",
            customer_phone="1",
            reservation_date=date(2030, 6, 10),
            reservation_time=time(18, 0),
            party_size=2,
            status=models.ReservationStatus.seated,
            table_id=tbl.id,
            seated_at=datetime(2030, 6, 10, 18, 0, tzinfo=timezone.utc),
        )
        self.session.add(r)
        self.session.commit()

        now = datetime(2030, 6, 10, 18, 15, tzinfo=timezone.utc)
        seats, n_tables = _reservable_capacity_for_tenant(
            self.session,
            self.tenant.id,
            date(2030, 6, 10),
            self.tenant,
            time(18, 30),
            _now_utc=now,
        )
        # One table still in [18:00, 19:00)
        self.assertEqual(n_tables, 2)
        self.assertEqual(seats, 8)

    def test_no_turn_same_day_blocks_if_seated(self):
        self.tenant.reservation_average_table_turn_minutes = None
        self.session.add(self.tenant)
        self.session.commit()
        tbl = self.tables[0]
        r = models.Reservation(
            tenant_id=self.tenant.id,
            customer_name="x",
            customer_phone="1",
            reservation_date=date(2030, 6, 10),
            reservation_time=time(18, 0),
            party_size=2,
            status=models.ReservationStatus.seated,
            table_id=tbl.id,
        )
        self.session.add(r)
        self.session.commit()
        now = datetime(2030, 6, 10, 8, 0, tzinfo=timezone.utc)
        seats, n_tables = _reservable_capacity_for_tenant(
            self.session,
            self.tenant.id,
            date(2030, 6, 10),
            self.tenant,
            time(22, 0),
            _now_utc=now,
        )
        self.assertEqual(n_tables, 2)
        self.assertEqual(seats, 8)


if __name__ == "__main__":
    unittest.main()
