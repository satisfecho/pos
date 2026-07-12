# Agent loop — mac-stats-reviewer–style process for POS

This document defines a **multi-agent workflow** for this repository, modeled on the **mac-stats-reviewer** companion project (local reference: `~/projects/mac-stats-reviewer`). That project separates **coordination** (`mac-stats-reviewer`: tasks, prompts, optional autoresearch) from **implementation** (`mac-stats`). **POS is a single repo**: application code and agent coordination both live here; the split is **logical** (roles and folders), not two git roots.

**Sources in mac-stats-reviewer used as basis:** root `README.md` (agents overview, hourly commits — *not* adopted verbatim for POS), `agents/tasks/README.md` (task pipeline), and agent prompts under `agents/001-log-reviewer/` … `agents/007-committer/` (roles and handoffs). Optional **Track A autoresearch** (`agents/autoresearch/README.md`, `RUN_24H_*.md`) is **out of scope** for initial POS adoption unless you explicitly port tooling.

---

## Goals

- **Traceable work:** Each change flows through named stages (task file renames), like mac-stats-reviewer’s inbox pipeline.
- **Separation of concerns:** Review/analysis agents do not implement; coders implement; testers verify with evidence; closing reviewer archives; committer handles changelog/version only.
- **POS alignment:** Follow **`AGENTS.md`**, **`.cursor/rules/`** (catalog: **`docs/agent-cursor-rules.md`**), Docker-based backend tests, Puppeteer smokes (**`docs/testing.md`**), and **no new host installs** (see user/project rules).

---

## Git branching and production (essential)

This is **part of the agent strategy**, not optional tooling guidance.

| Branch | Role |
|--------|------|
| **`development`** | **Default for all routine work.** Agents commit here and **`git push origin development`**. |
| **`master`** | **Production line** (deployments such as amvara9 typically follow **`master`**). Updated **only** when promoting from **`development`**. |

### When to merge `development` → `master` (and push `master`)

Merge **only** if **at least one** applies:

1. **~2-hour cadence** — Batch integrate tested commits from **`development`** into **`master`** about every **two hours** (operator or scheduler). Avoid merging **every** small commit individually.
2. **Big production change** — Material impact: security, payments, data integrity, critical user-visible breakage, blocking migrations, multi-tenant risk, etc. Document why in commit/PR.
3. **Urgent / explicit production** — The **GitHub issue** or **human** says **urgent**, **hotfix**, **production**, **deploy now**, or similar. Use label **`production-urgent`** on the issue when applicable so agents and humans agree on intent.

If **none** of the above applies: **push `development` only**; do **not** merge to **`master`**.

**Cursor / agents:** **`.cursor/rules/git-development-branch-workflow.mdc`** (`alwaysApply: true`) encodes this; it overrides looser “push master every time” habits.

**Committer agent:** Changelog and version bumps happen on **`development`**; merging to **`master`** is a **separate** step that follows the table above.

### Sync before edits (multi-agent)

Multiple agents push to **`development`**. **Before any step that edits the repo** (application code, **`agents/tasks/*.md`**, **`CHANGELOG.md`**, etc.), integrate the latest remote state:

- **Humans / Cursor without the shell loop:** run **`./scripts/git-sync-development.sh`** from the repo root (or the equivalent **`git fetch`** + **`git pull --rebase --autostash origin development`** on **`development`**).
- **`pos-agent-loop.sh`:** runs that script **at the start of each agent step** (001, 006×5, 002, 003, 004, 007). Set **`AGENT_GIT_SYNC=0`** only to skip (offline debugging).
- **Before push:** pull/rebase again after your commit so **`git push origin development`** does not regress or race another agent.

This is **remote integration** (fetch/pull/rebase), not “open a GitHub PR before every edit.” Use normal PRs when your team wants human review before merging a branch; day-to-day **`development`** still needs **pull/rebase** so agents do not overwrite each other’s work.

---

## Roles (mapping from mac-stats-reviewer)

