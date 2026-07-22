# Mark 0007 implementation verification as historical

## GitHub Issues
- **Issue:** (none — enhancement reviewer)
- **0**

## Problem / goal

`docs/0007-implementation-verification.md` is a point-in-time pass report (dated **2026-01-13**) against `0008-order-management-logic.md`, with hard-coded `main.py` line numbers. It still appears as a live ops/verification doc while the codebase has moved; agents may treat stale line refs as current truth.

## Evidence (008 preflight / review)

- `SIGNAL docs_stale` — `docs/0007-implementation-verification.md` (~129d untouched)
- Header: “Date: 2026-01-13”; cites specific line ranges in `back/app/main.py`
- Order/delivery surfaces have changed substantially since (Satisfecho Delivery, courier, waiting list, etc.) — this report is not a living checklist
- Related design/alternatives doc `docs/0013-verification-alternatives.md` is a separate research note (out of scope for this task)

## High-level instructions for coder

- Edit **only** `docs/0007-implementation-verification.md` (and a one-line `docs/README.md` index clarification if needed).
- Add a short banner at the top: **historical verification snapshot** as of 2026-01-13; do not use line numbers as current source of truth; for current order behaviour prefer `docs/0008-…` / current code / tests.
- Do not re-run the full verification matrix or rewrite the checklist body.
- Pass/fail: banner present; date/purpose clear; no bulk rewrite of PASS/FAIL sections; no product code changes.
