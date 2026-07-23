# Fix pos-cursor-loop prompts that still say agents/tasks

## GitHub Issues
- **Issue:** (none — enhancement reviewer)
- **0**

## Problem / goal

**`agents2/pos-cursor-loop.sh`** is the live orchestrator under **`agents2/`**, but header comments, **closing-review** cursor prompt, and help text still say **`agents/tasks/`** while handoff/committer prompts already say **`agents2/tasks/`**. Closers following the injected prompt can look at the wrong tree (or rely only on the symlink). Small comment/prompt alignment, not a loop redesign.

## Evidence (008 preflight / review)

- Weekly sweep 2026-07-23: docs SIGNAL basenames owned; unqueued theme = orchestrator string drift
- `rg 'agents/tasks' agents2/pos-cursor-loop.sh` — header (~L10), comment ~L353, closing-review prompt ~L778, help `feat`/`closing-review` lines ~L860/L864
- Same file already uses **`agents2/tasks/`** in handoff (~L727) and committer (~L819) prompts
- Related: **`NEW-0-20260723-0752-align-agent-loop-paths-to-agents2`** (docs only); optional move-script comment in **`NEW-0-20260723-1138-…`**

## High-level instructions for coder

- Update **`agents2/pos-cursor-loop.sh`** comments, help, and the **closing-review** prompt string so the live queue is **`agents2/tasks/`**
- Prefer the same wording as the handoff/committer prompts already in this file
- Do **not** change loop scheduling, preflight gates, or product code; do **not** rewrite **`docs/agent-loop.md`** here
- Pass/fail: `rg 'agents/tasks' agents2/pos-cursor-loop.sh` only hits intentional legacy notes (if any); closing-review prompt names **`agents2/tasks/`**
