"""
Regression: POST create-payment-intent / confirm-payment under SlowAPI (#425).

Plain dict returns make slowapi's sync wrapper raise:
  parameter `response` must be an instance of starlette.responses.Response
after Stripe already succeeded — client sees HTTP 500.
"""
from __future__ import annotations

import subprocess
import sys
from pathlib import Path

import pytest

_BACK_ROOT = Path(__file__).resolve().parent.parent


_SUBPROCESS = r"""
import os
import sys
from unittest.mock import MagicMock, patch

os.environ["RATE_LIMIT_ENABLED"] = "true"

sys.path.insert(0, r"%s")

from fastapi.testclient import TestClient
from sqlmodel import Session, select

from app import models
from app.db import engine
from app.main import app


def main() -> int:
    session = Session(engine)
    tenant = session.get(models.Tenant, 1)
    if not tenant:
        print("skip: no tenant 1")
        return 0

    table = session.exec(
        select(models.Table).where(
            models.Table.tenant_id == 1,
            models.Table.is_active == True,  # noqa: E712
            models.Table.token != None,  # noqa: E711
        )
    ).first()
    if not table or not table.token:
        print("skip: no active table with token")
        return 0

    product = session.exec(
        select(models.Product).where(
            models.Product.tenant_id == 1,
            models.Product.price_cents > 0,
        )
    ).first()
    if not product:
        print("skip: no priced product")
        return 0

    prev_key = tenant.stripe_secret_key
    if not prev_key:
        tenant.stripe_secret_key = "sk_test_slowapi_425"
        session.add(tenant)
        session.commit()
        session.refresh(tenant)

    client = TestClient(app)
    try:
        r_order = client.post(
            f"/menu/{table.token}/order",
            json={
                "items": [{"product_id": product.id, "quantity": 1}],
                "notes": "slowapi-425-create",
            },
        )
        if r_order.status_code != 200:
            print("order create failed", r_order.status_code, r_order.text)
            return 1
        order_id = r_order.json()["order_id"]

        mock_created = MagicMock()
        mock_created.client_secret = "cs_test_slowapi_425"
        mock_created.id = "pi_slowapi_425"
        with patch("stripe.PaymentIntent.create", return_value=mock_created):
            r_pi = client.post(
                f"/orders/{order_id}/create-payment-intent",
                params={"table_token": table.token},
            )
        if r_pi.status_code != 200:
            print("create-payment-intent failed", r_pi.status_code, r_pi.text)
            return 1
        body = r_pi.json()
        if body.get("client_secret") != "cs_test_slowapi_425":
            print("bad client_secret", body)
            return 1
        if body.get("payment_intent_id") != "pi_slowapi_425":
            print("bad payment_intent_id", body)
            return 1
        if not isinstance(body.get("amount"), int) or body["amount"] <= 0:
            print("bad amount", body)
            return 1

        # Confirm on the same unpaid order using create-intent amount (avoids promo/fee drift)
        amount = body["amount"]
        mock_retrieved = MagicMock()
        mock_retrieved.status = "succeeded"
        mock_retrieved.amount = amount
        mock_retrieved.id = "pi_slowapi_confirm_425"
        mock_retrieved.metadata = {"order_id": str(order_id)}
        with patch("stripe.PaymentIntent.retrieve", return_value=mock_retrieved):
            r_conf = client.post(
                f"/orders/{order_id}/confirm-payment",
                params={
                    "table_token": table.token,
                    "payment_intent_id": "pi_slowapi_confirm_425",
                },
            )
        if r_conf.status_code != 200:
            print("confirm-payment failed", r_conf.status_code, r_conf.text)
            return 1
        if r_conf.json().get("status") != "paid":
            print("confirm body", r_conf.json())
            return 1

        print("ok")
        return 0
    finally:
        if not prev_key:
            session.expire_all()
            t = session.get(models.Tenant, 1)
            if t is not None:
                t.stripe_secret_key = None
                session.add(t)
                session.commit()
        session.close()


if __name__ == "__main__":
    raise SystemExit(main())
""" % (
    str(_BACK_ROOT).replace("\\", "\\\\"),
)


def test_create_and_confirm_payment_with_slowapi_enabled_subprocess() -> None:
    """Fresh interpreter so app loads with RATE_LIMIT_ENABLED=true (limiter.enabled)."""
    r = subprocess.run(
        [sys.executable, "-c", _SUBPROCESS],
        cwd=str(_BACK_ROOT),
        capture_output=True,
        text=True,
        timeout=120,
    )
    assert r.returncode == 0, f"stderr={r.stderr!r} stdout={r.stdout!r}"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
