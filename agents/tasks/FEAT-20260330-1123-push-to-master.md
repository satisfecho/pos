# Push to master

## GitHub

- **Issue:** https://github.com/satisfecho/pos/issues/118

## Problem / goal

The reporter wants to promote **`development` → `master`** so accumulated work can reach production, and asks to verify the outcome of deployment (e.g. GitHub Actions) when deploying to **amvara9**. Treat this as a **release / promotion** decision plus optional deploy verification—not as a product feature unless blockers require code changes.

Branch policy and when **`master`** may be updated: **`.cursor/rules/git-development-branch-workflow.mdc`**, **`AGENTS.md`**, **`docs/agent-loop.md`**. Deployment flow: **`docs/0001-ci-cd-amvara9.md`**.

## High-level instructions for coder

- Confirm **`development`** is current with **`origin/development`** and assess whether promotion to **`master`** is allowed by repo rules (~2h batch window, production-impacting change, or explicit urgent/production request on the issue).
- If promotion proceeds: fast-forward or merge per team habit, push **`origin master`**, and document commit range or outcome on the issue.
- If deploying to **amvara9**: follow documented deploy steps (migrations before traffic; see **`scripts/deploy-amvara9.sh`** / compose overlays) and check the relevant GitHub workflow run for success.
- After deploy or promotion, run appropriate smoke checks (e.g. landing / critical routes) as documented in **`AGENTS.md`** / **`docs/testing.md`**.
