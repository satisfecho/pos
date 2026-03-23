# Agent loop — mac-stats-reviewer–style process for POS

This document defines a **multi-agent workflow** for this repository, modeled on the **mac-stats-reviewer** companion project (local reference: `~/projects/mac-stats-reviewer`). That project separates **coordination** (`mac-stats-reviewer`: tasks, prompts, optional autoresearch) from **implementation** (`mac-stats`). **POS is a single repo**: application code and agent coordination both live here; the split is **logical** (roles and folders), not two git roots.

**Sources in mac-stats-reviewer used as basis:** root `README.md` (agents overview, hourly commits — *not* adopted verbatim for POS), `agents/tasks/README.md` (task pipeline), and agent prompts under `agents/001-log-reviewer/` … `agents/007-committer/` (roles and handoffs). Optional **Track A autoresearch** (`agents/autoresearch/README.md`, `RUN_24H_*.md`) is **out of scope** for initial POS adoption unless you explicitly port tooling.

---

## Goals

- **Traceable work:** Each change flows through named stages (task file renames), like mac-stats-reviewer’s inbox pipeline.
- **Separation of concerns:** Review/analysis agents do not implement; coders implement; testers verify with evidence; closing reviewer archives; committer handles changelog/version only.
- **POS alignment:** Follow **`AGENTS.md`**, **`.cursor/rules/`**, Docker-based backend tests, Puppeteer smokes (**`docs/testing.md`**), and **no new host installs** (see user/project rules).

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

---

## Roles (mapping from mac-stats-reviewer)

| mac-stats-reviewer agent | POS role | Typical inputs | Writes / edits |
|--------------------------|----------|----------------|----------------|
| **001 Log reviewer** (`LOG-REVIEWER-PROMPT.md`) | **Log / incident analyst** | `docker logs pos-front`, `pos-back`, `pos-haproxy`, `pos-postgres`; optional app logs | **New task files** in `agents/tasks/` with high-level instructions only (no code). Uses **`docs/`**, **`AGENTS.md`**, error-investigation workflow. |
| **002 Coder** (`002-coder-backend/CODER.md`) | **Implementer (main)** | Tasks in status **new** → **wip** | **`back/`**, **`front/`**, tests; task file status + **Testing instructions**; then **untested**. |
| **006 Feature coder** (`FEATURE-CODER.md`) | **Implementer (FEAT queue)** | Tasks **feat** → **wip** | Same as coder, but only **FEAT-** tasks (if you use that track). |
| **003 Tester** (`TESTER.md`) | **Verifier** | **untested** → **testing** | Appends **Test report**; **closed** or back to **wip** on failure. Uses **`pytest`** (Docker), **`node front/scripts/…`**, **`npm run test:*`** per task. |
| **004 Closing reviewer** (`CLOSING-REVIEWER-PROMPT.md`) | **Archivist** | **closed** tasks | Prepends **Closing summary**; moves file to **`agents/tasks/done/YYYY/MM/DD/`** (date from `CLOSED-YYYYMMDD-…`; use **`scripts/move-agent-task-to-done.sh`**). |
| **007 Committer** (`COMMITTER.md`) | **Changelog / version** | `git status` in POS root | **`CHANGELOG.md`**, **`front/package.json`** + **`front/package-lock.json`** when bumping; git add/commit per **`.cursor/rules/commit-changelog-version.mdc`**. **Does not** edit application source. |
| **005 OpenClaw reviewer** | **Optional** | Browser/automation findings | Only if you introduce a parallel “FEAT” track for UI/automation work; otherwise skip or fold into log analyst + human. |

**Orchestrator / security / release-watcher** (mentioned in mac-stats-reviewer `README.md`): optional Cursor threads or human; not required for POS unless you add matching `PROMPT-*.md` files under `agents/`.

---

## Task workflow (from `agents/tasks/README.md`)

Adapted filename pattern and statuses — **same semantics** as mac-stats-reviewer.

### Filename pattern

`<STATUS>-<YYYYMMDD-HHMM>-<slug>.md`  
Examples: `NEW-20260323-1030-haproxy-503-on-orders.md`, `WIP-20260323-1100-fix-rate-limit-banner.md`

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

---

## Agent loop script (`agents/run.sh`)

