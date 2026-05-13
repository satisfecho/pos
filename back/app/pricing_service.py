"""
Pure pricing helpers: pour cost, margin, markup, rounding (no I/O).
"""

from __future__ import annotations


def suggest_price(
    cost_per_serving_cents: int,
    *,
    target_pour_cost_pct: float | None = None,
    target_margin_pct: float | None = None,
    target_markup_pct: float | None = None,
    extra_fixed_cents: int = 0,
    waste_pct: float = 0.0,
    rounding_step_cents: int | None = None,
) -> dict:
    """
    Compute a suggested selling price (tax-inclusive convention unchanged).

    Exactly one of target_pour_cost_pct, target_margin_pct, target_markup_pct must be set.
    Rounding is applied last to suggested_price_cents.
    """
    targets = [target_pour_cost_pct, target_margin_pct, target_markup_pct]
    set_count = sum(1 for t in targets if t is not None)
    if set_count != 1:
        raise ValueError("Set exactly one of target_pour_cost_pct, target_margin_pct, target_markup_pct")

    if cost_per_serving_cents < 0:
        raise ValueError("cost_per_serving_cents must be non-negative")
    if extra_fixed_cents < 0:
        raise ValueError("extra_fixed_cents must be non-negative")

    effective_cost = int(round(cost_per_serving_cents * (1.0 + waste_pct / 100.0))) + int(extra_fixed_cents)
    if effective_cost <= 0:
        raise ValueError("Effective cost per serving must be positive after waste and fixed extras")

    if target_pour_cost_pct is not None:
        p = float(target_pour_cost_pct)
        if p <= 0 or p >= 100:
            raise ValueError("target_pour_cost_pct must be between 0 and 100 (exclusive)")
        raw = effective_cost * 100.0 / p
    elif target_margin_pct is not None:
        m = float(target_margin_pct)
        if m < 0 or m >= 100:
            raise ValueError("target_margin_pct must be in [0, 100)")
        raw = effective_cost * 100.0 / (100.0 - m)
    else:
        k = float(target_markup_pct)  # type: ignore[unreachable]
        if k <= -100:
            raise ValueError("target_markup_pct must be greater than -100")
        raw = effective_cost * (1.0 + k / 100.0)

    suggested = _round_price_cents(raw, rounding_step_cents)
    if suggested <= 0:
        raise ValueError("Suggested price rounded to zero; adjust targets or rounding")

    profit = suggested - effective_cost
    pour, margin, markup = _derived_pcts(effective_cost, suggested)

    return {
        "cost_per_serving_cents": effective_cost,
        "suggested_price_cents": suggested,
        "profit_per_serving_cents": profit,
        "pour_cost_pct": pour,
        "margin_pct": margin,
        "markup_pct": markup,
    }


def _round_price_cents(raw: float, rounding_step_cents: int | None) -> int:
    if rounding_step_cents is None or rounding_step_cents <= 0:
        return max(0, int(round(raw)))
    step = int(round(rounding_step_cents))
    if step <= 0:
        return max(0, int(round(raw)))
    return max(0, int(round(raw / step) * step))


def _derived_pcts(effective_cost: int, price: int) -> tuple[float, float, float]:
    if price <= 0:
        return 0.0, 0.0, 0.0
    pour = effective_cost / price * 100.0
    margin = (price - effective_cost) / price * 100.0
    markup = ((price - effective_cost) / effective_cost * 100.0) if effective_cost > 0 else 0.0
    return pour, margin, markup
