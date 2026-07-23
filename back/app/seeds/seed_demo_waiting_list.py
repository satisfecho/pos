"""
Seed demo waiting-list entries for tenant 1 so the staff Waitlist tab and
public /waitlist/1 show sample queue data after deploy or demo reset.

Idempotent: runs only when tenant 1 has no waiting_list_entry rows.
Does not delete or change existing entries (reset_demo_data clears first).

Usage:
  docker compose exec back python -m app.seeds.seed_demo_waiting_list
  cd back && python -m app.seeds.seed_demo_waiting_list
"""

from datetime import datetime, timedelta, timezone

from sqlmodel import Session, select

from app.db import engine
from app.models import Tenant, WaitingListEntry, WaitingListStatus

DEMO_TENANT_ID = 1

# Small mix for sales/staff demos: mostly waiting + one notified
DEMO_ENTRIES = [
    ("Ana Ruiz", "+34 612345001", 2, WaitingListStatus.waiting, None),
    ("Jonas Berg", "+49 1512345002", 4, WaitingListStatus.waiting, None),
    ("Claire Dupont", "+33 612345003", 3, WaitingListStatus.waiting, None),
    ("Marco Bianchi", "+39 312345004", 2, WaitingListStatus.notified, 8),
]


def run() -> None:
    with Session(engine) as session:
        existing = session.exec(
            select(WaitingListEntry.id).where(WaitingListEntry.tenant_id == DEMO_TENANT_ID).limit(1)
        ).first()
        if existing is not None:
            print("Tenant 1 already has waiting-list entries. Skipping demo waiting-list seed.")
            return

        tenant = session.get(Tenant, DEMO_TENANT_ID)
        if not tenant:
            print("Tenant 1 not found. Run bootstrap_demo first.")
            return

        now = datetime.now(timezone.utc)
        for name, phone, party_size, status, notified_mins_ago in DEMO_ENTRIES:
            notified_at = None
            if status == WaitingListStatus.notified and notified_mins_ago is not None:
                notified_at = now - timedelta(minutes=notified_mins_ago)
            session.add(
                WaitingListEntry(
                    tenant_id=DEMO_TENANT_ID,
                    customer_name=name,
                    customer_phone=phone,
                    party_size=party_size,
                    status=status,
                    notified_at=notified_at,
                    created_at=now - timedelta(minutes=15 + party_size),
                    updated_at=now,
                )
            )
        session.commit()
        print(
            f"Tenant {DEMO_TENANT_ID}: seeded {len(DEMO_ENTRIES)} waiting-list entries "
            f"({sum(1 for e in DEMO_ENTRIES if e[3] == WaitingListStatus.waiting)} waiting, "
            f"{sum(1 for e in DEMO_ENTRIES if e[3] == WaitingListStatus.notified)} notified)."
        )


if __name__ == "__main__":
    run()
