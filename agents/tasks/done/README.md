# Archived tasks (`done/`)

Closed agent tasks live here under **year / month** subfolders derived from each file’s **`CLOSED-YYYYMMDD-…`** name.

## Layout

```text
done/
  README.md          ← this file
  2026/
    03/
      CLOSED-20260323-1200-example-task.md
    04/
      CLOSED-20260401-0930-another-task.md
```

- **Year** = first four digits of `YYYYMMDD` in the filename.  
- **Month** = digits 5–6 (`01`–`12`).  
- Filenames stay as **`CLOSED-…`** (or your team’s chosen closed prefix) for easy grep across the repo.

## Moving a file here

From the repository root:

```bash
./scripts/move-agent-task-to-done.sh agents/tasks/CLOSED-YYYYMMDD-HHMM-slug.md
```

Do not add new closed tasks directly under **`done/`** without a **`YYYY/MM`** parent; the helper enforces the layout.
