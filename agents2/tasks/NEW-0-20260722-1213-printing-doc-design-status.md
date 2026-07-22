# Mark docs/PRINTING.md as design / not implemented

## GitHub Issues
- **Issue:** (none — enhancement reviewer)
- **0**

## Problem / goal

**`docs/PRINTING.md`** describes a restaurant-LAN print agent / WebSocket bridge as if it were the product approach, but there is **no** `/api/print-jobs` (or equivalent) implementation in the running app. Kitchen display docs still point here for “follow-up.” Untouched ~124 days, it sits in the stale-docs SIGNAL and can mislead agents into treating printing as shipped work.

## Evidence (008 preflight / review)

- `stale_doc path=docs/PRINTING.md age_days=124`
- `SIGNAL docs_stale count=14` — **PRINTING.md only**; do not rewrite roadmap/plan docs
- `rg` for print-job / print-agent APIs in `back/` / `front/src/` finds design text in docs only (plus kitchen-display cross-link)
- `docs/0015-kitchen-display.md` already calls physical ticket splitting a **follow-up** via PRINTING.md

## High-level instructions for coder

- At the top of **`docs/PRINTING.md`**, add a short **status** banner: design notes / future options; **not implemented** in current POS; browser/invoice print remains the supported path today
- Optionally retitle or add a one-line entry under Reference in `docs/README.md` so the index says “design notes (unimplemented)”
- Do **not** implement a print agent in this task
- Pass criteria: opening PRINTING.md immediately shows unimplemented/design status; no product code changes