| mac-stats-reviewer agent | POS role | Typical inputs | Writes / edits |
|--------------------------|----------|----------------|----------------|
| **001 Log reviewer** (`001-gh-reviewer.md`) | **GitHub → FEAT; logs → NEW** | **Issues:** up to **3 × `FEAT-…`** / run for **feature coders** (×5 in loop). **Logs:** **`NEW-…`** only for concrete Docker log incidents | **`agents/tasks/`** only. **`gh`** on **`satisfecho/pos`** issues. See **001** prompt — never use **`NEW-`** for GitHub-sourced work. |
| **005 Marketing repos reviewer** (`005-marketing-repos-reviewer.md`) | **NNN_slug org repos → register / deploy / FEAT-MKT** | Preflight scans **`satisfecho/*`** repos named **`NNN_slug`** (e.g. **`083_wimpi`**) for pushes and open issues | **`config/marketing-sites.json`**, **`front/sites/<slug>/`**, **`FEAT-MKT-…`** tasks; triggers **`Deploy to amvara9`** when bundles change. Live at **`https://www.satisfecho.de/<slug>/`**. |
| **008 Enhancement reviewer** (`008-enhancement-reviewer.md`) | **Weekly repo health → FEAT-0 / NEW-0** | Preflight scans docs/changelog drift, demo seeds, task-queue depth (~7d cadence) | **`agents2/tasks/`** only (**`FEAT-0-*`**, **`NEW-0-*`**); digest **`$AGENT_LOOP_TMP/008-latest-context.txt`**. Override: **`AGENT_ENHANCEMENT_REVIEWER_ALWAYS=1`**. |
| **002 Coder** (`002-coder-backend/CODER.md`) | **Implementer (main)** | **NEW** → **wip**; also continues **wip** when no **NEW** (orchestrator runs this step if **`NEW-*.md`** or **`WIP-*.md`** exists) | **`back/`**, **`front/`**, tests; task file status + **Testing instructions**; then **untested**. |
| **006 Feature coder** (`010-feature-coder.md`) | **Implementer (FEAT queue)** | **`FEAT-*.md`** (including **`FEAT-MKT-*`** for marketing repos) → **wip** | POS **`back/`/`front/`** or sibling marketing repo per task. |
| **003 Tester** (`TESTER.md`) | **Verifier** | **untested** → **testing** | Appends **Test report**; **closed** or back to **wip** on failure. Uses **`pytest`** (Docker), **`node front/scripts/…`**, **`npm run test:*`** per task. |
| **004 Closing reviewer** (`CLOSING-REVIEWER-PROMPT.md`) | **Archivist** | **closed** tasks | Prepends **Closing summary**; moves file to **`agents/tasks/done/YYYY/MM/DD/`** (date from `CLOSED-YYYYMMDD-…`; use **`scripts/move-agent-task-to-done.sh`**). |
| **007 Committer** (`040-committer.md`) | **Changelog / version / commit** | `git status` in POS root | **`CHANGELOG.md`**, version bump; **stages and commits** finished work on **`development`**; **`Refs #N`** in message; **`scripts/link-commit-to-github-issues.sh`** comments on issues after push. Does **not** rewrite app logic. |

**Orchestrator / security / release-watcher** (mentioned in mac-stats-reviewer `README.md`): optional Cursor threads or human; not required for POS unless you add matching `PROMPT-*.md` files under `agents/`.

---

## Task workflow (from `agents/tasks/README.md`)

Adapted filename pattern and statuses — **same semantics** as mac-stats-reviewer.

### Filename pattern

`<STATUS>-<YYYYMMDD-HHMM>-<slug>.md`  
Examples: `FEAT-20260323-1030-github-issue-50.md` (GitHub → feature coder), `NEW-20260323-1100-haproxy-503-logs.md` (logs → main coder), `WIP-20260323-1200-fix-rate-limit-banner.md`

### Statuses

