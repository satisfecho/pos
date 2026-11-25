"""Unit tests for kitchen SLA expected-prep helpers (#450 slice 3)."""

from app.kitchen_sla import (
    aggregate_ticket_expected_minutes,
    apply_settings_body,
    parse_category_prep_map,
    resolve_line_expected_minutes,
    resolve_sla_thresholds_minutes,
    settings_dict_from_tenant,
)


class _FakeTenant:
    kitchen_display_timer_yellow_minutes = 5
    kitchen_display_timer_orange_minutes = 10
    kitchen_display_timer_red_minutes = 15
    kitchen_sla_threshold_mode = "absolute"
    kitchen_sla_ticket_aggregation = "max_line"
    kitchen_display_timer_yellow_percent = 70
    kitchen_display_timer_orange_percent = 90
    kitchen_display_timer_red_percent = 100
    kitchen_expected_prep_by_category = None


def test_resolve_line_product_override_wins():
    assert (
        resolve_line_expected_minutes(
            product_expected=12,
            category="Main Course",
            category_map={"Main Course": 20},
        )
        == 12
    )


def test_resolve_line_category_fallback():
    assert (
        resolve_line_expected_minutes(
            product_expected=None,
            category="Starters",
            category_map={"Starters": 8},
        )
        == 8
    )


def test_aggregate_max_line_default():
    lines = [
        {"expected_prep_minutes": 5, "category": "Starters"},
        {"expected_prep_minutes": 15, "category": "Main Course"},
    ]
    assert aggregate_ticket_expected_minutes(lines, "max_line") == 15


def test_aggregate_sum():
    lines = [
        {"expected_prep_minutes": 5, "category": "Starters"},
        {"expected_prep_minutes": 15, "category": "Main Course"},
    ]
    assert aggregate_ticket_expected_minutes(lines, "sum") == 20


def test_aggregate_primary_category():
    lines = [
        {"expected_prep_minutes": 5, "category": "Starters"},
        {"expected_prep_minutes": 8, "category": "Starters"},
        {"expected_prep_minutes": 12, "category": "Main Course"},
    ]
    # Main Course max (12) beats Starters max (8)
    assert aggregate_ticket_expected_minutes(lines, "primary_category") == 12


def test_thresholds_fallback_without_expected():
    assert resolve_sla_thresholds_minutes(
        ticket_expected=None,
        threshold_mode="percent_of_expected",
        yellow_minutes=5,
        orange_minutes=10,
        red_minutes=15,
    ) == (5, 10, 15)


def test_thresholds_percent_of_expected():
    y, o, r = resolve_sla_thresholds_minutes(
        ticket_expected=20,
        threshold_mode="percent_of_expected",
        yellow_minutes=5,
        orange_minutes=10,
        red_minutes=15,
        yellow_percent=50,
        orange_percent=75,
        red_percent=100,
    )
    assert (y, o, r) == (10, 15, 20)


def test_thresholds_absolute_with_expected():
    y, o, r = resolve_sla_thresholds_minutes(
        ticket_expected=12,
        threshold_mode="absolute",
        yellow_minutes=5,
        orange_minutes=10,
        red_minutes=15,
    )
    # red = expected; yellow/orange clamped to red and ordered
    assert r == 12
    assert y == 5
    assert o == 10


def test_parse_and_settings_roundtrip():
    t = _FakeTenant()
    apply_settings_body(
        t,
        {
            "sla_threshold_mode": "percent_of_expected",
            "sla_ticket_aggregation": "sum",
            "yellow_percent": 60,
            "expected_prep_by_category": {"Main Course": 18, "bad": "x"},
        },
    )
    d = settings_dict_from_tenant(t)
    assert d["sla_threshold_mode"] == "percent_of_expected"
    assert d["sla_ticket_aggregation"] == "sum"
    assert d["yellow_percent"] == 60
    assert d["expected_prep_by_category"] == {"Main Course": 18}
    assert parse_category_prep_map({"Starters": 7}) == {"Starters": 7}
