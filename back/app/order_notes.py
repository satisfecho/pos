"""Optional free-text notes on orders and line items."""

MAX_ORDER_NOTE_LEN = 500


def normalize_order_note(text: str | None, *, max_len: int = MAX_ORDER_NOTE_LEN) -> str | None:
    """Trim and cap customer/staff order notes; empty strings become None."""
    if text is None or not isinstance(text, str):
        return None
    cleaned = text.strip()
    if not cleaned:
        return None
    return cleaned[:max_len]


def order_notes_equal(a: str | None, b: str | None) -> bool:
    """Compare notes for cart merge / line-item dedup (normalized empty → equal)."""
    return (normalize_order_note(a) or "") == (normalize_order_note(b) or "")
