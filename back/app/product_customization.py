"""
Product question options parsing, answer validation, and human-readable summaries (issue #50).
"""

from __future__ import annotations

from typing import Any

from fastapi import HTTPException
from sqlmodel import Session, select

from . import models

# Max text answer length (public menu); aligns with light hardening in docs/0031.
MAX_TEXT_CUSTOMIZATION_LEN = 500


def choice_options_is_multi(options: dict | list | None) -> bool:
    if isinstance(options, dict):
        return bool(options.get("multi"))
    return False


def choice_options_allowed_list(options: dict | list | None) -> list[str]:
    """Return allowed choice strings (single-select list or multi dict)."""
    if options is None:
        return []
    if isinstance(options, list):
        return [str(x).strip() for x in options if str(x).strip()]
    if isinstance(options, dict):
        raw = options.get("choices")
        if not isinstance(raw, list):
            return []
        return [str(x).strip() for x in raw if str(x).strip()]
    return []


def validate_and_normalize_customization_answers(
    session: Session,
    tenant_id: int,
    product_id: int,
    raw_answers: dict[str, Any] | None,
) -> tuple[dict[str, Any] | None, str | None]:
    """
    Validate answers against ProductQuestion rows; return normalized JSON and a snapshot summary.
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
        return None, None

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
                summary_parts.append(f"{q.label}: {', '.join(unique)}")
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
                summary_parts.append(f"{q.label}: {s}")

    if not normalized:
        return None, None
    summary = " · ".join(summary_parts)
    if len(summary) > 1024:
        summary = summary[:1021] + "..."
    return normalized, summary


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
