"""Ephemeral shared draft cart for an activated dine-in table (Redis).

Per-browser session_id remains for attribution. Place-order still posts to the
shared active order (docs/0009). Take-away tables stay local-only.
"""
from __future__ import annotations

import json
import logging
import uuid
from datetime import datetime, timezone
from typing import Any

logger = logging.getLogger(__name__)

CART_TTL_SECONDS = 12 * 3600  # 12 hours
CART_KEY_PREFIX = "table_cart:"


def cart_redis_key(table_id: int) -> str:
    return f"{CART_KEY_PREFIX}{table_id}"


def _empty_cart() -> dict[str, Any]:
    return {"items": [], "updated_at": _now_iso()}


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def load_cart(redis_conn, table_id: int) -> dict[str, Any]:
    """Return cart dict. Empty cart if missing or Redis error."""
    if redis_conn is None:
        return _empty_cart()
    try:
        raw = redis_conn.get(cart_redis_key(table_id))
        if not raw:
            return _empty_cart()
        data = json.loads(raw)
        if not isinstance(data, dict) or not isinstance(data.get("items"), list):
            return _empty_cart()
        return data
    except Exception as e:
        logger.warning("table_cart load failed table_id=%s: %s", table_id, e)
        return _empty_cart()


def save_cart(redis_conn, table_id: int, cart: dict[str, Any]) -> dict[str, Any]:
    cart = dict(cart)
    cart["updated_at"] = _now_iso()
    if redis_conn is None:
        return cart
    try:
        redis_conn.setex(
            cart_redis_key(table_id),
            CART_TTL_SECONDS,
            json.dumps(cart),
        )
    except Exception as e:
        logger.warning("table_cart save failed table_id=%s: %s", table_id, e)
    return cart


def clear_cart(redis_conn, table_id: int) -> None:
    if redis_conn is None:
        return
    try:
        redis_conn.delete(cart_redis_key(table_id))
    except Exception as e:
        logger.warning("table_cart clear failed table_id=%s: %s", table_id, e)


def add_item(
    redis_conn,
    table_id: int,
    *,
    session_id: str,
    customer_name: str | None,
    product_id: int,
    product_name: str,
    price_cents: int,
    quantity: int,
    notes: str | None,
    source: str | None,
    customization_answers: dict | None,
) -> dict[str, Any]:
    """Add or merge a line for this session. Returns updated cart."""
    cart = load_cart(redis_conn, table_id)
    items: list[dict] = list(cart.get("items") or [])
    qty = max(1, int(quantity or 1))
    note = (notes or "").strip()
    answers = customization_answers or {}

    def _same_line(it: dict) -> bool:
        return (
            it.get("session_id") == session_id
            and it.get("product_id") == product_id
            and (it.get("source") or None) == (source or None)
            and (it.get("notes") or "").strip() == note
            and (it.get("customization_answers") or {}) == answers
        )

    for it in items:
        if _same_line(it):
            it["quantity"] = int(it.get("quantity") or 0) + qty
            if customer_name:
                it["customer_name"] = customer_name
            cart["items"] = items
            return save_cart(redis_conn, table_id, cart)

    line = {
        "line_id": str(uuid.uuid4()),
        "session_id": session_id,
        "customer_name": customer_name or None,
        "product_id": product_id,
        "product_name": product_name,
        "price_cents": int(price_cents),
        "quantity": qty,
        "notes": note or None,
        "source": source or None,
        "customization_answers": answers if answers else None,
    }
    items.append(line)
    cart["items"] = items
    return save_cart(redis_conn, table_id, cart)


def update_item(
    redis_conn,
    table_id: int,
    line_id: str,
    *,
    session_id: str,
    quantity: int | None = None,
    notes: str | None = None,
) -> dict[str, Any] | None:
    """Update own line. Returns cart, or None if line missing / not owned."""
    cart = load_cart(redis_conn, table_id)
    items: list[dict] = list(cart.get("items") or [])
    found = None
    for it in items:
        if it.get("line_id") == line_id:
            found = it
            break
    if not found:
        return None
    if found.get("session_id") != session_id:
        return None

    if quantity is not None:
        if quantity <= 0:
            items = [i for i in items if i.get("line_id") != line_id]
        else:
            found["quantity"] = int(quantity)
    if notes is not None:
        found["notes"] = notes.strip() or None

    cart["items"] = items
    return save_cart(redis_conn, table_id, cart)


def remove_item(
    redis_conn,
    table_id: int,
    line_id: str,
    *,
    session_id: str,
) -> dict[str, Any] | None:
    cart = load_cart(redis_conn, table_id)
    items: list[dict] = list(cart.get("items") or [])
    target = next((i for i in items if i.get("line_id") == line_id), None)
    if not target:
        return None
    if target.get("session_id") != session_id:
        return None
    cart["items"] = [i for i in items if i.get("line_id") != line_id]
    return save_cart(redis_conn, table_id, cart)


def remove_session_items(redis_conn, table_id: int, session_id: str) -> dict[str, Any]:
    cart = load_cart(redis_conn, table_id)
    items = [i for i in (cart.get("items") or []) if i.get("session_id") != session_id]
    cart["items"] = items
    return save_cart(redis_conn, table_id, cart)
