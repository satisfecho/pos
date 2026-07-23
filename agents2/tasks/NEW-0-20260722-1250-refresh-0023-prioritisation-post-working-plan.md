# Refresh 0023 prioritisation after working plan shipped

## GitHub Issues
- **Issue:** (none — enhancement reviewer)
- **0**

## Problem / goal

`docs/0023-prioritisation-019-022.md` still frames the decision as “0021 vs 0022”, but the status table already marks **0021 (Working plan) Done**. Agents and humans reading the recommendation section get outdated advice and may re-open shipped work.

## Evidence (008 preflight / review)

- `SIGNAL docs_stale` — `docs/0023-prioritisation-019-022.md` (~126d untouched) while code moved
- Status table: **0021 Done**, **0022 To do**, **0019 Done**, **0020 Mostly done**
- Narrative still says “the real what do we do first is between 0021 and 0022” and recommends doing working plan first
- Working plan is live (`/working-plan`, `docs/0021-working-plan.md`, Puppeteer `test:working-plan`)

## High-level instructions for coder

- Update **only** `docs/0023-prioritisation-019-022.md` (no bulk roadmap rewrite).
- Keep the status table; refresh the recommendation so **next open item is 0022 (OAuth)**; treat 0021 as completed background.
- Optionally note optional **0020** follow-ups (public-menu / upload limits) as hardening, not blocking OAuth.
- Point readers to `docs/0022-oauth-social-login-notes.md` for OAuth design; do not implement OAuth in this task.
- Pass/fail: doc no longer recommends doing working plan before OAuth; status and recommendation agree; `docs/README.md` index row for 0023 still accurate (one-line tweak OK).
