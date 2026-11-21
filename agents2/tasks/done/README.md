# Archived agent tasks

Closed and rejected tasks live under dated folders derived from the **`YYYYMMDD`** stamp in the filename:

```text
agents2/tasks/done/<YYYY>/<MM>/<DD>/<CLOSED-…|REJECTED-…>.md
```

Example: `CLOSED-1234-20260323-1200-fix-login-banner.md` → **`2026/03/23/`**.

Do not leave **`CLOSED-*.md`** or **`REJECTED-*.md`** in the live queue (`agents2/tasks/` root). After the closing summary (or auto-reject), archive with:

```bash
./scripts/move-agent-task-to-done.sh agents2/tasks/CLOSED-….md
./scripts/move-agent-task-to-done.sh agents2/tasks/REJECTED-….md
```

Pipeline rules: **`agents2/TASKS-README.md`**. Role overview: **`docs/agent-loop.md`**.
