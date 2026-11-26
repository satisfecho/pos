"""LiveKit reservation agent helpers (token mint + tenant allowlist).

Secrets stay in config.env. The optional LiveKit Agents worker lives under
``back/livekit_reservation_agent/`` and calls existing public reservation APIs;
this module only supports guest room join when LiveKit is configured.
"""

from __future__ import annotations

import time
import uuid
from typing import Iterable

from jose import jwt

from .settings import settings


def parse_tenant_id_allowlist(raw: str | None) -> set[int]:
    """Parse comma-separated tenant ids. Empty / whitespace → empty set (feature off)."""
    if not raw or not str(raw).strip():
        return set()
    out: set[int] = set()
    for part in str(raw).split(","):
        p = part.strip()
        if not p:
            continue
        try:
            out.add(int(p))
        except ValueError:
            continue
    return out


def livekit_reservation_agent_configured() -> bool:
    """True when URL + API key/secret are set (worker / token mint can run)."""
    return bool(
        (settings.livekit_url or "").strip()
        and (settings.livekit_api_key or "").strip()
        and (settings.livekit_api_secret or "").strip()
    )


def livekit_reservation_agent_enabled_for_tenant(tenant_id: int) -> bool:
    """Pilot allowlist: tenant must be listed and LiveKit credentials present."""
    if not livekit_reservation_agent_configured():
        return False
    allowed = parse_tenant_id_allowlist(settings.livekit_reservation_agent_tenant_ids)
    return tenant_id in allowed


def mint_livekit_guest_token(
    *,
    room_name: str,
    identity: str,
    name: str = "Guest",
    ttl_seconds: int = 3600,
) -> str:
    """Mint a LiveKit access token (HS256) for a guest to join ``room_name``.

    Uses python-jose (already a backend dependency). Does not require the
    ``livekit`` / ``livekit-api`` packages in the main API image.
    """
    api_key = (settings.livekit_api_key or "").strip()
    api_secret = (settings.livekit_api_secret or "").strip()
    if not api_key or not api_secret:
        raise ValueError("LiveKit API key/secret not configured")

    now = int(time.time())
    payload = {
        "iss": api_key,
        "sub": identity,
        "name": name,
        "nbf": now - 10,
        "exp": now + max(60, int(ttl_seconds)),
        "video": {
            "roomJoin": True,
            "room": room_name,
            "canPublish": True,
            "canSubscribe": True,
            "canPublishData": True,
        },
    }
    return jwt.encode(payload, api_secret, algorithm="HS256")


def new_reservation_agent_room_name(tenant_id: int) -> str:
    """Stable-ish unique room id: ``res-agent-{tenant_id}-{uuid}``."""
    return f"res-agent-{tenant_id}-{uuid.uuid4().hex[:12]}"


def guest_identity_for_room(room_name: str) -> str:
    return f"guest-{room_name}"


def summarize_allowlist(ids: Iterable[int]) -> list[int]:
    return sorted({int(i) for i in ids})
