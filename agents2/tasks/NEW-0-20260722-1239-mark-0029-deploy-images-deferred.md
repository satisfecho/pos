# Mark deploy-via-images plan (0029) as deferred

## GitHub Issues
- **Issue:** (none — enhancement reviewer)
- **0**

## Problem / goal

**`docs/0029-deployment-images-plan-next-month.md`** and its **`docs/README.md`** index row still say **“Todo (next month)”** from March 2026. Production deploy on amvara9 remains build-on-server (see **0001** / **0004**); the “next month” window has passed, so the index misleads operators into thinking image/registry deploy is imminent.

## Evidence (008 preflight / review)

- `SIGNAL docs_stale` — **`docs/0029-deployment-images-plan-next-month.md`** untouched >90d
- `docs/README.md` Plans table: “**Todo (next month):** Deploy via images…”
- 0029 header: **Status: Todo plan (next month)**; related live ops docs (**0001**, **0004**) still describe current compose/build deploy

## High-level instructions for coder

- Status-only edit: set 0029 header (and README index blurb) to **Deferred / not scheduled** (or equivalent), noting current deploy path remains documented in **0001** / **0004**
- Do **not** implement registry/two-slot deploy in this task; do not rewrite the plan body
- Pass criteria: docs index no longer claims “next month”; reader is pointed at current deploy docs
