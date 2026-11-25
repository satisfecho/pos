"""Unit tests for product customization helpers (issue #50 / #451)."""

from types import SimpleNamespace

from app.models import ProductQuestionType
from app.product_customization import (
    choice_options_allowed_list,
    choice_options_delta_map,
    choice_options_entries,
    choice_options_is_multi,
    compute_customization_price_delta_cents,
    customization_dicts_equal,
    format_choice_label_for_summary,
    parse_choice_option_entry,
)


def test_choice_options_single_list():
    assert choice_options_is_multi(["a", "b"]) is False
    assert choice_options_allowed_list(["a", "b"]) == ["a", "b"]


def test_choice_options_multi_dict():
    opts = {"choices": ["x", "y"], "multi": True}
    assert choice_options_is_multi(opts) is True
    assert choice_options_allowed_list(opts) == ["x", "y"]


def test_choice_options_priced_entries():
    opts = {
        "choices": [
            "Olives",
            {"label": "Extra cheese", "price_delta_cents": 100},
            {"label": "No onion", "price_delta_cents": -50},
        ],
        "multi": True,
    }
    assert choice_options_allowed_list(opts) == ["Olives", "Extra cheese", "No onion"]
    assert choice_options_delta_map(opts) == {
        "Olives": 0,
        "Extra cheese": 100,
        "No onion": -50,
    }
    assert choice_options_entries(opts)[1] == ("Extra cheese", 100)


def test_parse_choice_option_entry_string_and_dict():
    assert parse_choice_option_entry("Plain") == ("Plain", 0)
    assert parse_choice_option_entry({"label": "X", "price_delta_cents": 25}) == ("X", 25)


def test_format_choice_label_for_summary():
    assert format_choice_label_for_summary("Olives", 0) == "Olives"
    assert format_choice_label_for_summary("Extra cheese", 100) == "Extra cheese (+1.00)"
    assert format_choice_label_for_summary("No onion", -50) == "No onion (-0.50)"


def test_compute_customization_price_delta_stacks_multi():
    q = SimpleNamespace(
        id=7,
        type=ProductQuestionType.choice,
        options={
            "choices": [
                {"label": "A", "price_delta_cents": 100},
                {"label": "B", "price_delta_cents": 50},
            ],
            "multi": True,
        },
    )
    assert compute_customization_price_delta_cents([q], {"7": ["A", "B"]}) == 150
    assert compute_customization_price_delta_cents([q], {"7": "A"}) == 100
    assert compute_customization_price_delta_cents([q], None) == 0


def test_customization_dicts_equal_multi_order():
    a = {"1": ["b", "a"]}
    b = {"1": ["a", "b"]}
    assert customization_dicts_equal(a, b) is True


def test_customization_dicts_equal_mismatch():
    assert customization_dicts_equal({"1": "x"}, {"1": "y"}) is False
