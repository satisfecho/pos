"""Unit tests for product customization helpers (issue #50)."""

from app.product_customization import (
    choice_options_allowed_list,
    choice_options_is_multi,
    customization_dicts_equal,
)


def test_choice_options_single_list():
    assert choice_options_is_multi(["a", "b"]) is False
    assert choice_options_allowed_list(["a", "b"]) == ["a", "b"]


def test_choice_options_multi_dict():
    opts = {"choices": ["x", "y"], "multi": True}
    assert choice_options_is_multi(opts) is True
    assert choice_options_allowed_list(opts) == ["x", "y"]


def test_customization_dicts_equal_multi_order():
    a = {"1": ["b", "a"]}
    b = {"1": ["a", "b"]}
    assert customization_dicts_equal(a, b) is True


def test_customization_dicts_equal_mismatch():
    assert customization_dicts_equal({"1": "x"}, {"1": "y"}) is False
