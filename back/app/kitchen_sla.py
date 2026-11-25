"""Kitchen SLA helpers: expected prep resolution and threshold bands (#450 slice 3)."""

from __future__ import annotations

from typing import Any, Mapping, Sequence

# Canonical product categories (same labels as category_codes.CATEGORY_CODES values).
CANONICAL_CATEGORIES: tuple[str, ...] = (
    "Starters",
    "Main Course",
    "Desserts",
    "Beverages",
    "Sides",
)

SLA_THRESHOLD_MODES = frozenset({"absolute", "percent_of_expected"})
SLA_TICKET_AGGREGATIONS = frozenset({"max_line", "sum", "primary_category"})

DEFAULT_YELLOW_MINUTES = 5
DEFAULT_ORANGE_MINUTES = 10
DEFAULT_RED_MINUTES = 15
DEFAULT_YELLOW_PERCENT = 70
DEFAULT_ORANGE_PERCENT = 90
DEFAULT_RED_PERCENT = 100


def normalize_sla_threshold_mode(raw: str | None) -> str:
    v = (raw or "absolute").strip().lower()
    return v if v in SLA_THRESHOLD_MODES else "absolute"


def normalize_sla_ticket_aggregation(raw: str | None) -> str:
    v = (raw or "max_line").strip().lower()
    return v if v in SLA_TICKET_AGGREGATIONS else "max_line"


def parse_category_prep_map(raw: Any) -> dict[str, int]:
    """Normalize tenant JSON map category -> expected minutes (>= 0)."""
    if not isinstance(raw, Mapping):
        return {}
    out: dict[str, int] = {}
    for key, val in raw.items():
        if key is None:
            continue
        name = str(key).strip()
        if not name:
            continue
        try:
            minutes = int(val)
        except (TypeError, ValueError):
            continue
        if minutes < 0:
            minutes = 0
        out[name] = minutes
    return out


def resolve_line_expected_minutes(
    *,
    product_expected: int | None,
    category: str | None,
    category_map: Mapping[str, int],
) -> int | None:
    """Product override wins; else category default; else None."""
    if product_expected is not None:
        try:
            m = int(product_expected)
        except (TypeError, ValueError):
            m = None
        else:
            if m >= 0:
                return m
    if not category:
        return None
    cat = str(category).strip()
    if cat in category_map:
        return int(category_map[cat])
    # Case-insensitive fallback
    lower = cat.lower()
    for k, v in category_map.items():
        if str(k).lower() == lower:
            return int(v)
    return None


def aggregate_ticket_expected_minutes(
    lines: Sequence[Mapping[str, Any]],
    aggregation: str,
) -> int | None:
    """
    Aggregate per-line expected minutes into one ticket expected.

    Each line mapping may include:
      - expected_prep_minutes: int | None
      - category: str | None

    Defaults to max_line when aggregation is unknown.
    """
    mode = normalize_sla_ticket_aggregation(aggregation)
    resolved: list[tuple[str | None, int]] = []
    for line in lines:
        exp = line.get("expected_prep_minutes")
        if exp is None:
            continue
        try:
            m = int(exp)
        except (TypeError, ValueError):
            continue
        if m < 0:
            continue
        cat = line.get("category")
        resolved.append((str(cat).strip() if cat else None, m))

    if not resolved:
        return None

    if mode == "sum":
        return sum(m for _, m in resolved)

    if mode == "primary_category":
        # Category whose highest line expected is largest; ticket expected = that max.
        by_cat: dict[str, int] = {}
        uncategorized_max = 0
        for cat, m in resolved:
            if not cat:
                uncategorized_max = max(uncategorized_max, m)
                continue
            by_cat[cat] = max(by_cat.get(cat, 0), m)
        if by_cat:
            primary = max(by_cat.items(), key=lambda kv: kv[1])
            return primary[1]
        return uncategorized_max if uncategorized_max > 0 else None

    # max_line (default)
    return max(m for _, m in resolved)


def resolve_sla_thresholds_minutes(
    *,
    ticket_expected: int | None,
    threshold_mode: str,
    yellow_minutes: int,
    orange_minutes: int,
    red_minutes: int,
    yellow_percent: int = DEFAULT_YELLOW_PERCENT,
    orange_percent: int = DEFAULT_ORANGE_PERCENT,
    red_percent: int = DEFAULT_RED_PERCENT,
) -> tuple[int, int, int]:
    """
    Return (yellow, orange, red) thresholds in minutes for the ticket clock.

    - No expected: flat absolute minutes (safe fallback).
    - percent_of_expected: bands = expected * percent / 100.
    - absolute with expected: overdue (red) = expected; yellow/orange from absolute
      settings clamped to red (starter-vs-main clocks).
    """
    y = max(0, int(yellow_minutes))
    o = max(0, int(orange_minutes))
    r = max(0, int(red_minutes))
    mode = normalize_sla_threshold_mode(threshold_mode)

    if ticket_expected is None or int(ticket_expected) <= 0:
        return _ordered_thresholds(y, o, r)

    e = int(ticket_expected)
    if mode == "percent_of_expected":
        yp = max(0, int(yellow_percent))
        op = max(0, int(orange_percent))
        rp = max(0, int(red_percent))
        y = max(0, int(e * yp / 100))
        o = max(0, int(e * op / 100))
        r = max(0, int(e * rp / 100))
        if r <= 0:
            r = e
        return _ordered_thresholds(y, o, r)

    # absolute + expected: red = expected prep; yellow/orange stay absolute minutes
    r = e
    y = min(y, r) if r > 0 else y
    o = min(o, r) if r > 0 else o
    return _ordered_thresholds(y, o, r)


