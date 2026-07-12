---
## Closing summary (TOP)

- **What happened:** Issue #291 asked for a recurring weekly review process that scans the repo for drift and gaps, then creates agent tasks instead of implementing fixes inline.
- **What was done:** Added agent **008** (`agents2/008-enhancement-reviewer.md`), preflight script (`scripts/enhancement-reviewer-preflight.sh`), loop integration in `pos-cursor-loop.sh`, and documentation in `docs/agent-loop.md`; demo reset path documented via existing seeds.
- **What was tested:** Preflight dry-run (`G008_OK=1`, signals digest), agent loop `enhancement` step gating, and presence of 008 docs/scripts — all **PASS**.
- **Why closed:** All tester pass criteria met; enhancement reviewer infrastructure ready for scheduled pipeline use.
- **Closed at (UTC):** 2026-07-12 16:16
---

# Auto enhance and review (weekly improvement agent)

## GitHub Issues
- **Issue:** https://github.com/satisfecho/pos/issues/291
- **291**

## Problem / goal

We want a **recurring review process** (roughly weekly) that checks whether parts of the product or repo are **out of date or improvable**, then **creates tasks** for the existing agent pipeline instead of implementing everything inline.

Examples from the issue:

- Documentation lagging behind recent code changes
- Enhancement ideas (e.g. **automatic daily reset of demo restaurant data** for tenant 1)
- General “what should we improve next?” sweeps across docs, seeds, demo data, and UX

The deliverable is **infrastructure and/or agent prompt** that can run on a schedule, think critically about gaps, and output **`FEAT-`** or **`NEW-`** task files under **`agents2/tasks/`** for coders and feature coders to pick up.

## High-level instructions for coder

- Read **`docs/agent-loop.md`**, **`agents2/TASKS-README.md`**, and existing agent prompts (`agents2/001-gh-reviewer.md`, `010-feature-coder.md`, etc.) to align with the current loop (`pos-agent-loop.sh` / `pos-cursor-loop.sh`).
- Define scope for a **“enhancement reviewer”** agent role: what it scans (open issues, stale docs vs code, demo seed health, changelog/README drift), how often it runs, and what task files it may create.
- Implement the **minimum viable automation**: e.g. a new markdown prompt under **`agents2/`**, optional shell hook in the agent loop, and a **`time-of-last-review.txt`** or similar audit trail pattern (mirror **`agents2/001-gh-reviewer/`**).
- For the **demo data reset** example: investigate existing seeds (`back/app/seeds/`, deploy scripts) and document or prototype an idempotent daily reset path for tenant 1 — either as a separate **`FEAT-`** follow-up or a small seed/cron script if trivial.
- Do **not** bulk-rewrite docs in this task; focus on the **review mechanism** and one concrete example output (task file template + sample findings).
- Append **Testing instructions** when implementation is complete (how to dry-run the reviewer locally without spamming GitHub).

## Implementation summary

- **`agents2/008-enhancement-reviewer.md`** — weekly improvement reviewer role (scans docs/changelog drift, demo seeds, task queue; creates up to 3 **`FEAT-0-*`** / **`NEW-0-*`** tasks).
- **`scripts/enhancement-reviewer-preflight.sh`** — shell preflight emitting **`G008_*`** signals and digest for gating.
- **`agents2/008-enhancement-reviewer/`** — `findings-template.md`, `sample-findings.md` (demo daily reset example), `last-scan.json`, gitignored `time-of-last-review.txt`.
- **`agents2/pos-cursor-loop.sh`** — `step_enhancement_reviewer` in full cycle (after 005); command **`enhancement`** / **`008`**; overrides **`AGENT_ENHANCEMENT_REVIEWER_ALWAYS`**, **`AGENT_008_SKIP_PREFLIGHT`**.
- **`docs/agent-loop.md`** — 008 role and invocation documented.
- **Demo reset:** existing idempotent path documented in prompt/sample — **`back/app/seeds/reset_demo_data.py`**, **`scripts/reset-demo-data-on-server.sh`** (no cron added in this task).

## Testing instructions

### What to verify

