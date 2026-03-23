# Agent loop — mac-stats-reviewer–style process for POS

This document defines a **multi-agent workflow** for this repository, modeled on the **mac-stats-reviewer** companion project (local reference: `~/projects/mac-stats-reviewer`). That project separates **coordination** (`mac-stats-reviewer`: tasks, prompts, optional autoresearch) from **implementation** (`mac-stats`). **POS is a single repo**: application code and agent coordination both live here; the split is **logical** (roles and folders), not two git roots.

**Sources in mac-stats-reviewer used as basis:** root `README.md` (agents overview, hourly commits — *not* adopted verbatim for POS), `agents/tasks/README.md` (task pipeline), and agent prompts under `agents/001-log-reviewer/` … `agents/007-committer/` (roles and handoffs). Optional **Track A autoresearch** (`agents/autoresearch/README.md`, `RUN_24H_*.md`) is **out of scope** for initial POS adoption unless you explicitly port tooling.

---

## Goals

- **Traceable work:** Each change flows through named stages (task file renames), like mac-stats-reviewer’s inbox pipeline.
- **Separation of concerns:** Review/analysis agents do not implement; coders implement; testers verify with evidence; closing reviewer archives; committer handles changelog/version only.
- **POS alignment:** Follow **`AGENTS.md`**, **`.cursor/rules/`**, Docker-based backend tests, Puppeteer smokes (**`docs/testing.md`**), and **no new host installs** (see user/project rules).

---

## Roles (mapping from mac-stats-reviewer)

| mac-stats-reviewer agent | POS role | Typical inputs | Writes / edits |
|--------------------------|----------|----------------|----------------|
| **001 Log reviewer** (`LOG-REVIEWER-PROMPT.md`) | **Log / incident analyst** | `docker logs pos-front`, `pos-back`, `pos-haproxy`, `pos-postgres`; optional app logs | **New task files** in `agents/tasks/` with high-level instructions only (no code). Uses **`docs/`**, **`AGENTS.md`**, error-investigation workflow. |
| **002 Coder** (`002-coder-backend/CODER.md`) | **Implementer (main)** | Tasks in status **new** → **wip** | **`back/`**, **`front/`**, tests; task file status + **Testing instructions**; then **untested**. |
| **006 Feature coder** (`FEATURE-CODER.md`) | **Implementer (FEAT queue)** | Tasks **feat** → **wip** | Same as coder, but only **FEAT-** tasks (if you use that track). |
| **003 Tester** (`TESTER.md`) | **Verifier** | **untested** → **testing** | Appends **Test report**; **closed** or back to **wip** on failure. Uses **`pytest`** (Docker), **`node front/scripts/…`**, **`npm run test:*`** per task. |
| **004 Closing reviewer** (`CLOSING-REVIEWER-PROMPT.md`) | **Archivist** | **closed** tasks | Prepends **Closing summary**; moves file to **`agents/tasks/done/`**. |
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
| **closed** | Verified | Closing reviewer prepends summary → moves file to **`agents/tasks/done/`** (same filename; mac-stats-reviewer uses a `CLOSED-…` name — adopt one naming style for POS) |

### Flow

```text
  new   ─┐
         ├─→  wip  →  untested  →  testing  →  closed  →  (done/)
  feat  ─┘
```

**Rules of thumb (no skipping):**

- **new/feat → wip** when work starts (one clear owner per task in **wip**).
- **wip → untested** only after **Testing instructions** are appended (What to verify / How to test / Pass–fail criteria), same structure as mac-stats-reviewer’s coder prompt.
- **untested → testing → closed** (or **testing → wip** for rework).
- **closed → done/** after closing reviewer adds the **Closing summary** at the **top** of the file.

**Tester loop protection (from `TESTER.md`):** if the same task fails verification more than **three** times, stop cycling; document in **Test report**, close per team policy (mac-stats-reviewer moves to **closed** with explanation).

---

## Where files live in POS (target layout)

Not all of this exists yet; treat as the **implementation target** when you adopt the loop.

```text
agents/
  tasks/
    README.md              # Copy/adapt from mac-stats-reviewer agents/tasks/README.md
    done/                  # Closed tasks moved here
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

---

## Verification and long-running automation

- **Per task:** Tester follows **Testing instructions**; prefer scripts already listed in **`docs/testing.md`** and **`AGENTS.md`** (Puppeteer, `pytest` in container).
- **After substantive edits (including agent work):** Minimum smoke: HTTP 200 on app URL or **`npm run test:landing-version`** with **`BASE_URL`**; if Angular touched, check **`docker compose … logs --tail=80 front`** for compile errors (**`AGENTS.md`**).
- **Long-running pull + test loop (already in POS):** **`scripts/go-ahead-loop.sh`** — `git pull --rebase --autostash`, Docker **pytest**, **`npm run test:landing-version`**. Opt-in **`GO_AHEAD_LOOP=1`**. See **`docs/testing.md`** (section *Long-running smoke loop*). This is **not** a substitute for task-driven testing; it complements it like a release health cadence.

---

## Committer differences (POS vs mac-stats)

mac-stats-reviewer’s committer edits **`CHANGELOG.md`** and **`src-tauri/Cargo.toml`** in **mac-stats**. For POS:

- Update **`CHANGELOG.md`** under **`[Unreleased]`** (Keep a Changelog style).
- Version source: **`front/package.json`** and **`front/package-lock.json`** (see **`.cursor/rules/commit-changelog-version.mdc`**).
- **No application source** edits by the committer role.
- **Push policy:** follow **`AGENTS.md`** (SSH remote, push when asked or as part of agreed workflow — do not contradict team rules).

Optional: track last version bump time in **`agents/007-committer/last-version-bump.txt`** if you want mac-stats-reviewer’s “at most twice a day” style cap.

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

1. **`mkdir -p agents/tasks/done`** and add **`agents/tasks/README.md`** (adapt from mac-stats-reviewer; fix paths).
2. **Copy and adapt** numbered agent prompts (`001` … `004`, `007`, optional `006`) from mac-stats-reviewer; strip mac-stats-only steps; add POS Docker/Puppeteer/pytest wording.
3. **Link from** **`AGENTS.md`** or **`.cursor/rules`** — one line: “Multi-agent task workflow: **`docs/agent-loop.md`**.”
4. **Train the team** on task renames and **Testing instructions** / **Test report** format (mirror mac-stats-reviewer for consistency).
5. **Optional:** add **`agents/start-all-agents.sh`**-style helpers only if you run multiple Cursor sessions regularly.

---

## Related POS documentation

- **`AGENTS.md`** — Docker, smoke tests, git, frontend log checks.
- **`docs/testing.md`** — Puppeteer scripts, **`go-ahead-loop.sh`**.
- **`.cursor/rules/error-investigation-workflow.mdc`** — log order for incidents.
- **`.cursor/rules/commit-changelog-version.mdc`** — changelog and version bump when cutting work.

---

## Reference paths (local)

- mac-stats-reviewer: **`~/projects/mac-stats-reviewer`**
- Task workflow source: **`~/projects/mac-stats-reviewer/agents/tasks/README.md`**
- Agent prompts: **`~/projects/mac-stats-reviewer/agents/00*-*/`** and **`007-committer/`**

When those files change upstream, refresh the adapted copies under **`agents/`** in this repo.
