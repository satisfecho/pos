# Mark 0021 working-plan implementation plan as historical

## GitHub Issues
- **Issue:** (none — enhancement reviewer)
- **0**

## Problem / goal

`docs/0021-working-plan-implementation-plan.md` still reads as an open build plan (BetterShift evaluation, “develop the working plan in-house”). The feature shipped; the living guide is **`docs/0021-working-plan.md`**. Agents may treat the implementation-plan file as backlog or invent a second working-plan epic. The two files also share the **`0021-`** numeric prefix.

## Evidence (008 preflight / review)

- `SIGNAL docs_stale` continuation — this basename was **not** in the top-14 list but is >90d and unqueued (earlier 008 runs deferred it)
- Code live: `front/src/app/working-plan/`, schedule APIs, `test:working-plan`; sibling doc `docs/0021-working-plan.md` already has status
- Duplicate prefix: `0021-working-plan.md` + `0021-working-plan-implementation-plan.md` (0015 renumber NEW already owns platform-operator only)

## High-level instructions for coder

- Add a short top banner on **`docs/0021-working-plan-implementation-plan.md`**: **historical / pre-build** — working plan is shipped; use **`docs/0021-working-plan.md`** for current behaviour and ops.
- Optionally rename to a free id (e.g. `0056-…`) **or** leave the filename and note the duplicate in the banner; if renaming, update any `docs/README.md` / cross-links. Prefer minimal change (banner first).
- Do **not** re-open BetterShift integration or rewrite the evaluation narrative.
- Pass criteria: first screenful points readers to the living 0021 guide; no product code changes.
