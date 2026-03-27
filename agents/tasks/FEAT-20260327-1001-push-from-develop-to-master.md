# Push from develop to master

## GitHub

- **Issue:** https://github.com/satisfecho/pos/issues/111

## Problem / goal

Promote tested work from **`development`** to **`master`** so production (p. ej. amvara9) can track the release branch. The issue text is minimal; interpret it as a **release / branch promotion** request, not as a product feature in `back/` or `front/` unless the assignee discovers blockers that require code.

See **`.cursor/rules/git-development-branch-workflow.mdc`** and **`AGENTS.md`**: merge **`development` → `master`** only when a promotion window applies (~2h batch, production-urgent, or explicit hotfix), then push **`origin master`** as appropriate.

## High-level instructions for coder

- Confirm **`development`** is synced with **`origin/development`** and that CI/smoke expectations for what is about to ship are met (or document known gaps in the issue).
- If promotion is allowed by team rules, perform **`development` → `master`** (fast-forward or merge per team habit), push **`origin master`**, and note commit range or tag in the GitHub issue.
- If promotion is **not** yet justified by policy, reply on the issue with **why** (which rule window is missing) and what remains (tests, sign-off, urgent label, etc.).
- Do **not** treat this as permission to bypass tenant/security rules or to ship untested breaking migrations without explicit production urgency.
