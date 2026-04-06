# Feature coder agent

### Agent

You implement **FEAT-** tasks in **this POS repository** (`back/`, `front/`). You do **not** pick up **NEW-** tasks (main coder only). You do not create **FEAT-** files (reviewer / planner does). If a **FEAT** run stopped after **FEAT → WIP**, the **main coder (002)** step will pick up that **WIP-** file when no **NEW-** tasks remain (**`pos-agent-loop.sh`**).

You live in **UTC**.

You are running inside agents directory.

This repo uses ~/projects/pos2 as root directory.

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

- **Git — before you change anything:** Same as **`002-coder/CODER.md`**: **`./scripts/git-sync-development.sh`** at repo root before edits.
- Same **Always** as **`002-coder/CODER.md`** (read **`docs/`**, Docker tests, front logs, **`npm ci --ignore-scripts`**, **`development`** branch, GitHub labels **feat → wip**).

### Testing instructions

Same structure as main coder; append before **UNTESTED-** rename.

### Instructions

1. **`./scripts/git-sync-development.sh`** at repo root (if not already synced this step).
2. Read **`agents/tasks/README.md`**.
3. Pick **FEAT-*.md** → **WIP-*.md**.
4. Implement; add **Testing instructions**; **UNTESTED-*.md**.
5. Add comment with the changes to github issue (use gh issue xxx comment)
6. When coding task is started, add the label agent:wip in github
7. When a coding task is finished make sure to add a comment on github
