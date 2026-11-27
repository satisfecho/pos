"""Hardware print jobs + LAN agent auth (#317)."""

from __future__ import annotations

import hashlib
import secrets
from datetime import datetime, timedelta, timezone
from typing import Any

from fastapi import HTTPException
from sqlmodel import Session, select

from . import models

# Agent considered online if heartbeat within this window.
AGENT_ONLINE_SECONDS = 60
JOB_TYPES = frozenset({"kitchen", "receipt"})
JOB_STATUSES = frozenset({"pending", "claimed", "done", "failed", "cancelled"})


def _now() -> datetime:
    return datetime.now(timezone.utc)


def hash_agent_token(raw_token: str) -> str:
    return hashlib.sha256(raw_token.encode("utf-8")).hexdigest()


def generate_agent_token() -> str:
    return secrets.token_urlsafe(32)


def agent_to_dict(agent: models.PrintAgent, *, include_online: bool = True) -> dict[str, Any]:
    online = False
    if include_online and agent.last_seen_at and agent.revoked_at is None:
        seen = agent.last_seen_at
        if seen.tzinfo is None:
            seen = seen.replace(tzinfo=timezone.utc)
        online = (_now() - seen) <= timedelta(seconds=AGENT_ONLINE_SECONDS)
    return {
        "id": agent.id,
        "tenant_id": agent.tenant_id,
        "device_id": agent.device_id,
        "display_name": agent.display_name,
        "last_seen_at": agent.last_seen_at.isoformat() if agent.last_seen_at else None,
        "revoked_at": agent.revoked_at.isoformat() if agent.revoked_at else None,
        "created_at": agent.created_at.isoformat() if agent.created_at else None,
        "online": online,
    }


def job_to_dict(job: models.PrintJob) -> dict[str, Any]:
    return {
        "id": job.id,
        "tenant_id": job.tenant_id,
        "job_type": job.job_type,
        "printer_role": job.printer_role,
        "status": job.status,
        "order_id": job.order_id,
        "payload": job.payload or {},
        "created_by_user_id": job.created_by_user_id,
        "claimed_by_agent_id": job.claimed_by_agent_id,
        "claimed_at": job.claimed_at.isoformat() if job.claimed_at else None,
        "completed_at": job.completed_at.isoformat() if job.completed_at else None,
        "error_message": job.error_message,
        "created_at": job.created_at.isoformat() if job.created_at else None,
    }


def create_agent(
    session: Session,
    *,
    tenant_id: int,
    device_id: str,
    display_name: str = "Print agent",
) -> tuple[models.PrintAgent, str]:
    device_id = (device_id or "").strip()
    if not device_id:
        raise HTTPException(status_code=400, detail="device_id is required")
    existing = session.exec(
        select(models.PrintAgent).where(
            models.PrintAgent.tenant_id == tenant_id,
            models.PrintAgent.device_id == device_id,
            models.PrintAgent.revoked_at.is_(None),  # type: ignore[attr-defined]
        )
    ).first()
    if existing:
        raise HTTPException(status_code=409, detail="device_id already registered")

    raw = generate_agent_token()
    agent = models.PrintAgent(
        tenant_id=tenant_id,
        device_id=device_id,
        display_name=(display_name or "Print agent").strip()[:120] or "Print agent",
        token_hash=hash_agent_token(raw),
    )
    session.add(agent)
    session.commit()
    session.refresh(agent)
    return agent, raw


def list_agents(session: Session, tenant_id: int) -> list[models.PrintAgent]:
    return list(
        session.exec(
            select(models.PrintAgent)
            .where(models.PrintAgent.tenant_id == tenant_id)
            .order_by(models.PrintAgent.created_at.desc())
        ).all()
    )


def revoke_agent(session: Session, tenant_id: int, agent_id: int) -> models.PrintAgent:
    agent = session.get(models.PrintAgent, agent_id)
    if agent is None or agent.tenant_id != tenant_id:
        raise HTTPException(status_code=404, detail="Print agent not found")
    if agent.revoked_at is None:
        agent.revoked_at = _now()
        session.add(agent)
        session.commit()
        session.refresh(agent)
    return agent


def get_agent_by_token(session: Session, raw_token: str) -> models.PrintAgent:
    token = (raw_token or "").strip()
    if not token:
        raise HTTPException(status_code=401, detail="Missing agent token")
    agent = session.exec(
        select(models.PrintAgent).where(
            models.PrintAgent.token_hash == hash_agent_token(token)
        )
    ).first()
    if agent is None or agent.revoked_at is not None:
        raise HTTPException(status_code=401, detail="Invalid or revoked agent token")
    return agent


