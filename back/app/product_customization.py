"""
Product question options parsing, answer validation, and human-readable summaries (issue #50).
Per-option price deltas (#451): choice entries may be strings (delta 0) or
{"label": str, "price_delta_cents": int}. Multi-select stacks (sums) deltas;
unit price is floored at 0; tax uses the adjusted inclusive unit price.
"""

from __future__ import annotations

from typing import Any

from fastapi import HTTPException
from sqlmodel import Session, select

from . import models

# Max text answer length (public menu); aligns with light hardening in docs/0031.
MAX_TEXT_CUSTOMIZATION_LEN = 500
# Absolute max |price_delta_cents| per option (sanity; 10_000.00 in major units).
MAX_ABS_PRICE_DELTA_CENTS = 1_000_000


def choice_options_is_multi(options: dict | list | None) -> bool:
    if isinstance(options, dict):
        return bool(options.get("multi"))
    return False


def parse_choice_option_entry(entry: Any) -> tuple[str, int]:
    """Return (label, price_delta_cents) for a choice option entry."""
    if isinstance(entry, dict):
        label = str(entry.get("label") or entry.get("name") or "").strip()
        raw = entry.get("price_delta_cents", 0)
        try:
            delta = int(raw) if raw is not None else 0
        except (TypeError, ValueError):
            delta = 0
        return label, delta
    label = str(entry).strip() if entry is not None else ""
    return label, 0


def choice_options_entries(options: dict | list | None) -> list[tuple[str, int]]:
    """Return (label, price_delta_cents) pairs for choice options."""
    if options is None:
        return []
    raw: list[Any]
    if isinstance(options, list):
        raw = options
    elif isinstance(options, dict):
        choices = options.get("choices")
        if not isinstance(choices, list):
            return []
        raw = choices
    else:
        return []
    out: list[tuple[str, int]] = []
    for entry in raw:
        label, delta = parse_choice_option_entry(entry)
        if label:
            out.append((label, delta))
    return out


def choice_options_allowed_list(options: dict | list | None) -> list[str]:
    """Return allowed choice labels (single-select list or multi dict)."""
    return [label for label, _ in choice_options_entries(options)]


def choice_options_delta_map(options: dict | list | None) -> dict[str, int]:
    """Map choice label -> price_delta_cents (last wins on duplicate labels)."""
    return {label: delta for label, delta in choice_options_entries(options)}


def format_delta_for_summary(delta_cents: int) -> str:
    """Human-readable signed major-unit amount, e.g. +1.00 or -0.50."""
    sign = "+" if delta_cents >= 0 else "-"
    major = abs(delta_cents) / 100
    if major == int(major):
        return f"{sign}{int(major)}.00"
    return f"{sign}{major:.2f}"


def format_choice_label_for_summary(label: str, delta_cents: int) -> str:
    if not delta_cents:
        return label
    return f"{label} ({format_delta_for_summary(delta_cents)})"


def compute_customization_price_delta_cents(
    questions: list[models.ProductQuestion],
    normalized_answers: dict[str, Any] | None,
) -> int:
    """Sum per-option deltas for normalized answers (multi-select stacks)."""
    if not normalized_answers:
        return 0
    total = 0
    for q in questions:
        if q.id is None or q.type != models.ProductQuestionType.choice:
            continue
        qid = str(q.id)
        val = normalized_answers.get(qid)
        if val is None or val == "" or val == []:
            continue
        deltas = choice_options_delta_map(q.options)
        if isinstance(val, list):
            for label in val:
                total += int(deltas.get(str(label), 0))
        else:
            total += int(deltas.get(str(val), 0))
    return total