| Status | Meaning | Who moves it |
|--------|---------|----------------|
| **new** | Defined, not started | Coder picks → **wip** |
| **feat** | Feature-sized task (optional) | Feature coder picks → **wip** |
| **wip** | Active implementation | Coder → **untested** when done + testing instructions added |
| **untested** | Ready for verification | Tester → **testing** |
| **testing** | Under test | Tester → **closed** (pass) or **wip** (fail) |
| **closed** | Verified | Closing reviewer prepends summary → archives under **`agents/tasks/done/YYYY/MM/DD/`** (same basename; full date from `CLOSED-YYYYMMDD-…`). Use **`./scripts/move-agent-task-to-done.sh`**. |

### Flow

```text
  new   ─┐
         ├─→  wip  →  untested  →  testing  →  closed  →  (done/YYYY/MM/DD/)
  feat  ─┘
```

**Rules of thumb (no skipping):**

- **new/feat → wip** when work starts (one clear owner per task in **wip**).
- **wip → untested** only after **Testing instructions** are appended (What to verify / How to test / Pass–fail criteria), same structure as mac-stats-reviewer’s coder prompt.
- **untested → testing → closed** (or **testing → wip** for rework).
- **closed → done/YYYY/MM/DD/** after closing reviewer adds the **Closing summary** at the **top** of the file (see **Done archive layout** below).

**Tester loop protection (from `TESTER.md`):** if the same task fails verification more than **three** times, stop cycling; document in **Test report**, close per team policy (mac-stats-reviewer moves to **closed** with explanation).

**Deploy-blocker archive:** when prod verification **FAIL**s only because the fix is on **`development`** but not yet on **`master`** / amvara9 (failed or blocked **Deploy to amvara9**), do **not** keep cycling **testing → wip → untested**. Archive the task (**`CLOSED-…`** → **`done/YYYY/MM/DD/`**) with a **Closing summary** noting the deploy blocker; resume after promotion + green deploy (see **#212** / **WIP-195**).

---

## Agent loop script (`agents/pos-agent-loop.sh`)

Same idea as **mac-stats-reviewer** `agents/run.sh`, but named for clarity: one entrypoint to run **log reviewer (001) → feature coder (up to ×5) → coder → tester → closing reviewer → committer** on a timer, or single steps.

| Invocation | Behaviour |
|------------|-----------|
| **`./agents/pos-agent-loop.sh`** | Full cycle every **`AGENT_LOOP_SLEEP_MINUTES`** (default **5**); requires **`cursor-agent`** on `PATH`. |
| **`./agents/pos-agent-loop.sh log`** (or **`log-reviewer`**, **`001`**) | Run **001** log / incident reviewer **only if** the shell preflight finds work: open GitHub issues not yet linked from a root **`agents/tasks/*.md`** (`#NN` / `issues/NN`), or Docker log lines matching incident heuristics. Otherwise **001** skips **`cursor-agent`** (saves tokens). Digest: **`$AGENT_LOOP_TMP/001-latest-context.txt`** (default **`$TMPDIR/pos-agent-loop/`**). Override: **`AGENT_LOG_REVIEWER_ALWAYS=1`** or **`AGENT_001_SKIP_PREFLIGHT=1`**. |
| **`./agents/pos-agent-loop.sh marketing`** (or **`mkt`**, **`005`**) | Run **005** marketing repos reviewer **only if** preflight finds new/changed **`NNN_slug`** org repos, deploy candidates, or untracked issues in those repos. Digest: **`$AGENT_LOOP_TMP/005-latest-context.txt`**. Override: **`AGENT_MARKETING_REVIEWER_ALWAYS=1`** or **`AGENT_005_SKIP_PREFLIGHT=1`**. |
| **`./agents/pos-agent-loop.sh enhancement`** (or **`enhance`**, **`008`**) | Run **008** enhancement reviewer **only if** preflight finds weekly due (**≥7d** since last stamp) or improvement **SIGNAL** lines (docs drift, demo seeds, queue backlog). Digest: **`$AGENT_LOOP_TMP/008-latest-context.txt`**. Override: **`AGENT_ENHANCEMENT_REVIEWER_ALWAYS=1`** or **`AGENT_008_SKIP_PREFLIGHT=1`**. |
| **`./agents/pos-agent-loop.sh coder`** | Run coder step if **`NEW-*.md`** or **`WIP-*.md`** exists (and prompt file present). Prefer finishing **NEW** first; **WIP** continues in-progress work. |
| **`./agents/pos-agent-loop.sh tester`** | Run tester if **`UNTESTED-*.md`** or in-progress **`TESTING-*.md`** exists (so interrupted runs are not stuck). |
| **`./agents/pos-agent-loop.sh feat`** | Run feature coder if **`FEAT-*.md`** exists. |
| **`./agents/pos-agent-loop.sh closing-review`** | Run closer if **`CLOSED-*.md`** still in **`agents/tasks/`**. |
| **`./agents/pos-agent-loop.sh committer`** | Run committer if POS repo has unstaged/staged changes. |
| **`./agents/pos-agent-loop.sh help`** | Usage. |

**001 — if `gh issue list` fails:** preflight retries with **`gh api repos/<owner>/<repo>/issues?state=open&per_page=40`** (issues only, PRs excluded) so **`G001_UNTRACKED_ISSUES`** and the digest can still see new work when the REST call succeeds.

**001 — GitHub not authenticated:** If **`gh`** stderr indicates **401** / bad credentials, **`pos-agent-loop.sh`** prints a **stderr banner** on the console and sets **`G001_GH_AUTH_FAILED=1`** in the digest summary; **`gh` stderr** is appended under **`=== gh issue list stderr ===`** / **`gh api`** sections.

**Git:** **`scripts/git-sync-development.sh`** runs only when a step actually has work (unless **`AGENT_GIT_SYNC=0`**): **001** syncs only when its preflight gate opens; **002–004 / 006–007** sync only when their queue (or, for **007**, uncommitted changes) is non-empty. See **Sync before edits (multi-agent)** above.

**Token-saving gates:** **002 / 003 / 004 / 006 / 007** skip **`cursor-agent`** and **skip git sync** when there is no matching task file at **`agents/tasks/`** root or (committer) no unstaged/staged diff. For **003**, “matching” means **`UNTESTED-*.md`** or **`TESTING-*.md`** (unfinished test runs stay in the queue). **006** runs at most five times per cycle and **stops the FEAT batch early** when no **`FEAT-*.md`** remains. **001** adds a **preflight digest** (issues + log heuristics). **Committer** in **`agents2/pos-cursor-loop.sh`** runs **`040-committer.md`** via **`cursor-agent`** by default when there are non-stamp changes (**`AGENT_COMMITTER_USE_CURSOR`** default **1**). Stamp-only trees still use local git (**`AGENT_COMMITTER_LOCAL`**). After a new commit, **`scripts/link-commit-to-github-issues.sh`** posts on linked GitHub issues.

**Wall-clock limits (stuck-loop guard):** **`agents2/pos-cursor-loop.sh`** wraps every **`cursor-agent`** invocation with a per-step timeout (GNU **`timeout`** when on `PATH`, else a bash fallback). Defaults: **`AGENT_CURSOR_TIMEOUT_MINUTES=25`** for most steps; **`AGENT_TESTER_TIMEOUT_MINUTES=32`** for **003** (deploy polling + production checks). On timeout (exit **124**) the orchestrator logs and **continues the loop** (same as a non-zero exit); **`TESTING-*.md`** / **`WIP-*.md`** are picked up on the next cycle. Set **`AGENT_CURSOR_TIMEOUT=0`** to disable limits. Legacy **`run-agents.sh`** used **`timeout 15m`** for **goose**; the cursor loop had no equivalent until this guard.

**Further token / cost ideas (not all implemented):**

- **Raise `AGENT_LOOP_SLEEP_MINUTES`** when the queue is usually empty — fewer full cycles.
- **`AGENT_GIT_SYNC=0`** on a laptop loop — saves network; use when you know nobody else is pushing.
- **Committer (`agents2/pos-cursor-loop.sh`):** **`AGENT_COMMITTER_USE_CURSOR`** defaults to **1** — **`cursor-agent`** runs **`040-committer.md`** when there are uncommitted changes (except stamp-only: **`agents2/001-gh-reviewer/time-of-last-review.txt`** alone still commits locally via **`AGENT_COMMITTER_LOCAL`**). The committer commits when work looks complete, writes a human-readable **`CHANGELOG.md`**, includes **`Refs #N`** in the commit message, and the loop runs **`scripts/link-commit-to-github-issues.sh`** after a new commit. Set **`AGENT_COMMITTER_USE_CURSOR=0`** only to disable automatic cursor committer.
- **Local LLM (Ollama → llama.cpp):** **`cursor-agent`** is still required for steps that edit **`back/`**, **`front/`**, and run tools inside Cursor. Local models cannot replace that without a separate “apply patch + run tests” runner. What *does* help is **cheap triage** and, by default, no `cursor-agent` for log-only noise when GitHub preflight succeeded and there are no untracked issues (**`AGENT_001_LOCAL_LOG_REVIEWER`**, default on — see below). Local model **`SKIP`** still clears **`G001_LOG_SIGNALS`** when triage runs; **`ESCALATE`** no longer forces **`cursor-agent`** in that log-only + empty-queue case unless **`AGENT_001_LOCAL_LOG_REVIEWER=0`**:
  - **`AGENT_001_LOCAL_LOG_REVIEWER`** (default **not 0**): **`agents2/pos-cursor-loop.sh`** does **not** invoke **`cursor-agent`** for **001** when **`G001_GH_OK=1`**, **`G001_UNTRACKED_ISSUES=0`**, and **`G001_LOG_SIGNALS=1`** (Docker heuristics only, GitHub queue empty). **Preflight** and optional **Ollama/llama triage** still run; a one-line stamp is appended to **`agents2/001-gh-reviewer/time-of-last-review.txt`** and the digest gets **`=== 001 cursor-agent skipped (local log reviewer) ===`**. Set **`AGENT_001_LOCAL_LOG_REVIEWER=0`** to restore **`cursor-agent`** for that case (e.g. you want the agent to draft **NEW-*** from logs). **`cursor-agent`** still runs for **`G001_UNTRACKED_ISSUES` > 0**, **`AGENT_LOG_REVIEWER_ALWAYS`**, **`AGENT_001_SKIP_PREFLIGHT`**, or **`AGENT_001_RUN_WHEN_GH_UNKNOWN`** when those gates apply.
  - **On by default** when **`scripts/agent-ollama-log-triage.sh`** can run (**`AGENT_001_OLLAMA_LOG_TRIAGE≠0`**): **default order** is **`ollama run`** first (**`OLLAMA_MODEL`** default **`Gemma4:latest`**), then **llama.cpp** OpenAI-compatible **`POST …/chat/completions`** (default **`http://127.0.0.1:8080/v1`**, **`Bonsai-8B.gguf`**) if Ollama is empty or missing. Set **`AGENT_001_LLAMA_CPP_FIRST=1`** for **llama.cpp first** (previous behavior). If the primary reply has no clear **`ESCALATE`** / **`SKIP`**, the script tries the **other** backend once before defaulting to escalate. The prompt asks for a **final line** with only **`SKIP`** or **`ESCALATE`**. The loop passes **`OLLAMA_MODEL`** into the triage script. **`OLLAMA_HOST`** defaults to **`http://127.0.0.1:11434`** only when **unset**. Set **`AGENT_001_LOG_TRIAGE_DEBUG=1`** for **stderr** from **`python3`** and **`ollama run`**. Triage is **available** if **`GET …/v1/models`** succeeds and **`python3`** exists, **or** **`ollama list`** shows ≥1 model (**`OLLAMA_HOST`** respected in **`agents2/pos-cursor-loop.sh`**). **`AGENT_001_SKIP_LLAMA_CPP=1`** uses **Ollama only**. Log triage runs only when **Docker heuristics** would trigger **001** and **there are zero untracked GitHub issues** (issues path unchanged — no missed **FEAT** from local LLM).
  - **Ollama model:** repo default for triage is **`Gemma4:latest`** (**`OLLAMA_MODEL`**). Other **`ollama list`** examples: **`qwen2.5:1.5b`**, **`nemotron-3-nano:4b`**, **`huihui_ai/granite3.2-abliterated:2b`** for speed; **`qwen3.5:4b`** / **`gemma3:latest`** for alternatives; **`qwen2.5-coder:latest`** only if you later add code-shaped local steps (heavier).
- **Possible future:** local model drafts **closing summaries** (**004**) or **commit messages** as text-only, then a thin shell step writes the file — still needs review for quality and safety.

**Docker / stack:** still start with repo-root **`./run.sh`** or **`./run.sh -dev`** — this script does **not** replace the POS application runner.

**Prompts:** steps **skip** if the corresponding markdown under **`agents/001-log-reviewer/`**, **`agents/002-coder/`**, **`003-tester/`**, etc. is missing. Steps also skip if **`cursor-agent`** is missing (single commands); the **infinite loop** exits immediately if **`cursor-agent`** is not installed.

---

## Where files live in POS (target layout)

Prompt markdown lives under **`agents/00*-*/*/`** (see **`agents/README.md`**). **`tasks/`** holds active task files.

```text
agents/
  README.md              # Index of prompts
  pos-agent-loop.sh      # Orchestrator (mac-stats-reviewer style); see section above
  tasks/
    README.md              # Copy/adapt from mac-stats-reviewer agents/tasks/README.md
    done/                  # Archived CLOSED-* tasks: done/YYYY/MM/DD/ (see README)
    inbox/                 # Optional: orchestrator-only queue (mac-stats-reviewer pattern)
  001-log-reviewer/
    LOG-REVIEWER-PROMPT.md # Adapt: Docker logs + POS docs, not ~/.mac-stats/debug.log
  002-coder/
    CODER.md               # Adapt: implement under back/, front/; read docs/ first
  003-tester/
    TESTER.md              # Adapt: pytest + Puppeteer; BASE_URL, HEADLESS
  004-closing-reviewer/
    CLOSING-REVIEWER-PROMPT.md
  007-committer/
    COMMITTER.md           # Adapt: CHANGELOG + front/package.json (not Cargo.toml)
  # Optional:
  006-feature-coder/
    FEATURE-CODER.md
