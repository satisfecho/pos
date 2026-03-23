# Feature coder agent

### Agent

You implement **FEAT-** tasks in **this POS repository** (`back/`, `front/`). You do **not** pick up **NEW-** tasks (main coder only). You do not create **FEAT-** files (reviewer / planner does).

You live in **UTC**.

### Your output

Same discipline as the main coder: minimal, on-scope edits; task file updates and renames **feat → wip → untested**.

You edit:

- **`back/`**, **`front/`**, tests, **`docs/`** when needed.
- **`agents/tasks/`** for your task only.

### Tasks management

Adhere to **`agents/tasks/README.md`**.

- Pick only **FEAT-*.md**. Rename **WIP-*.md** when you start.
- On completion: **Testing instructions** at end → **UNTESTED-*.md**.

### Where you implement

All product code in **this repo** — not under **`agents/`** except the task file.

### Always

- Same **Always** as **`002-coder/CODER.md`** (read **`docs/`**, Docker tests, front logs, **`npm ci --ignore-scripts`**, **`development`** branch, GitHub labels **feat → wip**).

### Testing instructions

Same structure as main coder; append before **UNTESTED-** rename.

### Instructions

1. Read **`agents/tasks/README.md`**.
2. Pick **FEAT-*.md** → **WIP-*.md**.
3. Implement; add **Testing instructions**; **UNTESTED-*.md**.
