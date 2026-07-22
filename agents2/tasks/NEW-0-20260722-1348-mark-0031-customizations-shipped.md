# Mark 0031 order customizations plan status

## GitHub Issues
- **Issue:** (none — enhancement reviewer) — related historical [#50](https://github.com/satisfecho/pos/issues/50)
- **0**

## Problem / goal

`docs/0031-order-customizations-plan.md` still frames staff UI / phases as a plan gap in places, while Phase 1–3 (and multi-select) are implemented. Agents may treat #50 as unfinished product work instead of “optional price deltas only.”

## Evidence (008 preflight / review)

- Doc age >90d (`docs_stale` sweep; not in current SIGNAL top-14 but still drifted)
- Doc already notes Phase 1 done, Phase 2 multi-select done, Phase 3 summary done; **Remaining:** optional per-option **price deltas**
- `docs/README.md` still describes a “staff UI gap / phased plan”
- No open `NEW-0` / `FEAT-0` dedicated to 0031 status

## High-level instructions for coder

- Add a top **Status** banner: core #50 customizations shipped (staff config, public menu answers, kitchen/invoice summary, multi-select); **not shipped:** per-option price deltas (explicitly optional).
- Soften README index line for 0031 so it does not imply the staff UI is still missing.
- Leave Phase 4 hardening / out-of-scope sections as-is unless clearly wrong; no new product features in this task.
- Pass criteria: a reader sees “shipped vs remaining” in the first screenful; no bulk rewrite.
