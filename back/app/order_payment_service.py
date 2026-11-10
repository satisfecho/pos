"""Split-bill / partial payment helpers (#318). See docs/0071-split-bill.md."""

from __future__ import annotations

import logging
from datetime import datetime, timezone

from fastapi import HTTPException
from sqlmodel import Session, select

from . import models
from .order_discounts import order_level_discount_cents


def active_order_items(session: Session, order_id: int) -> list[models.OrderItem]:
    items = session.exec(
        select(models.OrderItem).where(models.OrderItem.order_id == order_id)
    ).all()
    return [
        i
        for i in items
        if not i.removed_by_customer
        and i.removed_by_user_id is None
        and i.status != models.OrderItemStatus.cancelled
    ]


def order_items_all_delivered(session: Session, order_id: int) -> bool:
    """True when every non-removed line is delivered (service done)."""
    items = session.exec(
        select(models.OrderItem).where(models.OrderItem.order_id == order_id)
    ).all()
    # Match compute_order_status_from_items active set (removed flags only).
    active = [
        i
        for i in items
        if not i.removed_by_customer and i.removed_by_user_id is None
    ]
    if not active:
        return False
    return all(i.status == models.OrderItemStatus.delivered for i in active)


def status_after_full_payment(
    session: Session,
    order: models.Order,
) -> models.OrderStatus:
    """
    After balance is covered: keep ``paid`` while kitchen/service still has work
    (pre-pay). Use ``completed`` when all items are already delivered so the
    order leaves Active Orders (#345).
    """
    if order.status == models.OrderStatus.out_for_delivery:
        return models.OrderStatus.paid
    if order.id is not None and order_items_all_delivered(session, order.id):
        return models.OrderStatus.completed
    return models.OrderStatus.paid


def order_subtotal_cents(session: Session, order: models.Order) -> int:
    return sum(i.price_cents * i.quantity for i in active_order_items(session, order.id))


def _channel_value(order: models.Order) -> str:
    raw = getattr(order, "order_channel", None)
    if raw is None:
        return models.OrderChannel.table.value
    return raw.value if hasattr(raw, "value") else str(raw)


def order_due_cents(session: Session, order: models.Order, *, include_tip: bool = True) -> int:
    """Amount still owed before payments: lines − discounts (+ tip when include_tip)."""
    subtotal = order_subtotal_cents(session, order)
    if _channel_value(order) == models.OrderChannel.satisfecho_delivery.value:
        from .delivery_order_service import order_delivery_fee_cents

        subtotal = subtotal + order_delivery_fee_cents(order)
    discount = order_level_discount_cents(order)
    tip = int(order.tip_amount_cents or 0) if include_tip else 0
    return max(0, subtotal - discount) + tip


def list_active_payments(session: Session, order_id: int) -> list[models.OrderPayment]:
    rows = session.exec(
        select(models.OrderPayment)
        .where(models.OrderPayment.order_id == order_id)
        .order_by(models.OrderPayment.paid_at.asc(), models.OrderPayment.id.asc())
    ).all()
    return [p for p in rows if p.voided_at is None]


def amount_paid_cents(session: Session, order_id: int) -> int:
    return sum(int(p.amount_cents or 0) for p in list_active_payments(session, order_id))


def payment_line_ids(session: Session, payment_id: int) -> list[int]:
    rows = session.exec(
        select(models.OrderPaymentItem).where(
            models.OrderPaymentItem.order_payment_id == payment_id
        )
    ).all()
    return [int(r.order_item_id) for r in rows]


def payment_to_dict(session: Session, p: models.OrderPayment) -> dict:
    return {
        "id": p.id,
        "order_id": p.order_id,
        "amount_cents": p.amount_cents,
        "payment_method": p.payment_method,
        "payer_label": p.payer_label,
        "tip_amount_cents": p.tip_amount_cents,
        "stripe_payment_intent_id": p.stripe_payment_intent_id,
        "paid_by_user_id": p.paid_by_user_id,
        "paid_at": p.paid_at.isoformat() if p.paid_at else None,
        "voided_at": p.voided_at.isoformat() if p.voided_at else None,
        "note": p.note,
        "order_item_ids": payment_line_ids(session, p.id) if p.id else [],
    }