def _ordered_thresholds(y: int, o: int, r: int) -> tuple[int, int, int]:
    """Ensure yellow <= orange <= red (non-decreasing)."""
    y = max(0, y)
    o = max(y, o)
    r = max(o, r)
    return y, o, r


def settings_dict_from_tenant(tenant: Any) -> dict[str, Any]:
    """Build kitchen-display-settings response including SLA slice-3 fields."""
    cat_map = parse_category_prep_map(
        getattr(tenant, "kitchen_expected_prep_by_category", None)
    )
    return {
        "yellow_minutes": (
            tenant.kitchen_display_timer_yellow_minutes
            if getattr(tenant, "kitchen_display_timer_yellow_minutes", None) is not None
            else DEFAULT_YELLOW_MINUTES
        ),
        "orange_minutes": (
            tenant.kitchen_display_timer_orange_minutes
            if getattr(tenant, "kitchen_display_timer_orange_minutes", None) is not None
            else DEFAULT_ORANGE_MINUTES
        ),
        "red_minutes": (
            tenant.kitchen_display_timer_red_minutes
            if getattr(tenant, "kitchen_display_timer_red_minutes", None) is not None
            else DEFAULT_RED_MINUTES
        ),
        "sla_threshold_mode": normalize_sla_threshold_mode(
            getattr(tenant, "kitchen_sla_threshold_mode", None)
        ),
        "sla_ticket_aggregation": normalize_sla_ticket_aggregation(
            getattr(tenant, "kitchen_sla_ticket_aggregation", None)
        ),
        "yellow_percent": (
            tenant.kitchen_display_timer_yellow_percent
            if getattr(tenant, "kitchen_display_timer_yellow_percent", None) is not None
            else DEFAULT_YELLOW_PERCENT
        ),
        "orange_percent": (
            tenant.kitchen_display_timer_orange_percent
            if getattr(tenant, "kitchen_display_timer_orange_percent", None) is not None
            else DEFAULT_ORANGE_PERCENT
        ),
        "red_percent": (
            tenant.kitchen_display_timer_red_percent
            if getattr(tenant, "kitchen_display_timer_red_percent", None) is not None
            else DEFAULT_RED_PERCENT
        ),
        "expected_prep_by_category": cat_map,
    }


def apply_settings_body(tenant: Any, body: Mapping[str, Any]) -> None:
    """Apply kitchen-display-settings PUT body onto tenant (mutates)."""
    if "yellow_minutes" in body and body["yellow_minutes"] is not None:
        tenant.kitchen_display_timer_yellow_minutes = max(0, int(body["yellow_minutes"]))
    if "orange_minutes" in body and body["orange_minutes"] is not None:
        tenant.kitchen_display_timer_orange_minutes = max(0, int(body["orange_minutes"]))
    if "red_minutes" in body and body["red_minutes"] is not None:
        tenant.kitchen_display_timer_red_minutes = max(0, int(body["red_minutes"]))

    if "sla_threshold_mode" in body and body["sla_threshold_mode"] is not None:
        tenant.kitchen_sla_threshold_mode = normalize_sla_threshold_mode(
            str(body["sla_threshold_mode"])
        )
    if "sla_ticket_aggregation" in body and body["sla_ticket_aggregation"] is not None:
        tenant.kitchen_sla_ticket_aggregation = normalize_sla_ticket_aggregation(
            str(body["sla_ticket_aggregation"])
        )

    if "yellow_percent" in body and body["yellow_percent"] is not None:
        tenant.kitchen_display_timer_yellow_percent = max(0, int(body["yellow_percent"]))
    if "orange_percent" in body and body["orange_percent"] is not None:
        tenant.kitchen_display_timer_orange_percent = max(0, int(body["orange_percent"]))
    if "red_percent" in body and body["red_percent"] is not None:
        tenant.kitchen_display_timer_red_percent = max(0, int(body["red_percent"]))

    if "expected_prep_by_category" in body:
        raw = body["expected_prep_by_category"]
        if raw is None:
            tenant.kitchen_expected_prep_by_category = None
        else:
            tenant.kitchen_expected_prep_by_category = parse_category_prep_map(raw)