def validate_and_normalize_customization_answers(
    session: Session,
    tenant_id: int,
    product_id: int,
    raw_answers: dict[str, Any] | None,
) -> tuple[dict[str, Any] | None, str | None, int]:
    """
    Validate answers against ProductQuestion rows.

    Returns (normalized JSON, snapshot summary, price_delta_cents).
    Raises HTTPException(422) on invalid input.
    """
    questions = session.exec(
        select(models.ProductQuestion).where(
            models.ProductQuestion.tenant_id == tenant_id,
            models.ProductQuestion.product_id == product_id,
        ).order_by(models.ProductQuestion.sort_order, models.ProductQuestion.id)
    ).all()

    if not questions:
        if raw_answers and len(raw_answers) > 0:
            raise HTTPException(
                status_code=422,
                detail="This product has no customization questions",
            )
        return None, None, 0

    q_by_id = {q.id: q for q in questions if q.id is not None}
    if not raw_answers:
        raw_answers = {}

    # Normalize keys to str
    answers: dict[str, Any] = {}
    for k, v in raw_answers.items():
        answers[str(k)] = v

    unknown: list[str] = []
    for k in answers:
        if not k.isdigit():
            unknown.append(k)
        elif int(k) not in q_by_id:
            unknown.append(k)
    if unknown:
        raise HTTPException(
            status_code=422,
            detail=f"Unknown question id(s): {', '.join(unknown)}",
        )

    normalized: dict[str, Any] = {}
    summary_parts: list[str] = []

    for q in questions:
        if q.id is None:
            continue
        qid = str(q.id)
        val = answers.get(qid)

        if q.type == models.ProductQuestionType.text:
            if val is None or val == "":
                if q.required:
                    raise HTTPException(
                        status_code=422,
                        detail=f'Missing answer for question "{q.label}"',
                    )
                continue
            if not isinstance(val, str):
                raise HTTPException(
                    status_code=422,
                    detail=f'Question "{q.label}" expects text',
                )
            text = val.strip()
            if len(text) > MAX_TEXT_CUSTOMIZATION_LEN:
                raise HTTPException(
                    status_code=422,
                    detail=f'Answer for "{q.label}" is too long',
                )
            if not text and q.required:
                raise HTTPException(
                    status_code=422,
                    detail=f'Missing answer for question "{q.label}"',
                )
            if text:
                normalized[qid] = text
                summary_parts.append(f"{q.label}: {text}")

        elif q.type == models.ProductQuestionType.scale:
            allowed = q.options if isinstance(q.options, dict) else None
            if not allowed or "min" not in allowed or "max" not in allowed:
                continue
            try:
                mn = int(allowed["min"])
                mx = int(allowed["max"])
            except (TypeError, ValueError):
                continue
            if val is None:
                if q.required:
                    raise HTTPException(
                        status_code=422,
                        detail=f'Missing answer for question "{q.label}"',
                    )
                continue
            try:
                num = int(val)
            except (TypeError, ValueError):
                raise HTTPException(
                    status_code=422,
                    detail=f'Question "{q.label}" expects a number',
                ) from None
            if num < mn or num > mx:
                raise HTTPException(
                    status_code=422,
                    detail=f'Answer for "{q.label}" must be between {mn} and {mx}',
                )
            normalized[qid] = num
            summary_parts.append(f"{q.label}: {num}")

        elif q.type == models.ProductQuestionType.choice:
            allowed = choice_options_allowed_list(q.options)
            if not allowed:
                continue
            allowed_set = set(allowed)
            delta_by_label = choice_options_delta_map(q.options)
            multi = choice_options_is_multi(q.options)

            if val is None or val == "" or val == []:
                if q.required:
                    raise HTTPException(
                        status_code=422,
                        detail=f'Missing answer for question "{q.label}"',
                    )
                continue

            if multi:
                if not isinstance(val, list):
                    raise HTTPException(
                        status_code=422,
                        detail=f'Question "{q.label}" expects a list of choices',
                    )
                picked = [str(x).strip() for x in val if str(x).strip()]
                # de-dupe preserving order
                seen: set[str] = set()
                unique: list[str] = []
                for p in picked:
                    if p not in seen:
                        seen.add(p)
                        unique.append(p)
                bad = [p for p in unique if p not in allowed_set]
                if bad:
                    raise HTTPException(
                        status_code=422,
                        detail=f'Invalid choice(s) for "{q.label}": {", ".join(bad)}',
                    )
                if not unique and q.required:
                    raise HTTPException(
                        status_code=422,
                        detail=f'Missing answer for question "{q.label}"',
                    )
                if not unique:
                    continue
                unique.sort()
                normalized[qid] = unique
                pretty = ", ".join(
                    format_choice_label_for_summary(u, delta_by_label.get(u, 0)) for u in unique
                )
                summary_parts.append(f"{q.label}: {pretty}")
            else:
                if isinstance(val, list):
                    raise HTTPException(
                        status_code=422,
                        detail=f'Question "{q.label}" expects a single choice',
                    )
                s = str(val).strip()
                if s not in allowed_set:
                    raise HTTPException(
                        status_code=422,
                        detail=f'Invalid choice for "{q.label}"',
                    )
                normalized[qid] = s
                summary_parts.append(
                    f"{q.label}: {format_choice_label_for_summary(s, delta_by_label.get(s, 0))}"
                )

    if not normalized:
        return None, None, 0
    summary = " · ".join(summary_parts)
    if len(summary) > 1024:
        summary = summary[:1021] + "..."
    delta_cents = compute_customization_price_delta_cents(list(questions), normalized)
    return normalized, summary, delta_cents


def customization_dicts_equal(a: dict[str, Any] | None, b: dict[str, Any] | None) -> bool:
    """Deep equality for merge logic (sorted multi-select lists)."""
    if not a and not b:
        return True
    if not a or not b:
        return False
    if set(a.keys()) != set(b.keys()):
        return False
    for k in a:
        va, vb = a[k], b[k]
        if isinstance(va, list) and isinstance(vb, list):
            if sorted(va) != sorted(vb):
                return False
        elif va != vb:
            return False
    return True