1. Preflight dry-run produces a digest with **`G008_*`** summary lines and optional **`SIGNAL`** entries (no task files created).
2. Agent loop **`enhancement`** step runs preflight and either skips cursor-agent (no signals + weekly not due) or would invoke **008** when signals/weekly due (without running a full cursor-agent session in CI).
3. New files exist and **`docs/agent-loop.md`** mentions agent **008**.

### How to test

```bash
# From repo root — dry-run preflight (readonly, no stamp spam if ENHANCEMENT_PREFLIGHT_READONLY=1)
ENHANCEMENT_PREFLIGHT_READONLY=1 bash scripts/enhancement-reviewer-preflight.sh /tmp/008-digest.txt
grep -E '^G008_' /tmp/008-digest.txt
grep SIGNAL /tmp/008-digest.txt || true

# Agent loop step (preflight only; cancel if cursor-agent starts — expected when G008_SIGNALS>0)
cd agents2 && ./pos-cursor-loop.sh enhancement 2>&1 | head -25
```

### Pass criteria

- **PASS** if preflight exits 0 and prints **`G008_OK=1`** plus **`G008_SIGNALS=`** (number).
- **PASS** if digest lists task-queue counts and demo reset script path.
- **PASS** if loop prints **`008 preflight digest:`** path and skip/run message is consistent with **`G008_WEEKLY_DUE`** / signals.
- **PASS** if **`agents2/008-enhancement-reviewer.md`** and **`scripts/enhancement-reviewer-preflight.sh`** exist and are executable.

### Fail criteria

- Preflight script errors or missing **`G008_`** summary.
- Loop missing **`step_enhancement_reviewer`** or **`enhancement`** command not in help.
- No documentation in **`docs/agent-loop.md`** for agent **008**.

## Test report

1. **Date/time (UTC):** 2026-07-12 16:14–16:15 UTC (log window same window; no Docker/browser services required).

2. **Environment:** Local repo on branch `development` (synced via `./scripts/git-sync-development.sh`). Compose files N/A (shell/agent-loop only). `BASE_URL` N/A.

3. **What was tested:** Enhancement reviewer preflight dry-run (`G008_*` digest, SIGNAL lines), agent loop `enhancement` step gating, presence of `008-enhancement-reviewer.md` / `enhancement-reviewer-preflight.sh`, and `docs/agent-loop.md` agent 008 documentation.

4. **Results:**
   - Preflight exits 0 with `G008_OK=1` and `G008_SIGNALS=19` — **PASS** (`ENHANCEMENT_PREFLIGHT_READONLY=1 bash scripts/enhancement-reviewer-preflight.sh /tmp/008-digest.txt`, exit 0).
   - Digest includes task-queue counts (`NEW=1 FEAT=0 WIP=0 UNTESTED=1 TESTING=1`) and demo reset path (`reset_script=scripts/reset-demo-data-on-server.sh`, `seed_module=back/app/seeds/reset_demo_data.py`) — **PASS**.
   - SIGNAL lines present (`changelog_sparse`, `docs_stale`, `demo_tables_check=fail`) — **PASS**.
   - Loop prints `008 preflight digest:` and invokes 008 when `G008_WEEKLY_DUE=1` / `G008_SIGNALS=19` (consistent with preflight) — **PASS** (`./pos-cursor-loop.sh enhancement`).
   - `agents2/008-enhancement-reviewer.md` exists; `scripts/enhancement-reviewer-preflight.sh` executable — **PASS**.
   - `docs/agent-loop.md` documents agent 008 (lines 58, 119) — **PASS**.
   - `step_enhancement_reviewer` and `enhancement`/`008` in loop help — **PASS**.

5. **Overall:** **PASS** (all criteria met).

6. **Product owner feedback:** The weekly enhancement reviewer infrastructure is in place and behaves as designed: preflight produces actionable signals without creating task files in readonly mode, and the agent loop correctly gates or runs 008 based on weekly cadence and signal count. Ready for scheduled use in the agent pipeline.

7. **URLs tested:** N/A — no browser.

8. **Relevant log excerpts:**
   ```
   G008_OK=1
   G008_WEEKLY_DUE=1
   G008_SIGNALS=19
   SIGNAL demo_tables_check=fail (run seed_demo_tables)
   ----- 008 preflight digest: .../008-latest-context.txt
   starting cursor-agent with prompt: 008-enhancement-reviewer.md
   ```

