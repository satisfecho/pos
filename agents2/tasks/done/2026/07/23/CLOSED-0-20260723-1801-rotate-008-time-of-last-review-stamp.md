---
## Closing summary (TOP)

- **What happened:** Enhancement-reviewer stamp file had grown to ~2000+ lines and needed rotation/size capping (no GitHub issue).
- **What was done:** Added `scripts/rotate-008-time-of-last-review.sh` (default keep 100 lines, archive older stamps), wired it into enhancement-reviewer preflight, and documented the policy.
- **What was tested:** Tester verified stamp ≤100 lines, archive with UTC marker, readonly preflight recent `last_review_iso` / `weekly_due=no`, rotate idempotence, and force keep=40 — overall **PASS**.
- **Why closed:** All test criteria passed.
- **Closed at (UTC):** 2026-07-23 18:07
---

# Rotate / cap 008 time-of-last-review stamp file

## GitHub Issues
- **Issue:** (none — enhancement reviewer)
- **0**

## Problem / goal

`agents2/008-enhancement-reviewer/time-of-last-review.txt` is append-only and has grown to **~2000+ lines** from repeated same-day 008/preflight runs. That bloat makes the stamp hard to skim and contributed to the `head -1` last-review bug (oldest July-12 line kept waking weekly sweeps). Sibling **`NEW-0-20260722-1433-fix-008-preflight-last-review-iso`** fixes **read** semantics only and explicitly says not to rewrite history — this task owns **rotation / size cap** so the file stays operable.

## Evidence (008 preflight / review)

- Weekly sweep 2026-07-23T18:01Z: `weekly_due=yes` with `last_review_iso=2026-07-12…` while the stamp file already has dozens of same-day `2026-07-23T17:*` agent summaries
- `wc -l` ≈ 2187 on `agents2/008-enhancement-reviewer/time-of-last-review.txt`
- Preflight + agent both append; no trim/archive path exists
- Do **not** merge with last-review-iso NEW (read fix) or deep-NEW backlog SIGNAL NEW

## High-level instructions for coder

- Add a small rotation policy (script helper or documented step in `scripts/enhancement-reviewer-preflight.sh` / `docs/agent-loop.md`): keep the last **N** agent review stamps (suggest **50–100** lines, or last **30 days** of `| FEAT:` / `| NEW:` summaries), archive the rest under e.g. `agents2/008-enhancement-reviewer/time-of-last-review.archive.txt` (or dated archive)
- After rotation, ensure `last_review_iso()` (post–1433 fix) still sees the latest agent stamp
- Do not delete product history needed for audits — archive, do not discard silently
- No `back/` / `front/` product changes
- Pass/fail: stamp file line count under the chosen cap after one rotation; readonly preflight still reports a recent `last_review_iso`; archive file contains older lines

## Implementation notes (2026-07-23)

- Added **`scripts/rotate-008-time-of-last-review.sh`**: when stamp exceeds **`ENHANCEMENT_STAMP_KEEP_LINES`** (default **100**), appends older lines to **`agents2/008-enhancement-reviewer/time-of-last-review.archive.txt`** (with UTC marker); cut snaps to an ISO stamp line.
- Wired into **`scripts/enhancement-reviewer-preflight.sh`** (runs before cadence read; skip with **`ENHANCEMENT_STAMP_ROTATE=0`**).
- Documented in **`docs/agent-loop.md`** (008 role) and **`agents2/008-enhancement-reviewer.md`**.
- Gitignored archive path in **`.gitignore`**.
- One-shot rotation applied locally: ~2112 lines archived, active stamp ~91 lines; readonly preflight then reported `last_review_iso=2026-07-23T16:59:45Z`, `weekly_due=no`.
- Left **`last_review_iso()` read fix** to sibling **`NEW-0-20260722-1433-fix-008-preflight-last-review-iso`** (not merged).

## Testing instructions

1. Confirm active stamp is under the keep cap:
   `wc -l agents2/008-enhancement-reviewer/time-of-last-review.txt` → expect **≤ 100** (default keep).
2. Confirm archive exists and holds older history:
   `head -5 agents2/008-enhancement-reviewer/time-of-last-review.archive.txt` → expect a `=== rotated … ===` marker and early lines (e.g. `2026-07-12T…`).
3. Dry-run preflight:
   `ENHANCEMENT_PREFLIGHT_READONLY=1 bash scripts/enhancement-reviewer-preflight.sh`
   Expect `last_review_iso` on **2026-07-23** (or later), `days_since_last_review` small, and (with current stamps) `weekly_due=no`. Rotate message on stderr should be `skip (lines=… <= keep=100)`.
4. Idempotence: `bash scripts/rotate-008-time-of-last-review.sh` again → `skip`; line count unchanged.
5. Optional force: temporarily set `ENHANCEMENT_STAMP_KEEP_LINES=40`, run rotate, confirm more lines moved to archive and active file still starts with an ISO stamp line; restore default keep afterward.

## Test report

- **Date/time (UTC):** 2026-07-23T18:07:10Z start → 2026-07-23T18:07:18Z end
- **Log window:** N/A (script/docs only; no Docker app containers exercised)
- **Environment:** local repo `/Users/raro42/projects/pos2`, branch `development` (synced), no `BASE_URL` / compose (N/A)
- **What was tested:** stamp line-count cap (≤100), archive marker + older history, readonly preflight `last_review_iso` / weekly cadence + rotate skip, rotate idempotence, optional force keep=40 then restore

### Results

1. **Active stamp ≤ keep cap (100)** — **PASS** — `wc -l` = **91** on `agents2/008-enhancement-reviewer/time-of-last-review.txt`
2. **Archive exists with older history** — **PASS** — `head -5` shows `=== rotated 2026-07-23T18:05:57Z moved_lines=2112 kept_lines=91 ===` then `2026-07-12T16:14:00Z | FEAT: …`; archive size ~182KB
3. **Readonly preflight recent last_review_iso** — **PASS** — `last_review_iso=2026-07-23T16:59:45Z`, `days_since_last_review=0`, `weekly_due=no`; stderr `008 stamp rotate: skip (lines=91 <= keep=100)`
4. **Rotate idempotence** — **PASS** — second `bash scripts/rotate-008-time-of-last-review.sh` → `skip (lines=91 <= keep=100)`; before=91 after=91
5. **Optional force keep=40** — **PASS** — `ENHANCEMENT_STAMP_KEEP_LINES=40` archived 60 / kept **31** (≤40, snap to ISO stamp); first line `2026-07-23T17:44:30Z | 008 review stamp`; stamp+archive restored to pre-force state (91 active lines)

### Overall: **PASS**

### Product owner feedback

Stamp rotation works as designed: the active file stays under the default 100-line cap, older history is preserved in the archive with a clear UTC marker, and preflight still reports a same-day `last_review_iso` with `weekly_due=no`. Force-lower keep correctly trims further without breaking the ISO stamp line at the top of the active file.

### URLs tested

N/A — no browser

### Relevant log excerpts

```
008 stamp rotate: skip (lines=91 <= keep=100)
last_review_iso=2026-07-23T16:59:45Z
days_since_last_review=0
weekly_due=no
008 stamp rotate: archived=60 kept=31 archive=.../time-of-last-review.archive.txt
```

(No GitHub issue — enhancement-reviewer task; labels/comments skipped.)
