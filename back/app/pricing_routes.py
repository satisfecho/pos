"""
Pricing helper API: suggested selling price from recipe cost or container simulator.
"""

from decimal import Decimal
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, Request, Response
from pydantic import BaseModel, Field
from sqlmodel import Session

from .db import get_session
from . import models
from .permissions import Permission, require_permission
from .rate_limits import admin_user_limit
from .inventory_models import UnitOfMeasure, convert_units
from .inventory_service import calculate_product_cost
from .pricing_service import suggest_price

router = APIRouter()


def _resolve_product_cost_basis(
    session: Session,
    product_id: int,
    tenant_id: int,
) -> int:
    """Return cost per unit (one serving) in cents, or raise HTTPException."""
    product = session.get(models.Product, product_id)
    if not product or product.tenant_id != tenant_id:
        raise HTTPException(status_code=404, detail="Product not found")

    cost_data = calculate_product_cost(session, product_id, tenant_id)
    recipe_total = int(cost_data.get("total_cost_cents") or 0)
    ingredients = cost_data.get("ingredients") or []
    has_recipe_cost = recipe_total > 0 and len(ingredients) > 0

    if has_recipe_cost:
        return recipe_total

    cost_cents = getattr(product, "cost_cents", None)
    if cost_cents is not None and int(cost_cents) > 0:
        return int(cost_cents)

    raise HTTPException(
        status_code=400,
        detail="No cost basis: add a recipe with priced ingredients or set cost price on the product.",
    )


def _cost_per_serving_from_container(
    container_cost_cents: int,
    container_quantity: Decimal,
    container_unit: UnitOfMeasure,
    serving_quantity: Decimal,
    serving_unit: UnitOfMeasure,
) -> tuple[int, Decimal]:
    if container_cost_cents <= 0:
        raise HTTPException(status_code=400, detail="container_cost_cents must be positive")
    if container_quantity <= 0 or serving_quantity <= 0:
        raise HTTPException(status_code=400, detail="container and serving quantities must be positive")

    try:
        serving_in_container_units = convert_units(serving_quantity, serving_unit, container_unit)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e

    if serving_in_container_units <= 0:
        raise HTTPException(status_code=400, detail="Invalid serving size after unit conversion")

    servings = Decimal(container_quantity) / Decimal(serving_in_container_units)
    if servings <= 0:
        raise HTTPException(status_code=400, detail="Could not derive servings from container and serving size")

    per = (Decimal(container_cost_cents) / servings).quantize(Decimal("1"))
    return int(per), servings


@router.get("/product/{product_id}/suggest")
@admin_user_limit()
def suggest_for_product(
    request: Request,
    response: Response,
    product_id: int,
    current_user: Annotated[models.User, Depends(require_permission(Permission.PRODUCT_WRITE))],
    session: Session = Depends(get_session),
    target_pour_cost_pct: float | None = Query(None),
    target_margin_pct: float | None = Query(None),
    target_markup_pct: float | None = Query(None),
    extra_fixed_cents: int = Query(0, ge=0),
    waste_pct: float = Query(0.0),
    rounding_step_cents: int | None = Query(50),
):
    cost_basis = _resolve_product_cost_basis(session, product_id, current_user.tenant_id)
    try:
        core = suggest_price(
            cost_basis,
            target_pour_cost_pct=target_pour_cost_pct,
            target_margin_pct=target_margin_pct,
            target_markup_pct=target_markup_pct,
            extra_fixed_cents=extra_fixed_cents,
            waste_pct=waste_pct,
            rounding_step_cents=rounding_step_cents,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e

    return {
        "mode": "recipe",
        "product_id": product_id,
        **core,
        "servings_in_container": None,
        "break_even_servings": None,
        "total_profit_if_sold_out_cents": None,
    }


class PricingSimulateRequest(BaseModel):
    container_cost_cents: int = Field(..., ge=1)
    container_quantity: Decimal = Field(..., gt=0)
    container_unit: UnitOfMeasure
    serving_quantity: Decimal = Field(..., gt=0)
    serving_unit: UnitOfMeasure
    target_pour_cost_pct: float | None = None
    target_margin_pct: float | None = None
    target_markup_pct: float | None = None
    extra_fixed_cents: int = Field(0, ge=0)
    waste_pct: float = 0.0
    rounding_step_cents: int | None = 50


@router.post("/simulate")
@admin_user_limit()
def simulate_pricing(
    request: Request,
    response: Response,
    body: PricingSimulateRequest,
    current_user: Annotated[models.User, Depends(require_permission(Permission.PRODUCT_WRITE))],
):
    cost_per, servings = _cost_per_serving_from_container(
        body.container_cost_cents,
        body.container_quantity,
        body.container_unit,
        body.serving_quantity,
        body.serving_unit,
    )
    try:
        core = suggest_price(
            cost_per,
            target_pour_cost_pct=body.target_pour_cost_pct,
            target_margin_pct=body.target_margin_pct,
            target_markup_pct=body.target_markup_pct,
            extra_fixed_cents=body.extra_fixed_cents,
            waste_pct=body.waste_pct,
            rounding_step_cents=body.rounding_step_cents,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e

    profit = int(core["profit_per_serving_cents"])
    if profit > 0:
        from math import ceil

        break_even = ceil(body.container_cost_cents / profit)
    else:
        break_even = None

    total_profit = int((servings * Decimal(profit)).quantize(Decimal("1"))) if profit != 0 else 0

    return {
        "mode": "simulate",
        "product_id": None,
        **core,
        "servings_in_container": float(servings),
        "break_even_servings": break_even,
        "total_profit_if_sold_out_cents": total_profit,
    }
