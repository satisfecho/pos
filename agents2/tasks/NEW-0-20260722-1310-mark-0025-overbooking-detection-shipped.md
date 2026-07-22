# Mark 0025 overbooking detection doc as shipped

## GitHub Issues
- **Issue:** (none — enhancement reviewer)
- **0**

## Problem / goal

`docs/0025-reservation-overbooking-detection.md` still opens as a **proposal** (“**No code changes yet** – implementation will follow”). Overbooking detection and prevention have shipped: `GET /reservations/overbooking-report`, create/edit **400** on over capacity, reservations UI indicators, reports summary card, and `check_overbooking_0025` / `tests.test_overbooking_0025`. Agents reading the plan think the feature is unstarted.

## Evidence (008 preflight / review)

- `SIGNAL docs_stale` age class (~126d); README Plans row already describes shipped behaviour (“slot capacity, overbooking report, 400 on over capacity”) while the doc body contradicts it
- Code: `get_reservations_overbooking_report` in `back/app/main.py`; `overbooking_slots_count` in `back/app/reports_routes.py`; front reservations + reports UI
- Related open NEW for **seat-math typo** in `0025-test-scenario-one-empty-table.md` — do **not** duplicate that; this task is status framing of the **detection plan** doc only

## High-level instructions for coder

- Edit **only** `docs/0025-reservation-overbooking-detection.md` and the matching **`docs/README.md`** Plans blurb if needed.
- Add a short top banner: **shipped** — point to live API/UI behaviour and the scenario/checker docs (`docs/0025-test-scenario-one-empty-table.md`, `python -m app.seeds.check_overbooking_0025`); treat any remaining “future” bullets as optional polish, not “not implemented”.
- Remove or rewrite the “No code changes yet” claim so it cannot be mistaken for current truth.
- Do not change product overbooking logic; no bulk rewrite of the historical design sections.
- Pass/fail: banner + README agree the feature is live; “No code changes yet” is gone.