Same idea as **mac-stats-reviewer** `agents/run.sh`: one entrypoint to run **feature coder → coder → tester → closing reviewer → committer** on a timer, or single steps.

| Invocation | Behaviour |
|------------|-----------|
| **`./agents/run.sh`** | Full cycle every **`AGENT_LOOP_SLEEP_MINUTES`** (default **5**); requires **`cursor-agent`** on `PATH`. |
| **`./agents/run.sh coder`** | Run coder step only if **`NEW-*.md`** exists (and prompt file present). |
| **`./agents/run.sh tester`** | Run tester if **`UNTESTED-*.md`** exists. |
| **`./agents/run.sh feat`** | Run feature coder if **`FEAT-*.md`** exists. |
| **`./agents/run.sh closing-review`** | Run closer if **`CLOSED-*.md`** still in **`agents/tasks/`**. |
| **`./agents/run.sh committer`** | Run committer if POS repo has unstaged/staged changes. |
| **`./agents/run.sh help`** | Usage. |

**Docker / stack:** still start with repo-root **`./run.sh`** or **`./run.sh -dev`** — this script does **not** replace the POS application runner.

**Prompts:** steps **skip** if the corresponding markdown under **`agents/002-coder/`**, **`003-tester/`**, etc. is missing (copy/adapt from mac-stats-reviewer). Steps also skip if **`cursor-agent`** is missing (single commands); the **infinite loop** exits immediately if **`cursor-agent`** is not installed.

---

## Where files live in POS (target layout)

Not all of this exists yet; treat as the **implementation target** when you adopt the loop.

```text
agents/
  run.sh                 # Orchestrator (mac-stats-reviewer style); see section above
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
- **No application source** edits by the committer role.
- **Branch policy:** commit on **`development`**; **`git push origin development`**. Merge to **`master`** only per **Git branching and production** above — not on every committer run.

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
| **Reviewer** (log / planning) | After creating the task file for issue **#NN** | Add comment: link to task path under **`agents/tasks/…`**, short plan; add label **`agent:planned`**. Optionally remove **`agent:needs-triage`** if you use triage labels. |
| **Coder** & **Feature coder** | When renaming task **new/feat → wip** | Add comment: “Implementation started”; **`agent:planned` → `agent:wip`** (remove planned, add wip). |
| **Tester** | When renaming **untested → testing** | Add comment: “Verification started” (commands/env if useful); **`agent:wip` → `agent:testing`**. |
| **Closer** | After **Test report** is **PASS** and task is **closed**, before/after `move-agent-task-to-done.sh` | Comment: one-paragraph outcome + pointer to merged commit or PR if applicable; remove **`agent:testing`** / **`agent:wip`**. **Close the issue** if the feature is fully delivered and tracked only here; **leave open** if the issue is a parent epic or has follow-ups (say so in the comment). |

On **test failure** (**testing → wip**), the tester should comment on the issue with what failed and keep or restore **`agent:wip`** as appropriate.

### Example `gh` commands (run from any directory)

```bash
export GH_TOKEN=…   # or rely on `gh auth login`

gh issue list --repo satisfecho/pos --state open --limit 30

gh issue comment 50 --repo satisfecho/pos --body "Task file: agents/tasks/NEW-20260323-1030-order-tip.md — planned for implementation."

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
2. **Copy and adapt** numbered agent prompts (`001` … `004`, `007`, optional `006`) from mac-stats-reviewer; strip mac-stats-only steps; add POS Docker/Puppeteer/pytest wording.
3. **Link from** **`AGENTS.md`** or **`.cursor/rules`** — one line: “Multi-agent task workflow: **`docs/agent-loop.md`**.”
4. **Train the team** on task renames and **Testing instructions** / **Test report** format (mirror mac-stats-reviewer for consistency).
5. **`agents/run.sh`** — orchestrator for **`cursor-agent`** (see **Agent loop script** above).
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

## Reference paths (local)

- mac-stats-reviewer: **`~/projects/mac-stats-reviewer`**
- Task workflow source: **`~/projects/mac-stats-reviewer/agents/tasks/README.md`**
- Agent prompts: **`~/projects/mac-stats-reviewer/agents/00*-*/`** and **`007-committer/`**

When those files change upstream, refresh the adapted copies under **`agents/`** in this repo.
