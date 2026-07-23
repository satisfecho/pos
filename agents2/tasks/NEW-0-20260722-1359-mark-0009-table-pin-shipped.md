# Mark 0009 table PIN security as shipped reference

## GitHub Issues
- **Issue:** (none — enhancement reviewer)
- **0**

## Problem / goal

`docs/0009-table-pin-security.md` describes table activation, 4-digit PIN, shared table order, and optional GPS as if it may still be a design proposal. Core activate / PIN / regenerate / close paths are implemented; without a status banner, agents may re-propose the feature or treat optional GPS as a required gap.

## Evidence (008 preflight / review)

- Doc age >90d (deferred after SIGNAL top-14; no open `NEW-0` for 0009)
- Code: `activate_table`, `regenerate_table_pin`, close/deactivate, “table not accepting orders” guards in `back/app/main.py`; `activated_at` / PIN fields on tables; tenant `latitude` / `longitude` / `location_check_enabled` exist
- `docs/README.md` indexes 0009 under feature/reference without shipped label
- Preflight: weekly_due + `docs_stale` continuation (no bulk rewrite)

## High-level instructions for coder

- Add a top **Status** banner: **shipped** — staff activate / PIN / regenerate / close and public-menu PIN gates are live; treat the rest of the doc as operator/reference.
- Clarify **optional GPS / location_check** in one short note: fields exist; do not start a new GPS product epic from this task — only document whether order-path GPS flagging is on or still optional/unused if easy to verify.
- Soften README index if it reads like an unimplemented plan.
- Pass criteria: first screenful says shipped vs optional GPS; no bulk rewrite; no new PIN/GPS product work.
