# Fix 008 preflight last_review_iso (use latest stamp)

## GitHub Issues
- **Issue:** (none — enhancement reviewer)
- **0**

## Problem / goal

`scripts/enhancement-reviewer-preflight.sh` computes `last_review_iso` with `head -1` on `agents2/008-enhancement-reviewer/time-of-last-review.txt`. The file is **append-only**, so the first line stays **2026-07-12**. Every later 008 run still reports `days_since_last_review≈9` and `weekly_due=yes`, which keeps re-invoking the enhancement reviewer and encourages more NEW spam even after a full weekly sweep the same day.

## Evidence (008 preflight / review)

- Digest: `last_review_iso=2026-07-12T16:14:00Z`, `days_since_last_review=9`, `weekly_due=yes` while the stamp file already has many **2026-07-22** agent summaries
- Code: `last_review_iso()` → `head -1 "$STAMP_FILE" | grep -oE '^[0-9]{4}-…Z'`
- Preflight also appends `… UTC | 008 preflight | …` lines; agent appends `…Z | FEAT: n | NEW: m | …`

## High-level instructions for coder

- Change `last_review_iso()` to take the **latest** matching ISO timestamp from the stamp file (e.g. `grep -oE … | tail -1`), not the first line
- Prefer lines that look like an agent review summary (`| FEAT:` / `| NEW:`) if both preflight-only and agent lines exist; otherwise latest ISO on any line is acceptable
- Dry-run: `ENHANCEMENT_PREFLIGHT_READONLY=1 bash scripts/enhancement-reviewer-preflight.sh` and confirm `last_review_iso` is today’s latest stamp and `weekly_due=no` when that stamp is under 7 days old
- Do not rewrite historical stamp entries; no product `back/` / `front/` changes
- Pass criteria: after a fresh agent stamp on the same UTC day, readonly preflight shows `weekly_due=no` (unless other SIGNALS still fire)