```

**Prompt authoring:** Start from the markdown in `~/projects/mac-stats-reviewer/agents/` and replace paths (`~/projects/mac-stats` → this repo root), log locations (**Docker** and **`docs/error-investigation-workflow`**), and stack commands (**`docker compose`**, **`front/scripts/`**).

### Done archive layout (by calendar day)

Unlike a flat **`done/`** folder, POS keeps closed tasks under **`agents/tasks/done/<YYYY>/<MM>/<DD>/`**. The full calendar date comes from the **`YYYYMMDD`** segment in the filename (e.g. `CLOSED-20260323-1200-slug.md` → **`done/2026/03/23/`**), so **one folder per day**: all tasks whose `CLOSED-` stamp uses that day are grouped together. Put the **actual finish / closure day** in `YYYYMMDD` when naming **`CLOSED-…`** files so the archive matches “work done that day.”

- **Closing reviewer** (or operator): after prepending the closing summary, run  
  **`./scripts/move-agent-task-to-done.sh agents/tasks/CLOSED-….md`**
- Details: **`agents/tasks/README.md`**, **`agents/tasks/done/README.md`**

---

## Verification and long-running automation

- **Per task:** Tester follows **Testing instructions**; prefer scripts already listed in **`docs/testing.md`** and **`AGENTS.md`** (Puppeteer, `pytest` in container).
- **After substantive edits (including agent work):** Minimum smoke: HTTP 200 on app URL or **`npm run test:landing-version`** with **`BASE_URL`**; if Angular touched, check **`docker compose … logs --tail=80 front`** for compile errors (**`AGENTS.md`**).
- **Long-running pull + test loop (already in POS):** **`scripts/go-ahead-loop.sh`** — `git pull --rebase --autostash`, Docker **pytest**, **`npm run test:landing-version`**. Opt-in **`GO_AHEAD_LOOP=1`**. See **`docs/testing.md`** (section *Long-running smoke loop*). Run it from a **`development`** checkout so pulls match the integration branch. This is **not** a substitute for task-driven testing; it complements it like a release health cadence.

---

## Committer differences (POS vs mac-stats)

mac-stats-reviewer’s committer edits **`CHANGELOG.md`** and **`src-tauri/Cargo.toml`** in **mac-stats**. For POS:

- Update **`CHANGELOG.md`** under **`[Unreleased]`** (Keep a Changelog style).
- Version source: **`front/package.json`** and **`front/package-lock.json`** (see **`.cursor/rules/commit-changelog-version.mdc`**).
- **Does not rewrite** application source; **does** `git add` / commit coder output when ready.
- **Branch policy:** commit on **`development`**; **`git push origin development`**. Merge to **`master`** only per **Git branching and production** above — not on every committer run.
- **Issues:** after push, **`./scripts/link-commit-to-github-issues.sh`** (also invoked by the loop) comments on issues linked from **`agents2/tasks/`** files in the commit.

Optional: track last version bump time in **`agents/007-committer/last-version-bump.txt`** if you want mac-stats-reviewer’s “at most twice a day” style cap.

---

## GitHub Issues integration (optional)

**Is it possible?** **Yes.** [Issues for this repo](https://github.com/satisfecho/pos/issues) can be updated from the agent workflow using the **GitHub REST API** or the **`gh` CLI**, as long as a credential with permission to read/write issues is available (see **Authentication** below). Issues do **not** have a built-in “WIP” field; use **labels** (and/or **GitHub Projects** “Status”) so each role can signal state in a consistent, machine-friendly way.

### Authentication (required for updates)

- **Fine-grained PAT** or **classic PAT** with **Issues** read/write on `satisfecho/pos`, **or** **`gh auth login`** on the machine running the agent.
- Expose to tools as **`GH_TOKEN`** / **`GITHUB_TOKEN`** (many tools accept either). **Never** commit tokens; use shell env, CI secrets, or local keychain via `gh`.
- In **GitHub Actions**, the default `GITHUB_TOKEN` can comment and label on the same repo when workflows are enabled.

### Linking a task file to an issue

At the top of each task markdown (or immediately under the title), add a stable pointer:

```markdown
## GitHub
- **Issue:** https://github.com/satisfecho/pos/issues/NN
```

The **reviewer** uses the [issue list](https://github.com/satisfecho/pos/issues) as the **input backlog**. When they create the feature/task file, they record **`NN`** in that section (and optionally quote the issue title in the task body).

### Suggested labels (create once in the repo)

| Label | Meaning |
|--------|--------|
| **`agent:planned`** | Task file exists; scoped for implementation (reviewer handoff). |
| **`agent:wip`** | Coder or feature coder is implementing (rename task to **wip** in sync with this). |
| **`agent:testing`** | Tester is running **Testing instructions** (task in **testing**). |
| **`production-urgent`** | Issue may be merged to **`master`** immediately (bypasses normal 2h batch only in the sense of *intent* — still follow tests/review). |

Adjust names to taste (`status/planned`, etc.); keep them **documented here** so every agent uses the same set.

### Role → GitHub actions (recommended)

| Role | When | Update the issue |
|------|------|------------------|
| **Reviewer** (001 / planning) | After creating **`FEAT-…`** for issue **#NN** (never **`NEW-`** for GitHub) | Comment: link **`agents/tasks/FEAT-…md`**; label **`agent:planned`**. Optionally remove **`agent:needs-triage`**. |
| **Coder** & **Feature coder** | When renaming task **new/feat → wip** | Add comment: “Implementation started”; **`agent:planned` → `agent:wip`** (remove planned, add wip). |
| **Tester** | When renaming **untested → testing** | Add comment: “Verification started” (commands/env if useful); **`agent:wip` → `agent:testing`**. |
| **Committer** (040) | After **`git push origin development`** for a commit that includes related task files | Comment via **`scripts/link-commit-to-github-issues.sh`** (commit link + subject); commit message should include **`Refs #NN`**. |
| **Closer** | After **Test report** is **PASS** and task is **closed**, before/after `move-agent-task-to-done.sh` | Comment: one-paragraph outcome + pointer to merged commit or PR if applicable; remove **`agent:testing`** / **`agent:wip`**. **Close the issue** if the feature is fully delivered and tracked only here; **leave open** if the issue is a parent epic or has follow-ups (say so in the comment). |

