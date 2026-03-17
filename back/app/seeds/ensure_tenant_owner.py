"""
Ensure a given user in a tenant has the owner role. Default: ralf@roeber.de in tenant 1.

Usage (from repo root, with backend in Docker):
  docker compose exec back python -m app.seeds.ensure_tenant_owner

Optional env:
  USER_EMAIL=ralf@roeber.de  (default)
  TENANT_ID=1               (default)
"""

import os
import sys

from sqlmodel import Session, select

from app.db import engine
from app.models import User, UserRole


def run() -> None:
    email = os.environ.get("USER_EMAIL", "ralf@roeber.de").strip()
    try:
        tenant_id = int(os.environ.get("TENANT_ID", "1"))
    except ValueError:
        tenant_id = 1

    with Session(engine) as session:
        user = session.exec(
            select(User).where(User.email == email).where(User.tenant_id == tenant_id)
        ).first()
        if not user:
            print(
                f"User not found: email={email}, tenant_id={tenant_id}.",
                file=sys.stderr,
            )
            sys.exit(1)
        if user.role == UserRole.owner:
            print(f"OK: {email} (tenant_id={tenant_id}) already has role owner.")
            return
        user.role = UserRole.owner
        session.add(user)
        session.commit()
        print(f"Updated: {email} (tenant_id={tenant_id}) set to role owner.")


if __name__ == "__main__":
    run()
