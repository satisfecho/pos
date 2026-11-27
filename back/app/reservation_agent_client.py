"""HTTP client for LiveKit reservation agents → existing public POS APIs.

No second booking store: every call hits the same public endpoints as /book.
Used by ``back/livekit_reservation_agent/`` (optional worker). Safe to import
from the main app for unit tests without LiveKit installed.
"""

from __future__ import annotations

from typing import Any

import requests


class ReservationAgentApiError(Exception):
    """Raised when a public reservation API call fails."""

    def __init__(self, message: str, *, status_code: int | None = None, body: Any = None):
        super().__init__(message)
        self.status_code = status_code
        self.body = body


class ReservationAgentClient:
    """Thin wrapper around public reservation HTTP endpoints."""

    def __init__(
        self,
        base_url: str,
        *,
        tenant_id: int,
        timeout_seconds: float = 20.0,
        session: requests.Session | None = None,
    ) -> None:
        self.base_url = (base_url or "").rstrip("/")
        if not self.base_url:
            raise ValueError("base_url is required")
        self.tenant_id = int(tenant_id)
        self.timeout_seconds = timeout_seconds
        self._session = session or requests.Session()

    def _url(self, path: str) -> str:
        if not path.startswith("/"):
            path = "/" + path
        return f"{self.base_url}{path}"

    def _raise_for_status(self, resp: requests.Response) -> None:
        if resp.ok:
            return
        body: Any
        try:
            body = resp.json()
        except Exception:
            body = (resp.text or "")[:500]
        raise ReservationAgentApiError(
            f"POS API {resp.status_code}: {body}",
            status_code=resp.status_code,
            body=body,
        )

    def next_available(
        self,
        *,
        date: str,
        party_size: int = 2,
        min_lead_minutes: int = 10,
        service: str | None = None,
        floor_id: int | None = None,
    ) -> dict[str, Any]:
        """GET /reservations/next-available."""
        params: dict[str, Any] = {
            "tenant_id": self.tenant_id,
            "date": date,
            "party_size": party_size,
            "min_lead_minutes": min_lead_minutes,
        }
        if service:
            params["service"] = service
        if floor_id is not None:
            params["floor_id"] = floor_id
        resp = self._session.get(
            self._url("/reservations/next-available"),
            params=params,
            timeout=self.timeout_seconds,
        )
        self._raise_for_status(resp)
        return resp.json()

    def day_slots(
        self,
        *,
        date: str,
        party_size: int = 2,
        service: str | None = None,
        floor_id: int | None = None,
    ) -> dict[str, Any]:
        """GET /reservations/book-day-slots."""
        params: dict[str, Any] = {
            "tenant_id": self.tenant_id,
            "date": date,
            "party_size": party_size,
        }
        if service:
            params["service"] = service
        if floor_id is not None:
            params["floor_id"] = floor_id
        resp = self._session.get(
            self._url("/reservations/book-day-slots"),
            params=params,
            timeout=self.timeout_seconds,
        )
        self._raise_for_status(resp)
        return resp.json()

    def create_reservation(
        self,
        *,
        customer_name: str,
        customer_phone: str,
        reservation_date: str,
        reservation_time: str,
        party_size: int,
        customer_email: str | None = None,
        client_notes: str | None = None,
        service_type: str | None = None,
        seating_preference: str | None = None,
        preferred_floor_id: int | None = None,
    ) -> dict[str, Any]:
        """POST /reservations (public: tenant_id in body)."""
        payload: dict[str, Any] = {
            "tenant_id": self.tenant_id,
            "customer_name": customer_name,
            "customer_phone": customer_phone,
            "reservation_date": reservation_date,
            "reservation_time": reservation_time,
            "party_size": party_size,
        }
        if customer_email:
            payload["customer_email"] = customer_email
        if client_notes:
            payload["client_notes"] = client_notes
        if service_type:
            payload["service_type"] = service_type
        if seating_preference:
            payload["seating_preference"] = seating_preference
        if preferred_floor_id is not None:
            payload["preferred_floor_id"] = preferred_floor_id
        resp = self._session.post(
            self._url("/reservations"),
            json=payload,
            timeout=self.timeout_seconds,
            headers={"User-Agent": "satisfecho-livekit-reservation-agent/1.0"},
        )
        self._raise_for_status(resp)
        return resp.json()

    def get_by_token(self, token: str) -> dict[str, Any]:
        """GET /reservations/by-token."""
        resp = self._session.get(
            self._url("/reservations/by-token"),
            params={"token": token},
            timeout=self.timeout_seconds,
        )
        self._raise_for_status(resp)
        return resp.json()

    def cancel_by_token(self, *, reservation_id: int, token: str) -> dict[str, Any]:
        """PUT /reservations/{id}/cancel?token=…"""
        resp = self._session.put(
            self._url(f"/reservations/{int(reservation_id)}/cancel"),
            params={"token": token},
            timeout=self.timeout_seconds,
        )
        self._raise_for_status(resp)
        return resp.json()

    def available_times_for_date(
        self,
        *,
        date: str,
        party_size: int = 2,
        service: str | None = None,
        floor_id: int | None = None,
        limit: int = 12,
    ) -> list[str]:
        """Return HH:MM slots marked available for a date (capped)."""
        data = self.day_slots(
            date=date,
            party_size=party_size,
            service=service,
            floor_id=floor_id,
        )
        cells = data.get("cells") or {}
        times = data.get("times") or sorted(cells.keys())
        out: list[str] = []
        for t in times:
            if cells.get(t) == "available":
                out.append(t)
            if len(out) >= max(1, int(limit)):
                break
        return out
