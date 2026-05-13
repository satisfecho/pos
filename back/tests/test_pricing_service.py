import pytest

from app.pricing_service import suggest_price


def test_requires_exactly_one_target():
    with pytest.raises(ValueError, match="exactly one"):
        suggest_price(100)
    with pytest.raises(ValueError, match="exactly one"):
        suggest_price(100, target_pour_cost_pct=25, target_margin_pct=10)


def test_pour_cost_pct():
    r = suggest_price(100, target_pour_cost_pct=25.0, rounding_step_cents=None)
    assert r["suggested_price_cents"] == 400
    assert r["cost_per_serving_cents"] == 100
    assert r["profit_per_serving_cents"] == 300
    assert abs(r["pour_cost_pct"] - 25.0) < 1e-6


def test_margin_pct_zero():
    r = suggest_price(80, target_margin_pct=0.0, rounding_step_cents=None)
    assert r["suggested_price_cents"] == 80
    assert r["profit_per_serving_cents"] == 0


def test_margin_pct():
    r = suggest_price(75, target_margin_pct=25.0, rounding_step_cents=None)
    assert r["suggested_price_cents"] == 100
    assert r["profit_per_serving_cents"] == 25


def test_markup_pct():
    r = suggest_price(50, target_markup_pct=100.0, rounding_step_cents=None)
    assert r["suggested_price_cents"] == 100
    assert r["markup_pct"] == pytest.approx(100.0)


def test_waste_increases_effective_cost():
    r = suggest_price(100, target_pour_cost_pct=25.0, waste_pct=10.0, rounding_step_cents=None)
    assert r["cost_per_serving_cents"] == 110
    assert r["suggested_price_cents"] == 440


def test_extra_fixed():
    r = suggest_price(100, target_pour_cost_pct=25.0, extra_fixed_cents=40, rounding_step_cents=None)
    assert r["cost_per_serving_cents"] == 140
    assert r["suggested_price_cents"] == 560


def test_rounding_step_applied_last():
    r = suggest_price(100, target_pour_cost_pct=25.0, rounding_step_cents=50)
    assert r["suggested_price_cents"] % 50 == 0
    raw = 100 * 100.0 / 25.0  # 400
    assert r["suggested_price_cents"] == 400
    r2 = suggest_price(33, target_pour_cost_pct=25.0, rounding_step_cents=50)
    assert r2["suggested_price_cents"] % 50 == 0


def test_effective_cost_must_be_positive():
    with pytest.raises(ValueError):
        suggest_price(0, target_pour_cost_pct=25.0)