On **test failure** (**testing → wip**), the tester should comment on the issue with what failed and keep or restore **`agent:wip`** as appropriate.

### Example `gh` commands (run from any directory)

```bash
export GH_TOKEN=…   # or rely on `gh auth login`

gh issue list --repo satisfecho/pos --state open --limit 30

gh issue comment 50 --repo satisfecho/pos --body "Task file: agents/tasks/FEAT-20260323-1030-order-tip.md — planned for implementation (feature queue)."

gh issue edit 50 --repo satisfecho/pos --add-label "agent:planned"

gh issue edit 50 --repo satisfecho/pos --remove-label "agent:planned" --add-label "agent:wip"
```

Equivalent **HTTP** calls are documented in [GitHub REST: Issues](https://docs.github.com/en/rest/issues/issues).

### Limits and expectations

- **Agents do not talk to GitHub by default** — prompts must instruct the agent to run **`gh`** or **`curl`** (with token), or a human performs the issue update alongside the task rename.
- **Rate limits** apply; batch comments sparingly.
- **Parent/child issues:** if one task maps to a **single** GitHub issue, keep a **1:1** link in the task file. If one issue spans multiple tasks, note that in comments and link each task file from the issue thread.

---

## What we are not copying blindly

| mac-stats-reviewer item | POS note |
|-------------------------|----------|
| **Hourly `launchd` commits** | Not required; POS uses explicit commits. |
| **Dual-repo workspace** (`mac-stats-agent-workspace.code-workspace`) | Single repo unless you split a `pos-reviewer` clone later. |
| **`cursor-agent < PROMPT.md`** | Use Cursor Chat/Agent with `agents/.../*.md` open or pasted; CLI availability varies. |
| **`start-all-agents.sh` + per-agent inboxes** | Optional later; start with one **`agents/tasks/`** folder and README. |
| **Track A autoresearch / Ollama autopilot** | Separate infrastructure; document only in **`docs/agent-loop.md`** until you port or reference externally. |

---

## Autoresearch (optional reference)

mac-stats-reviewer’s **`agents/autoresearch/README.md`** describes **Track A**: mutate only `<!-- TRACK_A_AUTORESEARCH_* -->` blocks in agent markdown, judge/mutate loop, optional 24h runs. **POS does not include this harness.** If you add it, keep POS-specific suites (e.g. “tester must cite `BASE_URL` and Docker compose files”) and do not require cloud Ollama unless policy allows.

---

## Implementation checklist (for maintainers)

1. **`agents/tasks/README.md`** and **`agents/tasks/done/README.md`** define the pipeline and **`done/YYYY/MM/DD/`** layout; use **`scripts/move-agent-task-to-done.sh`** when archiving.
2. **Prompts** ship in **`agents/0*.md`**; refine them as needed.
3. **Link from** **`AGENTS.md`** or **`.cursor/rules`** — one line: “Multi-agent task workflow: **`docs/agent-loop.md`**.”
4. **Train the team** on task renames and **Testing instructions** / **Test report** format (mirror mac-stats-reviewer for consistency).
5. **`agents/pos-agent-loop.sh`** — orchestrator for **`cursor-agent`** (see **Agent loop script** above).
6. **Optional:** add **`agents/start-all-agents.sh`**-style helpers only if you run multiple Cursor sessions regularly.

---

## Related POS documentation

- **`AGENTS.md`** — Docker, smoke tests, **`development` / `master`**, frontend log checks.
- **`.cursor/rules/git-development-branch-workflow.mdc`** — always-on branch and promotion rules for agents.
- **`docs/0032-github-issues-roadmap.md`** — Umbrella issues **#52–#54** and links.
- **`docs/testing.md`** — Puppeteer scripts, **`go-ahead-loop.sh`**.
- **`.cursor/rules/error-investigation-workflow.mdc`** — log order for incidents.
- **`.cursor/rules/commit-changelog-version.mdc`** — changelog and version bump when cutting work.

---