def allocated_order_item_ids(session: Session, order_id: int) -> set[int]:
    """Order item ids already assigned to a non-voided payment leg."""
    payments = list_active_payments(session, order_id)
    if not payments:
        return set()
    pay_ids = [p.id for p in payments if p.id is not None]
    if not pay_ids:
        return set()
    rows = session.exec(
        select(models.OrderPaymentItem).where(
            models.OrderPaymentItem.order_payment_id.in_(pay_ids)  # type: ignore[attr-defined]
        )
    ).all()
    return {int(r.order_item_id) for r in rows}


def unallocated_order_items(session: Session, order: models.Order) -> list[models.OrderItem]:
    taken = allocated_order_item_ids(session, order.id)
    return [i for i in active_order_items(session, order.id) if i.id not in taken]


def _session_key_for_item(item: models.OrderItem, order: models.Order) -> str | None:
    """Guest browser session that owns a line (added_by_session, else order.session_id)."""
    raw = getattr(item, "added_by_session", None) or getattr(order, "session_id", None)
    if raw is None:
        return None
    sid = str(raw).strip()
    return sid or None


def guest_session_groups(
    session: Session, order: models.Order
) -> list[dict]:
    """Unallocated lines grouped by guest session for split-by-session (#443 / 0071 D)."""
    groups: dict[str | None, list[models.OrderItem]] = {}
    for item in unallocated_order_items(session, order):
        key = _session_key_for_item(item, order)
        groups.setdefault(key, []).append(item)
    out: list[dict] = []
    for key, items in groups.items():
        ids = [i.id for i in items if i.id is not None]
        amount = sum(int(i.price_cents) * int(i.quantity) for i in items)
        out.append(
            {
                "guest_session_id": key,
                "order_item_ids": ids,
                "amount_cents": amount,
                "item_count": len(ids),
            }
        )
    # Stable: known sessions first (sorted), then unassigned (None) last.
    out.sort(key=lambda g: (g["guest_session_id"] is None, g["guest_session_id"] or ""))
    return out


def resolve_guest_session_item_ids(
    session: Session,
    *,
    order: models.Order,
    guest_session_id: str | None,
) -> list[int]:
    """Expand a guest_session_id to unallocated order_item ids.

    Pass empty string or the literal ``__none__`` to select lines with no session.
    """
    raw = (guest_session_id or "").strip()
    want_none = raw in ("", "__none__", "__unassigned__")
    want = None if want_none else raw
    ids: list[int] = []
    for item in unallocated_order_items(session, order):
        key = _session_key_for_item(item, order)
        if want_none and key is None and item.id is not None:
            ids.append(item.id)
        elif not want_none and key == want and item.id is not None:
            ids.append(item.id)
    if not ids:
        raise HTTPException(
            status_code=400,
            detail="No unallocated order items for that guest session",
        )
    return ids


def resolve_line_payment_amount(
    session: Session,
    *,
    order: models.Order,
    order_item_ids: list[int],
) -> tuple[int, list[models.OrderItem]]:
    """Validate line selection and return (amount_cents, selected items)."""
    if not order_item_ids:
        raise HTTPException(status_code=400, detail="order_item_ids must not be empty")
    wanted = {int(x) for x in order_item_ids}
    if len(wanted) != len(order_item_ids):
        raise HTTPException(status_code=400, detail="Duplicate order_item_ids")
    active = {i.id: i for i in active_order_items(session, order.id) if i.id is not None}
    missing = wanted - set(active.keys())
    if missing:
        raise HTTPException(
            status_code=400,
            detail=f"order_item_ids not on order or not payable: {sorted(missing)}",
        )
    already = allocated_order_item_ids(session, order.id)
    conflict = wanted & already
    if conflict:
        raise HTTPException(
            status_code=400,
            detail=f"order_item_ids already allocated to another payment: {sorted(conflict)}",
        )
    items = [active[i] for i in sorted(wanted)]
    amount = sum(int(i.price_cents) * int(i.quantity) for i in items)
    if amount < 1:
        raise HTTPException(status_code=400, detail="Selected lines total must be at least 1 cent")
    return amount, items


def reconciliation_dict(session: Session, order: models.Order) -> dict:
    due = order_due_cents(session, order, include_tip=True)
    paid = amount_paid_cents(session, order.id)
    payments = list_active_payments(session, order.id)
    remaining = max(0, due - paid)
    unalloc = unallocated_order_items(session, order)
    return {
        "amount_due_cents": due,
        "amount_paid_cents": paid,
        "amount_remaining_cents": remaining,
        "is_fully_paid": remaining == 0 and due > 0 and order.paid_at is not None,
        "payments": [payment_to_dict(session, p) for p in payments],
        "unallocated_order_item_ids": [i.id for i in unalloc if i.id is not None],
        "guest_sessions": guest_session_groups(session, order),
    }