def touch_agent(session: Session, agent: models.PrintAgent) -> models.PrintAgent:
    agent.last_seen_at = _now()
    session.add(agent)
    session.commit()
    session.refresh(agent)
    return agent


def tenant_bridge_status(session: Session, tenant_id: int) -> dict[str, Any]:
    agents = [a for a in list_agents(session, tenant_id) if a.revoked_at is None]
    online_agents = []
    for a in agents:
        d = agent_to_dict(a)
        if d["online"]:
            online_agents.append(d)
    latest = None
    for a in agents:
        if a.last_seen_at and (latest is None or a.last_seen_at > latest):
            latest = a.last_seen_at
    return {
        "agent_online": len(online_agents) > 0,
        "online_count": len(online_agents),
        "agent_count": len(agents),
        "last_seen_at": latest.isoformat() if latest else None,
        "online_window_seconds": AGENT_ONLINE_SECONDS,
    }


def _default_role(job_type: str) -> str:
    return "kitchen" if job_type == "kitchen" else "receipt"


def _order_table_name(session: Session, order: models.Order) -> str | None:
    if order.table_id is None:
        if getattr(order, "order_channel", None) == models.OrderChannel.satisfecho_delivery:
            return "Satisfecho Delivery"
        return None
    table = session.get(models.Table, order.table_id)
    return table.name if table else None


def _order_total_cents(
    session: Session, items: list[models.OrderItem], order: models.Order
) -> int:
    """Payable total for receipts: same path as POS billing (#455)."""
    from app.order_payment_service import order_due_cents

    _ = items  # lines already filtered for kitchen; due uses active DB lines
    return order_due_cents(session, order, include_tip=True)


def _build_order_payload(session: Session, order: models.Order, job_type: str) -> dict[str, Any]:
    items = list(
        session.exec(
            select(models.OrderItem).where(models.OrderItem.order_id == order.id)
        ).all()
    )
    items = [i for i in items if not getattr(i, "removed_by_customer", False)]
    # Ready-made products (#454): omit from kitchen tickets; keep on receipts.
    skip_product_ids: set[int] = set()
    if job_type == "kitchen":
        from app.kitchen_stations_util import product_skips_kitchen

        product_ids = [i.product_id for i in items if i.product_id]
        if product_ids:
            for p in session.exec(
                select(models.Product).where(models.Product.id.in_(product_ids))
            ).all():
                if product_skips_kitchen(p) and p.id is not None:
                    skip_product_ids.add(p.id)
    lines = []
    for i in items:
        if job_type == "kitchen" and i.product_id in skip_product_ids:
            continue
        name = i.product_name or f"Item {i.id}"
        qty = i.quantity or 1
        note_bits = []
        if getattr(i, "customization_summary", None):
            note_bits.append(str(i.customization_summary))
        if getattr(i, "line_modifiers_summary", None):
            note_bits.append(str(i.line_modifiers_summary))
        lines.append(
            {
                "name": name,
                "quantity": qty,
                "price_cents": i.price_cents or 0,
                "notes": " · ".join(note_bits) if note_bits else None,
                "station_route": getattr(i, "kitchen_station_route", None),
            }
        )
    table_name = _order_table_name(session, order)
    total_cents = _order_total_cents(session, items, order)
    title = "KITCHEN" if job_type == "kitchen" else "RECEIPT"
    plain_lines = [
        title,
        f"Order #{order.id}",
        f"Table: {table_name or '—'}",
        f"Customer: {order.customer_name or '—'}",
        "-" * 32,
    ]
    for line in lines:
        plain_lines.append(f"{line['quantity']}x {line['name']}")
        if line.get("notes"):
            plain_lines.append(f"  {line['notes']}")
    if job_type == "receipt":
        plain_lines.append("-" * 32)
        plain_lines.append(f"TOTAL: {total_cents / 100:.2f}")
        try:
            from app.tse_service import get_sale_tse, receipt_fields_dict

            tse_row = get_sale_tse(session, order.tenant_id, order.id)  # type: ignore[arg-type]
            tse_fields = receipt_fields_dict(tse_row)
            if tse_fields:
                plain_lines.append("-" * 32)
                plain_lines.append("TSE (KassenSichV)")
                plain_lines.append(f"Serial: {tse_fields.get('tse_serial') or '—'}")
                plain_lines.append(f"SigCounter: {tse_fields.get('signature_counter')}")
                plain_lines.append(f"Time: {tse_fields.get('time_start') or '—'}")
                sig = (tse_fields.get("signature_value") or "")[:32]
                if sig:
                    plain_lines.append(f"Sig: {sig}…")
        except Exception:
            tse_fields = None
    else:
        tse_fields = None
    plain_lines.append("")
    out: dict[str, Any] = {
        "title": title,
        "order_id": order.id,
        "table_name": table_name,
        "customer_name": order.customer_name,
        "total_cents": total_cents,
        "lines": lines,
        "plain_text": "\n".join(plain_lines),
    }
    if job_type == "receipt" and tse_fields:
        out["tse"] = tse_fields
    return out


