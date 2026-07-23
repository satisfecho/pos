# Mark 0050 (#52 split plan) as historical

## GitHub Issues
- **Issue:** (none — enhancement reviewer)
- **0**

## Problem / goal

`docs/0050-github-issue-52-split-plan.md` still reads as an active filing plan for umbrella **#52** (“Various topics to enhance”), with copy-paste issue bodies and “after filing, update 0032”. Parent **#52 is CLOSED** (2026-03-23). Agents and operators may treat the doc as live backlog and re-file duplicates.

## Evidence (008 preflight / review)

- `SIGNAL docs_stale` — `docs/0050-github-issue-52-split-plan.md` (~121d untouched)
- `gh issue view 52`: **state=CLOSED**, closedAt **2026-03-23**; comment “This is done”
- `docs/README.md` Plans row still describes 0050 as child-issue specs for filing
- Related: `NEW-0-20260722-1250-roadmap-0032-satisfecho-delivery-shipped.md` updates 0032 only; does not banner 0050

## High-level instructions for coder

- Edit **only** `docs/0050-github-issue-52-split-plan.md` and the matching **`docs/README.md`** Plans blurb.
- Add a short top banner: **historical / closed umbrella** — parent **#52** is closed; do not file the pasted bodies as new issues without product owner review; for current roadmap status prefer **`docs/0032-…`** and shipped feature docs (e.g. **0053**).
- Do not rewrite phases A–E or delete the issue-body drafts; no `gh issue create` in this task.
- Pass/fail: banner + README make closed status obvious; no product code changes.
