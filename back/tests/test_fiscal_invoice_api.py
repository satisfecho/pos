"""Fiscal invoice issuance: hash chain, sandbox, immutability, anulación."""
from __future__ import annotations

import unittest
from datetime import timedelta
from unittest import mock

from pg_client_mixin import PgClientTestCase

from app import models, security
from app.fiscal_invoice_service import HASH_SCHEMA, compute_record_hash


def _bearer_headers(user: models.User) -> dict[str, str]:
    data = {
        "sub": user.email,
        "tenant_id": user.tenant_id,
        "provider_id": getattr(user, "provider_id", None),
        "token_version": user.token_version,
    }
    token = security.create_access_token(data, expires_delta=timedelta(minutes=30))
    return {"Authorization": f"Bearer {token}"}


class TestFiscalInvoiceApi(PgClientTestCase):
    def setUp(self) -> None:
        super().setUp()
        self.tenant = models.Tenant(
            name="Fiscal Tenant",
            fiscal_mode="test",
            fiscal_invoice_series="T",
            tax_id="B12345678",
        )
        self.session.add(self.tenant)
        self.session.commit()
        self.session.refresh(self.tenant)

        self.owner = models.User(
            email="owner-fiscal@test.local",
            hashed_password=security.get_password_hash("x"),
            full_name="Owner",
            tenant_id=self.tenant.id,
            role=models.UserRole.owner,
        )
        self.session.add(self.owner)
        self.session.commit()
        self.session.refresh(self.owner)

        floor = models.Floor(name="Main", sort_order=0, tenant_id=self.tenant.id)
        self.session.add(floor)
        self.session.commit()
        self.session.refresh(floor)

        table = models.Table(
            name="T1",
            token="tok-fiscal-1",
            floor_id=floor.id,
            tenant_id=self.tenant.id,
            x_position=0,
            y_position=0,
            rotation=0,
            shape="rect",
            width=1,
            height=1,
            seat_count=2,
            is_active=True,
        )
        self.session.add(table)
        self.session.commit()
        self.session.refresh(table)
        self.table = table

        self.order_paid = models.Order(
            tenant_id=self.tenant.id,
            table_id=table.id,
            status=models.OrderStatus.paid,
        )
        self.order_pending = models.Order(
            tenant_id=self.tenant.id,
            table_id=table.id,
            status=models.OrderStatus.pending,
        )
        self.order_paid2 = models.Order(
            tenant_id=self.tenant.id,
            table_id=table.id,
            status=models.OrderStatus.paid,
        )
        self.session.add(self.order_paid)
        self.session.add(self.order_pending)
        self.session.add(self.order_paid2)
        self.session.commit()
        self.session.refresh(self.order_paid)
        self.session.refresh(self.order_pending)
        self.session.refresh(self.order_paid2)

        product = models.Product(
            name="Fiscal Dish",
            price_cents=1000,
            tenant_id=self.tenant.id,
        )
        self.session.add(product)
        self.session.commit()
        self.session.refresh(product)

        item = models.OrderItem(
            order_id=self.order_paid.id,
            product_id=product.id,
            product_name="Fiscal Dish",
            quantity=2,
            price_cents=1000,
            tax_rate_percent=10,
            status=models.OrderItemStatus.delivered,
        )
        self.session.add(item)
        self.session.commit()
        self.item = item

        # Second paid order with multi-rate lines (10% + 21%) for payload fidelity tests
        product_svc = models.Product(
            name="Fiscal Service",
            price_cents=500,
            tenant_id=self.tenant.id,
        )
        self.session.add(product_svc)
        self.session.commit()
        self.session.refresh(product_svc)
        self.session.add(
            models.OrderItem(
                order_id=self.order_paid2.id,
                product_id=product.id,
                product_name="Fiscal Dish",
                quantity=1,
                price_cents=1000,
                tax_rate_percent=10,
                status=models.OrderItemStatus.delivered,
            )
        )
        self.session.add(
            models.OrderItem(
                order_id=self.order_paid2.id,
                product_id=product_svc.id,
                product_name="Fiscal Service",
                quantity=1,
                price_cents=500,
                tax_rate_percent=21,
                status=models.OrderItemStatus.delivered,
            )
        )
        self.session.commit()

        self.t_other = models.Tenant(name="Other")
        self.session.add(self.t_other)
        self.session.commit()
        self.session.refresh(self.t_other)

        self.owner_other = models.User(
            email="owner-other-fiscal@test.local",
            hashed_password=security.get_password_hash("x"),
            full_name="Owner O",
            tenant_id=self.t_other.id,
            role=models.UserRole.owner,
        )
        self.session.add(self.owner_other)
        self.session.commit()
        self.session.refresh(self.owner_other)

    def test_issue_paid_order_returns_number_and_idempotent(self) -> None:
        h = _bearer_headers(self.owner)
        r1 = self.client.post(f"/orders/{self.order_paid.id}/fiscal-invoice/issue", headers=h)
        self.assertEqual(r1.status_code, 200, r1.text)
        body1 = r1.json()
        self.assertIn("full_number", body1)
        fn = body1["full_number"]
        self.assertTrue(body1.get("record_hash"))
        self.assertEqual(body1.get("record_type"), "alta")
        self.assertIn("ValidarQR", body1.get("verification_qr_content", ""))
        self.assertIn("nif=B12345678", body1.get("verification_qr_content", ""))
        self.assertIsNotNone(body1.get("sandbox_submitted_at"))
        self.assertIn(body1.get("submission_status"), ("sandbox_recorded", "middleware_accepted", "middleware_unreachable", "middleware_error"))
        r2 = self.client.post(f"/orders/{self.order_paid.id}/fiscal-invoice/issue", headers=h)
        self.assertEqual(r2.status_code, 200, r2.text)
        body2 = r2.json()
        self.assertEqual(body2["full_number"], fn)
        self.assertEqual(body2["record_hash"], body1["record_hash"])

    def test_hash_chain_links_consecutive_invoices(self) -> None:
        h = _bearer_headers(self.owner)
        r1 = self.client.post(f"/orders/{self.order_paid.id}/fiscal-invoice/issue", headers=h)
        self.assertEqual(r1.status_code, 200, r1.text)
        first = r1.json()
        r2 = self.client.post(f"/orders/{self.order_paid2.id}/fiscal-invoice/issue", headers=h)
        self.assertEqual(r2.status_code, 200, r2.text)
        second = r2.json()
        self.assertEqual(second["previous_hash"], first["record_hash"])
        self.assertNotEqual(second["record_hash"], first["record_hash"])
        self.assertEqual(HASH_SCHEMA, "pos.fiscal.hash.v1")
        # Recompute expected hash for second alta
        from datetime import datetime

        issued = datetime.fromisoformat(second["issued_at"].replace("Z", "+00:00"))
        expected = compute_record_hash(
            tenant_id=self.tenant.id,
            record_type="alta",
            full_number=second["full_number"],
            amount_cents=second["amount_cents"],
            issuer_nif="B12345678",
            issued_at=issued,
            previous_hash=second["previous_hash"],
            order_id=self.order_paid2.id,
        )
        self.assertEqual(second["record_hash"], expected)

    def test_immutability_blocks_delete_and_item_edit(self) -> None:
        h = _bearer_headers(self.owner)
        r = self.client.post(f"/orders/{self.order_paid.id}/fiscal-invoice/issue", headers=h)
        self.assertEqual(r.status_code, 200, r.text)
        d = self.client.delete(f"/orders/{self.order_paid.id}", headers=h)
        self.assertEqual(d.status_code, 409, d.text)
        u = self.client.put(
            f"/orders/{self.order_paid.id}/items/{self.item.id}",
            headers=h,
            json={"quantity": 1},
        )
        self.assertEqual(u.status_code, 409, u.text)

    def test_cancel_anulacion_then_delete_allowed(self) -> None:
        h = _bearer_headers(self.owner)
        r = self.client.post(f"/orders/{self.order_paid.id}/fiscal-invoice/issue", headers=h)
        self.assertEqual(r.status_code, 200, r.text)
        alta_hash = r.json()["record_hash"]
        c = self.client.post(f"/orders/{self.order_paid.id}/fiscal-invoice/cancel", headers=h)
        self.assertEqual(c.status_code, 200, c.text)
        body = c.json()
        self.assertEqual(body["record_type"], "anulacion")
        self.assertEqual(body["previous_hash"], alta_hash)
        self.assertTrue(body["full_number"].startswith("T-C"))
        c2 = self.client.post(f"/orders/{self.order_paid.id}/fiscal-invoice/cancel", headers=h)
        self.assertEqual(c2.status_code, 200, c2.text)
        self.assertEqual(c2.json()["id"], body["id"])
        d = self.client.delete(f"/orders/{self.order_paid.id}", headers=h)
        self.assertEqual(d.status_code, 200, d.text)

    def test_live_mode_blocked_without_unlock(self) -> None:
        from fastapi import HTTPException

        from app.fiscal_invoice_service import assert_fiscal_mode_allowed

        with mock.patch("app.fiscal_invoice_service.settings") as s:
            s.fiscal_live_unlock = False
            s.fiscal_middleware_base_url = ""
            s.fiscal_middleware_provider = "generic"
            with mock.patch(
                "app.fiscal_invoice_service.live_credentials_ready", return_value=False
            ):
                with self.assertRaises(HTTPException) as ctx:
                    assert_fiscal_mode_allowed("live")
                self.assertEqual(ctx.exception.status_code, 400)

        h = _bearer_headers(self.owner)
        r = self.client.put(
            "/tenant/settings",
            headers=h,
            json={"fiscal_mode": "live"},
        )
        self.assertEqual(r.status_code, 400, r.text)

    def test_live_issue_with_mock_middleware(self) -> None:
        """Vertical slice: live + mock provider accepts issue (non-prod)."""
        h = _bearer_headers(self.owner)
        with mock.patch("app.fiscal_invoice_service.settings") as s, mock.patch(
            "app.fiscal_providers.settings"
        ) as ps:
            s.fiscal_live_unlock = True
            s.is_production = False
            s.fiscal_middleware_provider = "mock"
            ps.fiscal_live_unlock = True
            ps.is_production = False
            ps.fiscal_middleware_provider = "mock"
            ps.fiscal_middleware_base_url = ""
            ps.fiscal_middleware_api_key = ""
            ps.fiscal_middleware_api_secret = ""
            ps.fiscal_fiskaly_client_id = ""
            with mock.patch(
                "app.fiscal_invoice_service.live_credentials_ready", return_value=True
            ), mock.patch(
                "app.fiscal_providers.live_credentials_ready", return_value=True
            ), mock.patch(
                "app.fiscal_providers.fiscal_provider_name", return_value="mock"
            ):
                r = self.client.put(
                    "/tenant/settings",
                    headers=h,
                    json={"fiscal_mode": "live"},
                )
                self.assertEqual(r.status_code, 200, r.text)
                issue = self.client.post(
                    f"/orders/{self.order_paid.id}/fiscal-invoice/issue", headers=h
                )
                self.assertEqual(issue.status_code, 200, issue.text)
                body = issue.json()
                self.assertEqual(body["mode"], "live")
                self.assertEqual(body["submission_status"], "mock_accepted")

    def test_issue_pending_order_400(self) -> None:
        h = _bearer_headers(self.owner)
        r = self.client.post(f"/orders/{self.order_pending.id}/fiscal-invoice/issue", headers=h)
        self.assertEqual(r.status_code, 400, r.text)

    def test_issue_other_tenant_order_404(self) -> None:
        h = _bearer_headers(self.owner_other)
        r = self.client.post(f"/orders/{self.order_paid.id}/fiscal-invoice/issue", headers=h)
        self.assertEqual(r.status_code, 404, r.text)

    def test_issue_stores_multi_rate_line_items(self) -> None:
        h = _bearer_headers(self.owner)
        r = self.client.post(f"/orders/{self.order_paid2.id}/fiscal-invoice/issue", headers=h)
        self.assertEqual(r.status_code, 200, r.text)
        body = r.json()
        self.assertEqual(body["amount_cents"], 1500)
        from sqlmodel import select

        from app.models import FiscalInvoice

        fi = self.session.exec(
            select(FiscalInvoice).where(
                FiscalInvoice.order_id == self.order_paid2.id,
                FiscalInvoice.record_type == "alta",
            )
        ).first()
        self.assertIsNotNone(fi)
        lines = (fi.request_payload or {}).get("line_items")
        self.assertIsInstance(lines, list)
        self.assertEqual(len(lines), 2)
        rates = sorted(int(x["vat_rate_percent"]) for x in lines)
        self.assertEqual(rates, [10, 21])
        self.assertEqual(sum(int(x["full_amount_cents"]) for x in lines), 1500)

    def test_fiskaly_items_from_line_items_multi_rate(self) -> None:
        from app.fiscal_providers import fiskaly_items_from_line_items

        items = fiskaly_items_from_line_items(
            [
                {
                    "text": "Dish",
                    "quantity": "2",
                    "unit_amount_cents": 1000,
                    "full_amount_cents": 2000,
                    "vat_rate_percent": 10,
                },
                {
                    "text": "Service",
                    "quantity": "1",
                    "unit_amount_cents": 500,
                    "full_amount_cents": 500,
                    "vat_rate_percent": 21,
                },
            ],
            amount_cents=2500,
        )
        self.assertEqual(len(items), 2)
        self.assertEqual(items[0]["system"]["category"]["rate"], "10.00")
        self.assertEqual(items[1]["system"]["category"]["rate"], "21.00")
        self.assertEqual(items[0]["full_amount"], "20.00")
        fallback = fiskaly_items_from_line_items(None, amount_cents=1000)
        self.assertEqual(len(fallback), 1)
        self.assertEqual(fallback[0]["system"]["category"]["rate"], "21.00")


if __name__ == "__main__":
    unittest.main()
