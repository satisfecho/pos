# Preflight: skip docs_stale SIGNAL when already queued

## GitHub Issues
- **Issue:** (none — enhancement reviewer)
- **0**

## Problem / goal

Preflight emits `SIGNAL docs_stale` for every `docs/*.md` with mtime older than 90 days while code moved. That count stays high even after 008 has already queued per-doc **NEW-0-…** tasks, so the agent loop keeps waking 008 and the reviewer is tempted to invent more doc-status work. With **NEW≈36** already, duplicate SIGNAL noise is harmful.

## Evidence (008 preflight / review)

- Digest: `SIGNAL docs_stale count=14` listing the same basenames (0023, 0018, 0029, 0050, 0025, 0014, 0033, 0019, PRINTING, 0013, 0024, 0007, 0032, 0026, …)
- All 14 SIGNAL basenames already have matching root tasks under `agents2/tasks/NEW-0-20260722-*.md` (verified this run); remaining >90d docs also covered
- Preflight loop: `find docs … | head -20` ages files with no check against open tasks

## High-level instructions for coder

- In `scripts/enhancement-reviewer-preflight.sh`, when classifying a stale doc, **skip** (or count separately as informational) if any root `agents2/tasks/{NEW,FEAT,WIP,UNTESTED,TESTING}-*.md` filename or body already mentions that basename (e.g. `0026-haproxy-ssl-amvara9` / `PRINTING`)
- Keep emitting plain `stale_doc path=…` lines optional for humans; only the **SIGNAL docs_stale** / `G008_DOC_DRIFT` increment should ignore already-queued basenames
- Still SIGNAL truly unqueued stale docs
- Dry-run readonly preflight: with current queue, `SIGNAL docs_stale count` should drop toward 0 (or only list unqueued leftovers)
- Pass criteria: readonly preflight no longer reports `docs_stale` for basenames already owned by open tasks; unqueued stale docs still signal
