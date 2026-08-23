# Task workflow (POS)

Tasks move through a single pipeline from creation to closure. See **`docs/agent-loop.md`** for roles, POS-specific rules, and **optional GitHub Issues** updates (labels + comments per agent role). **Before renaming or editing task files**, sync **`development`** with **`./scripts/git-sync-development.sh`** (multi-agent workflow; **`agents2/pos-cursor-loop.sh`** does this each step).

Live queue: **`agents2/tasks/`**. (A symlink **`agents` → `agents2`** may exist for older paths; prefer **`agents2/`** in new work.)

## Filename pattern

`<STATUS>-<GITHUB-ISSUE-NUMBER>-<YYYYMMDD-HHMM>-<slug>.md`

Examples: `NEW-1234-20260323-1030-haproxy-503-on-orders.md`, `CLOSED-1234-20260323-1200-fix-login-banner.md`

Use issue **`0`** when there is no GitHub issue (`NEW-0-…`, `FEAT-0-…`).

The **`<YYYYMMDD>`** segment (8 digits after the issue number) is used to place archived tasks under **`done/YYYY/MM/DD/`** (see below). When renaming a task to **`CLOSED-…`**, use the **calendar day that work finished** (UTC or your team convention) in `YYYYMMDD` so each day’s folder reflects tasks completed that day.

## Statuses

| Status       | Meaning |
|--------------|--------|
| **new**      | Task is defined and not yet started. |
| **feat**     | Feature-sized task (optional parallel queue). |
| **wip**      | Work in progress until implemented. When implemented rename **WIP*.md** to **UNTESTED*.md** |
| **untested** | Implementation done; **Testing instructions** appended; waiting for tester. |
| **testing**  | Tester is running verification. |
| **closed**   | Verified; ready for closing reviewer to archive. |

## Flow

```text
  new   ─┐
         ├─→  wip  →  untested  →  testing  →  closed  →  done/YYYY/MM/DD/
  feat  ─┘
```

Do not skip statuses. On test failure: **testing → wip** (coder fixes), then **wip → untested** again when ready.

## Archiving closed tasks (`done/` layout)

Closed tasks are **not** kept in a single flat **`done/`** directory. After the closing reviewer prepends the **Closing summary**, the file is moved to:

```text
agents2/tasks/done/<YYYY>/<MM>/<DD>/<same-filename>.md
```

- **`<YYYY>`**, **`<MM>`**, and **`<DD>`** come from the **8-digit date in the filename** (`YYYYMMDD` in the stamp), not from “today” when you run the script.  
  Example: `CLOSED-1234-20260323-1200-slug.md` → **`agents2/tasks/done/2026/03/23/CLOSED-1234-20260323-1200-slug.md`**
- **Same basename** as in **`agents2/tasks/`**; only the directory changes.
- One folder per **calendar day**; all tasks whose `CLOSED-` stamp shares that day live in the same **`DD`** folder.

**Helper (recommended):** from repo root,

```bash
./scripts/move-agent-task-to-done.sh agents2/tasks/CLOSED-1234-20260323-1200-example-slug.md
```

The script creates **`done/YYYY/MM/DD`** if needed and moves the file. It only accepts **`CLOSED-`** filenames.

See **`agents2/tasks/done/README.md`** for a short index of the archive tree.

## Rules of thumb

- **new → wip** / **feat → wip** when work starts.
- **wip → untested** when implementation is complete and **Testing instructions** are at the end of the task file.
- **untested → testing** when the tester starts.
- **testing → closed** when verification passes: rename **`TESTING-…`** → **`CLOSED-…`** (keep the same **`YYYYMMDD-HHMM-slug`**; only change the status prefix). On failure, **testing → wip**.
- **closed → done/YYYY/MM/DD/** after the closing summary is added (use **`move-agent-task-to-done.sh`** or an equivalent `mkdir` + `mv`).

## Waiting for human (FEAT blocked on design)

Some **FEAT-** tasks are **parked** until product or design decisions land on GitHub (see issue #350 pattern).

| Step | Who | Action |
|------|-----|--------|
| First blocked pass | Feature coder **010** | Post **one** waiting comment on the linked issue; add `**Waiting notice posted:** <UTC ISO>` under **## Status** in the task file. Leave task as **FEAT** (no **WIP**). |
| Later loop cycles | Orchestrator **006** preflight | **`scripts/agent-feat-waiting-human-preflight.sh`** skips **010** when the waiting notice is set and no non-agent reply appeared on the issue after that time. |
| Human decides | Human on GitHub | Reply on the issue with decisions. Preflight unblocks **010** on the next cycle. |

Override preflight (debug only): **`AGENT_FEAT_REVIEWER_ALWAYS=1`** or **`AGENT_006_SKIP_PREFLIGHT=1`** in **`agents2/pos-cursor-loop.sh`**.
