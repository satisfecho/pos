"""
Create or update the platform operator user (SaaS admin, no tenant).

Usage (from repo root, with backend in Docker):
  docker compose exec back python -m app.seeds.ensure_platform_operator

Required env (in config.env or shell):
  PLATFORM_OPERATOR_EMAIL=ops@example.com
  PLATFORM_OPERATOR_PASSWORD=your-secure-password
"""

import os
import sys

from sqlmodel import Session, select

from app.db import engine
from app.models import User, UserRole
from app import security


def run() -> None:
    email = os.environ.get("PLATFORM_OPERATOR_EMAIL", "").strip()
    password = os.environ.get("PLATFORM_OPERATOR_PASSWORD", "").strip()
    if not email or not password:
        print(
            "Set PLATFORM_OPERATOR_EMAIL and PLATFORM_OPERATOR_PASSWORD in config.env.",
            file=sys.stderr,
        )
        sys.exit(1)

    with Session(engine) as session:
        user = session.exec(select(User).where(User.email == email)).first()
        hashed = security.get_password_hash(password)
        if user:
            user.role = UserRole.platform_operator
            user.tenant_id = None
            user.provider_id = None
            user.hashed_password = hashed
            session.add(user)
            session.commit()
            print(f"Updated platform operator: {email}")
            return

        user = User(
            email=email,
            hashed_password=hashed,
            full_name="Platform operator",
            role=UserRole.platform_operator,
            tenant_id=None,
            provider_id=None,
        )
        session.add(user)
        session.commit()
        print(f"Created platform operator: {email}")


if __name__ == "__main__":
    run()
