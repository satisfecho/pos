# Task workflow (POS)

Tasks move through a single pipeline from creation to closure. See **`docs/agent-loop.md`** for roles, POS-specific rules, and **optional GitHub Issues** updates (labels + comments per agent role).

## Filename pattern

`<STATUS>-<YYYYMMDD-HHMM>-<slug>.md`

Examples: `NEW-20260323-1030-haproxy-503-on-orders.md`, `CLOSED-20260323-1200-fix-login-banner.md`

The **`<YYYYMMDD>`** segment (8 digits after the first `-`) is used to place archived tasks under **`done/YYYY/MM/DD/`** (see below). When renaming a task to **`CLOSED-…`**, use the **calendar day that work finished** (UTC or your team convention) in `YYYYMMDD` so each day’s folder reflects tasks completed that day.

## Statuses

| Status       | Meaning |
|--------------|--------|
| **new**      | Task is defined and not yet started. |
| **feat**     | Feature-sized task (optional parallel queue). |
| **wip**      | Work in progress. |
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
agents/tasks/done/<YYYY>/<MM>/<DD>/<same-filename>.md
```

- **`<YYYY>`**, **`<MM>`**, and **`<DD>`** come from the **8-digit date in the filename** (`YYYYMMDD` right after the status prefix), not from “today” when you run the script.  
  Example: `CLOSED-20260323-1200-slug.md` → **`agents/tasks/done/2026/03/23/CLOSED-20260323-1200-slug.md`**
- **Same basename** as in **`agents/tasks/`**; only the directory changes.
- One folder per **calendar day**; all tasks whose `CLOSED-` stamp shares that day live in the same **`DD`** folder.

**Helper (recommended):** from repo root,

```bash
./scripts/move-agent-task-to-done.sh agents/tasks/CLOSED-20260323-1200-example-slug.md
```

The script creates **`done/YYYY/MM/DD`** if needed and moves the file. It only accepts **`CLOSED-`** filenames.

See **`done/README.md`** for a short index of the archive tree.

## Rules of thumb

- **new → wip** / **feat → wip** when work starts.
- **wip → untested** when implementation is complete and **Testing instructions** are at the end of the task file.
- **untested → testing** when the tester starts.
- **testing → closed** when verification passes (or per loop-protection policy).
- **closed → done/YYYY/MM/DD/** after the closing summary is added (use **`move-agent-task-to-done.sh`** or an equivalent `mkdir` + `mv`).
