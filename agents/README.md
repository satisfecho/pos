# POS agent prompts

Markdown prompts for **`cursor-agent`** (see **`pos-agent-loop.sh`**). Paths are relative to **`agents/`**.

| # | File | Role |
|---|------|------|
| 001 | [001-log-reviewer/LOG-REVIEWER-PROMPT.md](001-log-reviewer/LOG-REVIEWER-PROMPT.md) | Log / incident analyst → task files |
| 002 | [002-coder/CODER.md](002-coder/CODER.md) | Implement **NEW-** tasks and continue **WIP-** (`back/`, `front/`) |
| 003 | [003-tester/TESTER.md](003-tester/TESTER.md) | Verify **UNTESTED-** tasks |
| 004 | [004-closing-reviewer/CLOSING-REVIEWER-PROMPT.md](004-closing-reviewer/CLOSING-REVIEWER-PROMPT.md) | Archive **CLOSED-** tasks → **`tasks/done/YYYY/MM/DD/`** |
| 006 | [006-feature-coder/FEATURE-CODER.md](006-feature-coder/FEATURE-CODER.md) | Implement **FEAT-** tasks only |
| 007 | [007-committer/COMMITTER.md](007-committer/COMMITTER.md) | Changelog + version + git on **`development`** |

Workflow: **`docs/agent-loop.md`**. Task rules: **`tasks/README.md`**.

**Git:** Before editing the repo, sync **`development`** with **`./scripts/git-sync-development.sh`** (see **`.cursor/rules/git-development-branch-workflow.mdc`**). **`pos-agent-loop.sh`** runs it at the start of each step unless **`AGENT_GIT_SYNC=0`**.
