# Clarify 0010 reservation plan vs shipped product

## GitHub Issues
- **Issue:** (none — enhancement reviewer)
- **0**

## Problem / goal

`docs/0010-table-reservation-implementation-plan.md` still opens as a **proposal** (“proposes a concrete plan for adding table reservation”) and lists later-phase items (email/SMS confirmations, opening-hours enforcement) without a status banner. Reservations and waiting list have shipped; the living operator guide is **`docs/0011-…`**. Readers may think core reservation work is still unstarted.

## Evidence (008 preflight / review)

- Stale plan doc (~129d) adjacent to `SIGNAL docs_stale` sweep (preflight listed 14 paths; 0010 is same age class and still proposal-framed)
- `docs/README.md` Plans: “implementation plan: scope, reference systems, schema, API” — no shipped/historical cue
- Operator guide + waiting list already updated (`docs/0011-…`; closed waiting-list / 008 reservation-guide work)
- Cross-links from 0011 still useful for API detail — keep the doc, clarify role

## High-level instructions for coder

- Edit **only** `docs/0010-table-reservation-implementation-plan.md` and the matching **`docs/README.md`** Plans blurb.
- Add a short top banner: **shipped core / design history** — for guest/staff how-to use **`docs/0011-table-reservation-user-guide.md`** (incl. waiting list); treat remaining “optional later phase” bullets as backlog ideas, not current gaps in the essential scope.
- Do not re-implement reservations or rewrite the full plan; no product code changes.
- Pass/fail: banner + README distinguish 0010 (history/API design) from 0011 (live guide).
