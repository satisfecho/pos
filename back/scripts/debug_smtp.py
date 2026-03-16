#!/usr/bin/env python3
"""
Minimal SMTP debug script. Parses config.env so passwords with apostrophes work.
If the password contains an apostrophe, use double quotes in config.env:
  SMTP_PASSWORD="your'password"
Run from repo root:  PYTHONPATH=back python back/scripts/debug_smtp.py [to_email]
Or from back:        python scripts/debug_smtp.py [to_email]
"""
import os
import re
import sys
from pathlib import Path

# Resolve config.env (repo root when on host; back dir when in container)
_repo_root = Path(__file__).resolve().parents[2]
_config = _repo_root / "config.env"
if not _config.exists():
    _config = Path(__file__).resolve().parents[1] / "config.env"  # back/config.env in container
if not _config.exists():
    _config = Path.cwd() / "config.env"
if not _config.exists():
    print("config.env not found", file=sys.stderr)
    sys.exit(1)

# Parse config.env: key=value with double-quoted values (apostrophe-safe)
def parse_env(path):
    out = {}
    raw = path.read_text(encoding="utf-8")
    for line in raw.splitlines():
        line = line.strip()
        if not line or line.startswith("#"):
            continue
        m = re.match(r"([A-Za-z_][A-Za-z0-9_]*)=(.*)", line)
        if not m:
            continue
        key, rest = m.group(1), m.group(2).strip()
        if rest.startswith('"'):
            end = 1
            while end < len(rest):
                i = rest.find('"', end)
                if i == -1:
                    break
                if i > 0 and rest[i - 1] != "\\":
                    out[key] = rest[1:i].replace('\\"', '"')
                    break
                end = i + 1
            else:
                out[key] = rest[1:].replace('\\"', '"')
        elif rest.startswith("'"):
            end = 1
            while end < len(rest):
                i = rest.find("'", end)
                if i == -1:
                    break
                if i > 0 and rest[i - 1] != "\\":
                    out[key] = rest[1:i].replace("\\'", "'")
                    break
                end = i + 1
            else:
                out[key] = rest[1:].replace("\\'", "'")
        else:
            out[key] = rest.strip()
    return out

env = parse_env(_config)
os.environ.update(env)

# Now import app (settings will read from env)
_app_dir = _repo_root / "back" if (_repo_root / "back").exists() else _config.parent
sys.path.insert(0, str(_app_dir))
import asyncio
from app.email_service import test_smtp_connection, send_email
from app.settings import settings

async def main():
    to = sys.argv[1] if len(sys.argv) > 1 else None
    print("SMTP_HOST:", settings.smtp_host)
    print("SMTP_PORT:", settings.smtp_port)
    print("SMTP_USER:", settings.smtp_user)
    print("SMTP_PASSWORD length:", len(settings.smtp_password or ""), "(first 2 chars:", repr((settings.smtp_password or "")[:2]) + ")")
    print("EMAIL_FROM:", settings.email_from)
    print()
    print("Testing connection...")
    result = await test_smtp_connection()
    print(result.get("message", result))
    if not result.get("success"):
        return 1
    if to:
        print("Sending to", to, "...")
        ok = await send_email(to_email=to, subject="POS2 SMTP test", html_content="<p>Test.</p>", text_content="Test.")
        print("Sent:", ok)
        return 0 if ok else 1
    return 0

sys.exit(asyncio.run(main()))