def create_job(
    session: Session,
    *,
    tenant_id: int,
    user_id: int | None,
    job_type: str,
    order_id: int | None = None,
    printer_role: str | None = None,
    payload: dict[str, Any] | None = None,
) -> models.PrintJob:
    jt = (job_type or "").strip().lower()
    if jt not in JOB_TYPES:
        raise HTTPException(status_code=400, detail="job_type must be kitchen or receipt")

    order: models.Order | None = None
    if order_id is not None:
        order = session.get(models.Order, order_id)
        if order is None or order.tenant_id != tenant_id:
            raise HTTPException(status_code=404, detail="Order not found")

    body = dict(payload or {})
    if order is not None and not body.get("plain_text"):
        built = _build_order_payload(session, order, jt)
        for k, v in built.items():
            body.setdefault(k, v)

    if not body.get("plain_text") and not body.get("lines"):
        raise HTTPException(
            status_code=400,
            detail="Provide order_id or payload with plain_text/lines",
        )

    role = (printer_role or "").strip() or _default_role(jt)
    job = models.PrintJob(
        tenant_id=tenant_id,
        job_type=jt,
        printer_role=role[:32],
        status="pending",
        order_id=order.id if order else None,
        payload=body,
        created_by_user_id=user_id,
    )
    session.add(job)
    session.commit()
    session.refresh(job)
    return job


def list_jobs(
    session: Session,
    tenant_id: int,
    *,
    limit: int = 50,
    status: str | None = None,
) -> list[models.PrintJob]:
    q = select(models.PrintJob).where(models.PrintJob.tenant_id == tenant_id)
    if status:
        st = status.strip().lower()
        if st not in JOB_STATUSES:
            raise HTTPException(status_code=400, detail="Invalid status filter")
        q = q.where(models.PrintJob.status == st)
    q = q.order_by(models.PrintJob.created_at.desc()).limit(min(max(limit, 1), 200))
    return list(session.exec(q).all())


def claim_pending_jobs(
    session: Session,
    agent: models.PrintAgent,
    *,
    limit: int = 10,
) -> list[models.PrintJob]:
    touch_agent(session, agent)
    rows = list(
        session.exec(
            select(models.PrintJob)
            .where(
                models.PrintJob.tenant_id == agent.tenant_id,
                models.PrintJob.status == "pending",
            )
            .order_by(models.PrintJob.created_at.asc())
            .limit(min(max(limit, 1), 50))
        ).all()
    )
    now = _now()
    claimed: list[models.PrintJob] = []
    for job in rows:
        job.status = "claimed"
        job.claimed_by_agent_id = agent.id
        job.claimed_at = now
        session.add(job)
        claimed.append(job)
    if claimed:
        session.commit()
        for job in claimed:
            session.refresh(job)
    return claimed


def complete_job(
    session: Session,
    agent: models.PrintAgent,
    job_id: int,
    *,
    status: str,
    error_message: str | None = None,
) -> models.PrintJob:
    st = (status or "").strip().lower()
    if st not in ("done", "failed"):
        raise HTTPException(status_code=400, detail="status must be done or failed")
    job = session.get(models.PrintJob, job_id)
    if job is None or job.tenant_id != agent.tenant_id:
        raise HTTPException(status_code=404, detail="Print job not found")
    if job.claimed_by_agent_id not in (None, agent.id) and job.status == "claimed":
        raise HTTPException(status_code=403, detail="Job claimed by another agent")
    job.status = st
    job.completed_at = _now()
    job.claimed_by_agent_id = agent.id
    if st == "failed":
        job.error_message = (error_message or "print failed")[:500]
    else:
        job.error_message = None
    session.add(job)
    touch_agent(session, agent)
    session.refresh(job)
    return job