def settlement_payment_method(payments: list[models.OrderPayment]) -> str:
    methods = {p.payment_method for p in payments if p.payment_method}
    if len(methods) == 1:
        return next(iter(methods))
    if len(methods) > 1:
        return "split"
    return "cash"


def find_payment_by_stripe_intent(
    session: Session, *, order_id: int, stripe_payment_intent_id: str
) -> models.OrderPayment | None:
    """Return an active payment leg already tied to this PaymentIntent (idempotent confirm)."""
    pid = (stripe_payment_intent_id or "").strip()
    if not pid:
        return None
    for p in list_active_payments(session, order_id):
        if (p.stripe_payment_intent_id or "").strip() == pid:
            return p
    return None


def record_payment(
    session: Session,
    *,
    order: models.Order,
    amount_cents: int | None,
    payment_method: str,
    paid_by_user_id: int | None,
    payer_label: str | None = None,
    tip_amount_cents: int | None = None,
    note: str | None = None,
    stripe_payment_intent_id: str | None = None,
    order_item_ids: list[int] | None = None,
    guest_session_id: str | None = None,
    settle_if_covered: bool = True,
) -> tuple[models.OrderPayment, dict]:
    """Append a payment leg. When settle_if_covered and remaining hits 0, mark order paid.

    Pass ``order_item_ids`` for split-by-line, ``guest_session_id`` for session split
    (amount derived from lines), or ``amount_cents`` for split by amount.
    """
    if order.deleted_at is not None:
        raise HTTPException(status_code=404, detail="Order not found")
    if order.status == models.OrderStatus.cancelled:
        raise HTTPException(status_code=400, detail="Cannot pay a cancelled order")
    if order.status == models.OrderStatus.paid or order.paid_at:
        raise HTTPException(status_code=400, detail="Order is already paid")

    if stripe_payment_intent_id:
        existing_pi = find_payment_by_stripe_intent(
            session, order_id=order.id, stripe_payment_intent_id=stripe_payment_intent_id
        )
        if existing_pi is not None:
            return existing_pi, reconciliation_dict(session, order)

    resolved_ids = list(order_item_ids) if order_item_ids else None
    if guest_session_id is not None and str(guest_session_id).strip() != "":
        if resolved_ids:
            raise HTTPException(
                status_code=400,
                detail="Provide either guest_session_id or order_item_ids, not both",
            )
        resolved_ids = resolve_guest_session_item_ids(
            session, order=order, guest_session_id=guest_session_id
        )
        if not payer_label:
            sid = str(guest_session_id).strip()
            if sid not in ("__none__", "__unassigned__"):
                payer_label = f"Guest {sid[:8]}"

    line_items: list[models.OrderItem] = []
    if resolved_ids:
        amt, line_items = resolve_line_payment_amount(
            session, order=order, order_item_ids=resolved_ids
        )
        if amount_cents is not None and int(amount_cents) != amt:
            raise HTTPException(
                status_code=400,
                detail=(
                    f"amount_cents {int(amount_cents)} does not match selected lines total {amt}"
                ),
            )
    else:
        if amount_cents is None:
            raise HTTPException(
                status_code=400,
                detail="amount_cents is required when order_item_ids and guest_session_id are omitted",
            )
        amt = int(amount_cents)
        if amt < 1:
            raise HTTPException(status_code=400, detail="amount_cents must be at least 1")

    method = (payment_method or "cash").strip().lower()[:32] or "cash"
    label = (payer_label or "").strip()[:120] or None
    tip = int(tip_amount_cents) if tip_amount_cents is not None else None
    if tip is not None and tip < 0:
        raise HTTPException(status_code=400, detail="Invalid tip_amount_cents")

    if tip and tip > 0:
        order.tip_amount_cents = (int(order.tip_amount_cents or 0) + tip) if order.tip_amount_cents else tip

    due = order_due_cents(session, order, include_tip=True)
    already = amount_paid_cents(session, order.id)
    remaining = max(0, due - already)
    if remaining <= 0:
        raise HTTPException(status_code=400, detail="Order has no remaining balance")
    if amt > remaining:
        raise HTTPException(
            status_code=400,
            detail=f"amount_cents {amt} exceeds remaining {remaining}",
        )

    now = datetime.now(timezone.utc)
    row = models.OrderPayment(
        tenant_id=order.tenant_id,
        order_id=order.id,
        amount_cents=amt,
        payment_method=method,
        payer_label=label,
        tip_amount_cents=tip if tip else None,
        stripe_payment_intent_id=stripe_payment_intent_id,
        paid_by_user_id=paid_by_user_id,
        paid_at=now,
        note=(note or "").strip()[:500] or None,
    )
    session.add(row)
    session.flush()

    for item in line_items:
        line_amt = int(item.price_cents) * int(item.quantity)
        session.add(
            models.OrderPaymentItem(
                tenant_id=order.tenant_id,
                order_payment_id=row.id,  # type: ignore[arg-type]
                order_item_id=item.id,  # type: ignore[arg-type]
                amount_cents=line_amt,
            )
        )
    if line_items:
        session.flush()

    payments = list_active_payments(session, order.id)
    paid_total = sum(int(p.amount_cents or 0) for p in payments)
    due_after = order_due_cents(session, order, include_tip=True)
    remaining_after = max(0, due_after - paid_total)

    if settle_if_covered and remaining_after == 0:
        order.paid_at = now
        order.paid_by_user_id = paid_by_user_id
        order.payment_method = settlement_payment_method(payments)
        order.status = status_after_full_payment(session, order)
        session.add(order)

    session.commit()
    session.refresh(row)
    session.refresh(order)

    if order.status == models.OrderStatus.paid or order.paid_at:
        try:
            from app.tse_service import maybe_sign_sale_after_paid

            maybe_sign_sale_after_paid(session, order)
            session.refresh(order)
        except Exception:
            logging.getLogger(__name__).exception(
                "TSE sale after payment failed order_id=%s", order.id
            )

    return row, reconciliation_dict(session, order)


