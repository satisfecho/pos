"""Customer display (#434): public invoice email on active table order."""

from __future__ import annotations

import inspect
import sys
import uuid
import unittest
from pathlib import Path

from fastapi.responses import Response
from pg_client_mixin import PgClientTestCase
from sqlmodel import select

_ROOT = Path(__file__).resolve().parent.parent
if str(_ROOT) not in sys.path:
    sys.path.insert(0, str(_ROOT))

from app import models


class TestCustomerDisplayInvoiceEmail(PgClientTestCase):
    def test_endpoint_accepts_slowapi_response_param(self):
        """SlowAPI injects rate-limit headers via `response: Response` under uvicorn."""
        from app.main import set_order_invoice_email

        params = inspect.signature(set_order_invoice_email).parameters
        self.assertIn("response", params)
        ann = params["response"].annotation
        self.assertTrue(
            ann is Response or getattr(ann, "__name__", "") == "Response",
            f"expected Response annotation, got {ann!r}",
        )

    def _take_away_table(self):
        tenant = self.session.exec(select(models.Tenant).order_by(models.Tenant.id)).first()
        self.assertIsNotNone(tenant)
        tables = self.session.exec(
            select(models.Table).where(models.Table.tenant_id == tenant.id)
        ).all()
        for t in tables:
            name = (t.name or "").strip().lower()
            if name in ("take away", "home ordering", "takeaway", "take-away"):
                return t, tenant
        self.assertTrue(tables, "expected at least one table")
        return tables[0], tenant

    def _make_active_order(self):
        table, tenant = self._take_away_table()
        order = models.Order(
            tenant_id=tenant.id,
            table_id=table.id,
            status=models.OrderStatus.pending,
            session_id=str(uuid.uuid4()),
        )
        self.session.add(order)
        self.session.commit()
        self.session.refresh(order)
        table.active_order_id = order.id
        self.session.add(table)
        self.session.commit()
        return table, order

    def _clear_active(self, table: models.Table, order: models.Order):
        self.session.refresh(table)
        if table.active_order_id == order.id:
            table.active_order_id = None
            self.session.add(table)
        self.session.refresh(order)
        order.status = models.OrderStatus.cancelled
        order.invoice_email = None
        self.session.add(order)
        self.session.commit()

    def test_set_invoice_email_on_active_order(self):
        table, order = self._make_active_order()
        email = f"display-{uuid.uuid4().hex[:8]}@amvara.de"
        try:
            res = self.client.post(
                f"/menu/{table.token}/order/invoice-email",
                json={"email": email},
            )
            self.assertEqual(res.status_code, 200, res.text)
            body = res.json()
            self.assertTrue(body["ok"])
            self.assertEqual(body["invoice_email"], email)
            self.assertEqual(body["order_id"], order.id)

            got = self.client.get(
                f"/menu/{table.token}/order",
                params={"for_display": "true"},
            )
            self.assertEqual(got.status_code, 200)
            order_payload = got.json().get("order") or {}
            self.assertEqual(order_payload.get("invoice_email"), email)
            self.assertIn("payment_options", order_payload)
            self.assertTrue(order_payload["payment_options"].get("cash"))
        finally:
            self._clear_active(table, order)

    def test_invoice_email_rejects_invalid(self):
        table, order = self._make_active_order()
        try:
            res = self.client.post(
                f"/menu/{table.token}/order/invoice-email",
                json={"email": "not-an-email"},
            )
            self.assertEqual(res.status_code, 422)
        finally:
            self._clear_active(table, order)


if __name__ == "__main__":
    unittest.main()
