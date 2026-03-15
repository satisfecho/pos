"""
Set a user's password (e.g. to match dev). Reads email and password from env.

Usage (on server):
  NEW_PASSWORD='WbRS%2026!' USER_EMAIL='u@x.com' docker compose exec -T back python -m app.seeds.set_user_password

If USER_EMAIL is omitted, updates the first user (by id).
"""

import os
import sys

from sqlmodel import Session, select

from app.db import engine
from app.models import User
from app.security import get_password_hash


def run() -> None:
    password = os.environ.get("NEW_PASSWORD")
    email = os.environ.get("USER_EMAIL")
    if not password:
        print("Set NEW_PASSWORD env var.", file=sys.stderr)
        sys.exit(1)
    with Session(engine) as session:
        if email:
            user = session.exec(select(User).where(User.email == email)).first()
        else:
            user = session.exec(select(User).order_by(User.id)).first()
        if not user:
            print(f"User not found (email={email}).", file=sys.stderr)
            sys.exit(1)
        user.hashed_password = get_password_hash(password)
        session.add(user)
        session.commit()
        print(f"Password updated for user id={user.id} ({user.email}).")


if __name__ == "__main__":
    run()
