# Mark 0051 table groups MVP as shipped reference

## GitHub Issues
- **Issue:** (none — enhancement reviewer)
- **0**

## Problem / goal

`docs/0051-table-groups-mvp.md` describes join/unjoin floor-plan behaviour without a **shipped** status. Join/unjoin, combined seats, and reservation pool rules are in production (multiple closed issues). Without a banner, agents may re-propose table-group MVP work or treat the doc as an unfinished design.

## Evidence (008 preflight / review)

- Doc age >90d; unqueued in prior 008 sweeps (deferred after SIGNAL top-14)
- Shipped context: closed tasks for join UX, compact tiles, layout restore on join failure (`docs/0051` referenced there)
- Floor plan `/tables/canvas` join/unjoin and reservation capacity rules remain the operator contract

## High-level instructions for coder

- Add a top **Status (shipped)** banner: join/unjoin on the canvas, per-table QR tokens, and reservation pool semantics are live; keep the rest as the behavioural reference.
- Soften any “MVP / future” wording that implies core join is unfinished (one short note for true follow-ups only if already implied — no new epic).
- Index in **`docs/README.md`** if missing or if it reads like an unimplemented plan.
- Pass criteria: first screenful says shipped reference; no floor-plan product changes in this task.
