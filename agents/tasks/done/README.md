# Archived tasks (`done/`)

Closed agent tasks live here under **year / month / day** folders derived from each file’s **`CLOSED-YYYYMMDD-…`** name.

## Layout

```text
done/
  README.md          ← this file
  2026/
    03/
      23/
        CLOSED-20260323-1200-example-task.md
        CLOSED-20260323-1530-second-task-same-day.md
      24/
        CLOSED-20260324-0900-next-day.md
```

- **Year** = first four digits of `YYYYMMDD` in the filename.  
- **Month** = digits 5–6 (`01`–`12`).  
- **Day** = digits 7–8 (`01`–`31`).  
- Filenames stay as **`CLOSED-…`** for easy grep across the repo.

Use the **work / closure day** in the `CLOSED-` filename so everything finished on the same calendar day ends up in the same **`DD`** folder.

## Moving a file here

From the repository root:

```bash
./scripts/move-agent-task-to-done.sh agents/tasks/CLOSED-YYYYMMDD-HHMM-slug.md
```

Do not add new closed tasks directly under **`done/`** without **`YYYY/MM/DD`** parents; the helper enforces the layout.
