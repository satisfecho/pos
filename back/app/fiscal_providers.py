"""Certified VeriFactu middleware adapters (Spain).

Chosen primary: Fiskaly SIGN ES (see docs/0074-fiscal-certified-middleware.md).
Never invent direct AEAT SOAP/huella calls in-app.
"""

from __future__ import annotations

import logging
import uuid
from typing import Any

import requests

from app import models
from app.settings import settings

logger = logging.getLogger(__name__)

PROVIDER_MOCK = "mock"
PROVIDER_GENERIC = "generic"
PROVIDER_FISKALY_SIGN_ES = "fiskaly_sign_es"
_VALID = frozenset({PROVIDER_MOCK, PROVIDER_GENERIC, PROVIDER_FISKALY_SIGN_ES})

FISKALY_SIGN_ES_TEST = "https://test.es.sign.fiskaly.com/api/v1"
FISKALY_SIGN_ES_LIVE = "https://live.es.sign.fiskaly.com/api/v1"

# Statuses that satisfy live remisión path
LIVE_OK_STATUSES = frozenset({"middleware_accepted", "provider_accepted", "mock_accepted"})


def fiscal_provider_name() -> str:
    raw = (getattr(settings, "fiscal_middleware_provider", None) or PROVIDER_GENERIC).strip().lower()
    return raw if raw in _VALID else PROVIDER_GENERIC


def _api_key() -> str:
    return (getattr(settings, "fiscal_middleware_api_key", None) or "").strip()


def _api_secret() -> str:
    return (getattr(settings, "fiscal_middleware_api_secret", None) or "").strip()


def _configured_base() -> str:
    return (getattr(settings, "fiscal_middleware_base_url", None) or "").strip().rstrip("/")


def fiskaly_base_url(*, live: bool) -> str:
    configured = _configured_base()
    if configured:
        return configured
    return FISKALY_SIGN_ES_LIVE if live else FISKALY_SIGN_ES_TEST


def live_credentials_ready() -> bool:
    """True when unlock may allow fiscal_mode=live for the configured provider."""
    name = fiscal_provider_name()
    if name == PROVIDER_MOCK:
        # Mock is for pytest / local vertical slice only — never production.
        return not bool(getattr(settings, "is_production", False))
    if name == PROVIDER_FISKALY_SIGN_ES:
        return bool(_api_key() and _api_secret())
    # generic adapter
    return bool(_configured_base())


def submit_fiscal_record(
    payload: dict[str, Any],
    tenant: models.Tenant,
    *,
    mode: str,
) -> dict[str, Any]:
    """Submit alta/anulación via the configured middleware. Returns normalized result dict."""
    name = fiscal_provider_name()
    if name == PROVIDER_MOCK:
        return _submit_mock(payload, tenant, mode=mode)
    if name == PROVIDER_FISKALY_SIGN_ES:
        return _submit_fiskaly_sign_es(payload, tenant, mode=mode)
    return _submit_generic(payload)


def _submit_mock(
    payload: dict[str, Any],
    tenant: models.Tenant,
    *,
    mode: str,
) -> dict[str, Any]:
    full_number = str(payload.get("full_number") or "")
    record_type = str(payload.get("record_type") or "alta")
    return {
        "status": "mock_accepted",
        "channel": "mock",
        "provider": PROVIDER_MOCK,
        "http_status": 200,
        "body": {
            "schema": "pos.fiscal.mock.v1",
            "disclaimer": (
                "In-process mock certified middleware — not a real AEAT remisión. "
                "Use only for automated tests / non-production live vertical slice."
            ),
            "tenant_id": tenant.id,
            "full_number": full_number,
            "record_type": record_type,
            "mode": mode,
            "middleware_record_id": f"mock-{uuid.uuid4()}",
            "aeat_submission": "simulated",
        },
    }


