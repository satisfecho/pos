"""
Validate and normalize order line modifiers (remove / add / substitute) for kitchen and invoices.
"""

from __future__ import annotations

from typing import Any

from fastapi import HTTPException

MAX_MODIFIER_LABEL_LEN = 120
MAX_MODIFIER_LIST = 24
MAX_SUBSTITUTE_PAIRS = 12
MAX_SUMMARY_LEN = 1024


def _clean_label(s: str) -> str:
    t = str(s).strip()
    if len(t) > MAX_MODIFIER_LABEL_LEN:
        raise HTTPException(
            status_code=422,
            detail=f"Modifier label too long (max {MAX_MODIFIER_LABEL_LEN} characters)",
        )
    return t


def _unique_sorted(labels: list[str]) -> list[str]:
    seen: set[str] = set()
    out: list[str] = []
    for x in labels:
        if x not in seen:
            seen.add(x)
            out.append(x)
    out.sort()
    return out


def validate_and_normalize_line_modifiers(
    raw: Any | None,
) -> tuple[dict[str, Any] | None, str | None]:
    """
    Accept optional dict with keys remove, add, substitute.
    Returns normalized JSON and a short English summary for tickets/invoices.
    """
    if raw is None:
        return None, None
    if not isinstance(raw, dict):
        raise HTTPException(status_code=422, detail="line_modifiers must be an object")

    unknown = [k for k in raw if k not in ("remove", "add", "substitute")]
    if unknown:
        raise HTTPException(
            status_code=422,
            detail=f"Unknown line_modifiers key(s): {', '.join(unknown)}",
        )

    remove_raw = raw.get("remove")
    add_raw = raw.get("add")
    sub_raw = raw.get("substitute")

    remove: list[str] = []
    if remove_raw is not None:
        if not isinstance(remove_raw, list):
            raise HTTPException(status_code=422, detail="line_modifiers.remove must be a list")
        if len(remove_raw) > MAX_MODIFIER_LIST:
            raise HTTPException(status_code=422, detail="Too many remove modifiers")
        remove = _unique_sorted([_clean_label(x) for x in remove_raw if str(x).strip()])

    add: list[str] = []
    if add_raw is not None:
        if not isinstance(add_raw, list):
            raise HTTPException(status_code=422, detail="line_modifiers.add must be a list")
        if len(add_raw) > MAX_MODIFIER_LIST:
            raise HTTPException(status_code=422, detail="Too many add modifiers")
        add = _unique_sorted([_clean_label(x) for x in add_raw if str(x).strip()])

    substitute: list[dict[str, str]] = []
    if sub_raw is not None:
        if not isinstance(sub_raw, list):
            raise HTTPException(status_code=422, detail="line_modifiers.substitute must be a list")
        if len(sub_raw) > MAX_SUBSTITUTE_PAIRS:
            raise HTTPException(status_code=422, detail="Too many substitute pairs")
        pairs: list[tuple[str, str]] = []
        for i, row in enumerate(sub_raw):
            if not isinstance(row, dict):
                raise HTTPException(
                    status_code=422,
                    detail=f"line_modifiers.substitute[{i}] must be an object",
                )
            fr = row.get("from")
            to = row.get("to")
            if fr is None or to is None:
                raise HTTPException(
                    status_code=422,
                    detail=f'line_modifiers.substitute[{i}] needs "from" and "to"',
                )
            a = _clean_label(fr)
            b = _clean_label(to)
            if not a or not b:
                raise HTTPException(
                    status_code=422,
                    detail=f"line_modifiers.substitute[{i}] has empty from/to",
                )
            pairs.append((a, b))
        pairs.sort(key=lambda t: (t[0], t[1]))
        substitute = [{"from": a, "to": b} for a, b in pairs]

    if not remove and not add and not substitute:
        return None, None

    normalized: dict[str, Any] = {}
    if remove:
        normalized["remove"] = remove
    if add:
        normalized["add"] = add
    if substitute:
        normalized["substitute"] = substitute

    parts: list[str] = []
    if remove:
        parts.append("Remove: " + ", ".join(remove))
    if add:
        parts.append("Add: " + ", ".join(add))
    if substitute:
        parts.append(
            "Sub: "
            + ", ".join(f"{p['from']}→{p['to']}" for p in substitute)
        )
    summary = " · ".join(parts)
    if len(summary) > MAX_SUMMARY_LEN:
        summary = summary[: MAX_SUMMARY_LEN - 3] + "..."
    return normalized, summary


def line_modifiers_equal(a: dict[str, Any] | None, b: dict[str, Any] | None) -> bool:
    """Equality for merge logic (normalized dicts)."""
    if not a and not b:
        return True
    if not a or not b:
        return False
    if set(a.keys()) != set(b.keys()):
        return False
    for k in a:
        va, vb = a[k], b[k]
        if k == "substitute":
            if not isinstance(va, list) or not isinstance(vb, list):
                return False
            if len(va) != len(vb):
                return False
            for x, y in zip(va, vb, strict=True):
                if not isinstance(x, dict) or not isinstance(y, dict):
                    return False
                if x.get("from") != y.get("from") or x.get("to") != y.get("to"):
                    return False
        else:
            if not isinstance(va, list) or not isinstance(vb, list):
                return False
            if sorted(va) != sorted(vb):
                return False
    return True
