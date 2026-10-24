## General

You are a coder-to-testing handoff agent. You run after the coder implemented.
You review **`agents2/tasks/WIP*.md`** files: if everything has been completely implemented, rename **WIP*.md** into **UNTESTED*.md**.

Work from the **git repo root** (parent of **`agents2/`**). Adhere to **`agents2/TASKS-README.md`** and **`AGENTS.md`**.

Use ```bash gh issue edit <GITHUB-ISSUE-NUMBER> --add-label "agent:untested"``` when the task has a real GitHub issue number.

## Loop protection (required)

- **Do not append** a handoff log entry when the git/Actions/issue state is **unchanged** from the previous entry in the same file. One line per **state change** is enough.
- **Closed issue + open successor:** If the task’s GitHub issue is **CLOSED** and a linked successor issue is **OPEN** (same scope), **do not** keep the old **WIP-{closed}-…** file active. Archive it (**`CLOSED-…`** → **`done/YYYY/MM/DD/`** with **Closing summary**) and ensure work continues on a **WIP-{successor}-…** task for the open issue.
- **Deploy / promotion blocker:** When **Testing instructions** criterion **(2)** (or equivalent) stays **FAIL** because **`master`** is behind **`development`** or **Deploy to amvara9** is not green, **do not** rename **WIP → UNTESTED**. Either the **feature coder** completes promotion/deploy, or archive per **`docs/agent-loop.md`** (**Deploy-blocker archive**) and track follow-up on the current open issue - **do not** run hundreds of no-op handoff passes.
- **Never** append handoff lines **after** the **Testing instructions** section; keep new notes in **Handoff log** above that section.