def _submit_generic(payload: dict[str, Any]) -> dict[str, Any]:
    base = _configured_base()
    if not base:
        return {"status": "sandbox_recorded", "channel": "local", "provider": PROVIDER_GENERIC}
    url = f"{base}/fiscal/submit"
    headers = {"Content-Type": "application/json", "Accept": "application/json"}
    key = _api_key()
    if key:
        headers["Authorization"] = f"Bearer {key}"
    try:
        resp = requests.post(url, json=payload, headers=headers, timeout=12)
        body = _parse_json_body(resp)
        if resp.status_code >= 400:
            logger.warning("fiscal generic middleware HTTP %s: %s", resp.status_code, body)
            return {
                "status": "middleware_error",
                "http_status": resp.status_code,
                "channel": "middleware",
                "provider": PROVIDER_GENERIC,
                "body": body,
            }
        return {
            "status": "middleware_accepted",
            "http_status": resp.status_code,
            "channel": "middleware",
            "provider": PROVIDER_GENERIC,
            "body": body,
        }
    except requests.RequestException as exc:
        logger.warning("fiscal generic middleware request failed: %s", exc)
        return {
            "status": "middleware_unreachable",
            "channel": "middleware",
            "provider": PROVIDER_GENERIC,
            "error": str(exc)[:200],
        }


def _submit_fiskaly_sign_es(
    payload: dict[str, Any],
    tenant: models.Tenant,
    *,
    mode: str,
) -> dict[str, Any]:
    """Map POS fiscal record → Fiskaly SIGN ES invoice create (official REST, not AEAT SOAP)."""
    key = _api_key()
    secret = _api_secret()
    if not key or not secret:
        return {
            "status": "middleware_error",
            "channel": "fiskaly_sign_es",
            "provider": PROVIDER_FISKALY_SIGN_ES,
            "error": "FISCAL_MIDDLEWARE_API_KEY and FISCAL_MIDDLEWARE_API_SECRET required",
        }

    client_id = (
        (getattr(tenant, "fiscal_aeat_api_secret", None) or "").strip()
        or (getattr(settings, "fiscal_fiskaly_client_id", None) or "").strip()
    )
    if not client_id:
        return {
            "status": "middleware_error",
            "channel": "fiskaly_sign_es",
            "provider": PROVIDER_FISKALY_SIGN_ES,
            "error": (
                "Fiskaly SIGN ES client_id missing: set tenant fiscal credential "
                "or FISCAL_FISKALY_CLIENT_ID (see docs/0074)"
            ),
        }

    base = fiskaly_base_url(live=(mode == "live"))
    token = _fiskaly_auth(base, key, secret)
    if not token:
        return {
            "status": "middleware_unreachable",
            "channel": "fiskaly_sign_es",
            "provider": PROVIDER_FISKALY_SIGN_ES,
            "error": "SIGN ES auth failed",
        }

    record_type = str(payload.get("record_type") or "alta")
    full_number = str(payload.get("full_number") or "")
    amount_cents = int(payload.get("amount_cents") or 0)
    full_amount = f"{amount_cents / 100:.2f}"
    invoice_id = str(uuid.uuid4())

    # SIMPLIFIED for alta; CORRECTING for anulación (credit-note cancel path).
    req = payload.get("request_payload") if isinstance(payload.get("request_payload"), dict) else {}
    cancels = payload.get("cancels_full_number") or req.get("cancels_full_number") or ""
    order_id = payload.get("order_id") or req.get("order_id") or ""
    items = fiskaly_items_from_line_items(req.get("line_items"), amount_cents=amount_cents)

    if record_type == "anulacion":
        content: dict[str, Any] = {
            "type": "CORRECTING",
            "number": full_number[:60],
            "text": f"Anulacion {cancels}".strip(),
            "full_amount": full_amount,
            "items": items,
        }
    else:
        content = {
            "type": "SIMPLIFIED",
            "number": full_number[:60],
            "text": f"Order {order_id}".strip(),
            "full_amount": full_amount,
            "items": items,
        }

    url = f"{base}/clients/{client_id}/invoices/{invoice_id}"
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
        "Accept": "application/json",
    }
    try:
        resp = requests.put(
            url,
            json={"content": content},
            headers=headers,
            timeout=20,
        )
        body = _parse_json_body(resp)
        if resp.status_code >= 400:
            logger.warning("fiskaly SIGN ES HTTP %s: %s", resp.status_code, body)
            return {
                "status": "middleware_error",
                "http_status": resp.status_code,
                "channel": "fiskaly_sign_es",
                "provider": PROVIDER_FISKALY_SIGN_ES,
                "body": body,
            }
        # Prefer provider QR / verification fields when present
        qr = None
        if isinstance(body, dict):
            inner = body.get("content") if isinstance(body.get("content"), dict) else body
            if isinstance(inner, dict):
                qr = inner.get("qr") or inner.get("qr_code") or inner.get("verification_url")
        return {
            "status": "provider_accepted",
            "http_status": resp.status_code,
            "channel": "fiskaly_sign_es",
            "provider": PROVIDER_FISKALY_SIGN_ES,
            "body": body,
            "verification_qr": str(qr)[:2000] if qr else None,
            "middleware_record_id": invoice_id,
        }
    except requests.RequestException as exc:
        logger.warning("fiskaly SIGN ES request failed: %s", exc)
        return {
            "status": "middleware_unreachable",
            "channel": "fiskaly_sign_es",
            "provider": PROVIDER_FISKALY_SIGN_ES,
            "error": str(exc)[:200],
        }