def ensure_full_payment_leg(
    session: Session,
    *,
    order: models.Order,
    payment_method: str,
    paid_by_user_id: int | None,
    tip_amount_cents: int | None = None,
    stripe_payment_intent_id: str | None = None,
) -> models.OrderPayment | None:
    """
    After mark-paid / Stripe / Revolut already set order.paid_at, ensure one audit leg
    for the remaining balance that was just settled (idempotent if legs already cover due).
    """
    if not order.id or not order.paid_at:
        return None
    due = order_due_cents(session, order, include_tip=True)
    paid = amount_paid_cents(session, order.id)
    remaining = max(0, due - paid)
    if remaining <= 0:
        return None
    method = (payment_method or order.payment_method or "cash").strip().lower()[:32] or "cash"
    row = models.OrderPayment(
        tenant_id=order.tenant_id,
        order_id=order.id,
        amount_cents=remaining,
        payment_method=method,
        tip_amount_cents=tip_amount_cents if tip_amount_cents else None,
        stripe_payment_intent_id=stripe_payment_intent_id,
        paid_by_user_id=paid_by_user_id,
        paid_at=order.paid_at or datetime.now(timezone.utc),
        note="Auto-recorded on full settlement",
    )
    session.add(row)
    session.flush()
    return row


def void_all_payments(session: Session, order_id: int) -> int:
    now = datetime.now(timezone.utc)
    n = 0
    for p in list_active_payments(session, order_id):
        p.voided_at = now
        session.add(p)
        if p.id is not None:
            for alloc in session.exec(
                select(models.OrderPaymentItem).where(
                    models.OrderPaymentItem.order_payment_id == p.id
                )
            ).all():
                session.delete(alloc)
        n += 1
    return n


def void_payment(
    session: Session,
    *,
    order: models.Order,
    payment_id: int,
) -> models.OrderPayment:
    if order.status == models.OrderStatus.paid or order.paid_at:
        raise HTTPException(
            status_code=400,
            detail="Cannot void a payment on a fully paid order; unmark paid first",
        )
    row = session.get(models.OrderPayment, payment_id)
    if not row or row.order_id != order.id or row.tenant_id != order.tenant_id:
        raise HTTPException(status_code=404, detail="Payment not found")
    if row.voided_at is not None:
        raise HTTPException(status_code=400, detail="Payment already voided")
    row.voided_at = datetime.now(timezone.utc)
    session.add(row)
    # Free line allocations so items can be paid again on another leg.
    for alloc in session.exec(
        select(models.OrderPaymentItem).where(
            models.OrderPaymentItem.order_payment_id == payment_id
        )
    ).all():
        session.delete(alloc)
    session.commit()
    session.refresh(row)
    return row