def _fiskaly_auth(base: str, api_key: str, api_secret: str) -> str | None:
    url = f"{base.rstrip('/')}/auth"
    try:
        resp = requests.post(
            url,
            json={"content": {"api_key": api_key, "api_secret": api_secret}},
            headers={"Content-Type": "application/json", "Accept": "application/json"},
            timeout=12,
        )
        body = _parse_json_body(resp)
        if resp.status_code >= 400:
            logger.warning("fiskaly SIGN ES auth HTTP %s: %s", resp.status_code, body)
            return None
        if isinstance(body, dict):
            content = body.get("content") if isinstance(body.get("content"), dict) else body
            if isinstance(content, dict):
                token = content.get("access_token") or content.get("token")
                if token:
                    return str(token)
            token = body.get("access_token") or body.get("token")
            if token:
                return str(token)
        return None
    except requests.RequestException as exc:
        logger.warning("fiskaly SIGN ES auth failed: %s", exc)
        return None


def _parse_json_body(resp: requests.Response) -> dict[str, Any]:
    try:
        parsed = resp.json()
        return parsed if isinstance(parsed, dict) else {"raw": parsed}
    except Exception:
        return {"raw": (resp.text or "")[:500]}


def _fmt_money_cents(cents: int) -> str:
    return f"{int(cents) / 100:.2f}"


def _fmt_vat_rate(rate_percent: int | float | None) -> str:
    try:
        val = float(rate_percent) if rate_percent is not None else 21.0
    except (TypeError, ValueError):
        val = 21.0
    return f"{val:.2f}"


def fiskaly_items_from_line_items(
    line_items: Any,
    *,
    amount_cents: int,
) -> list[dict[str, Any]]:
    """Map POS fiscal line_items (multi-rate IVA) → Fiskaly SIGN ES content.items.

    Falls back to a single 21% line when line_items are missing/empty so older
    records and mock paths keep working.
    """
    if isinstance(line_items, list) and line_items:
        out: list[dict[str, Any]] = []
        for raw in line_items:
            if not isinstance(raw, dict):
                continue
            full_cents = int(raw.get("full_amount_cents") or 0)
            unit_cents = raw.get("unit_amount_cents")
            if unit_cents is None:
                unit_cents = full_cents
            qty = str(raw.get("quantity") or "1")
            text = str(raw.get("text") or "Item").strip()[:120] or "Item"
            rate = raw.get("vat_rate_percent")
            if rate is None:
                rate = 21
            out.append(
                {
                    "text": text,
                    "quantity": qty,
                    "unit_amount": _fmt_money_cents(int(unit_cents)),
                    "full_amount": _fmt_money_cents(full_cents),
                    "system": {
                        "type": "REGULAR",
                        "category": {"type": "VAT", "rate": _fmt_vat_rate(rate)},
                    },
                }
            )
        if out:
            return out

    full_amount = _fmt_money_cents(amount_cents)
    return [
        {
            "text": "POS sale",
            "quantity": "1",
            "unit_amount": full_amount,
            "full_amount": full_amount,
            "system": {
                "type": "REGULAR",
                "category": {"type": "VAT", "rate": "21.00"},
            },
        }
    ]
