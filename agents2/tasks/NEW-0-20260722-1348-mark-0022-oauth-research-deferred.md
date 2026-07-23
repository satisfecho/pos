# Mark 0022 OAuth social-login notes as research / deferred

## GitHub Issues
- **Issue:** (none — enhancement reviewer)
- **0**

## Problem / goal

`docs/0022-oauth-social-login-notes.md` is design-only (Google/Microsoft/etc.). Auth remains email/password JWT. Without a status banner, agents may queue OAuth implementation from a stale “to do” pointer in prioritisation docs.

## Evidence (008 preflight / review)

- Doc age >90d; listed among broader stale docs (prior sweeps covered 0023 prioritisation but not a dedicated 0022 status task)
- `docs/0023-prioritisation-019-022.md` still rows **0022** as **To do** (separate refresh task exists for 0023 — keep this task scoped to **0022** + index clarity)
- No `user_oauth_account` / `/auth/{provider}/authorize` product surface in current app (email+password login only)
- Prefer status note over implementing OAuth (out of scope for a tiny NEW)

## High-level instructions for coder

- Add a top **Status: research / deferred** banner on `docs/0022-oauth-social-login-notes.md`: not implemented; keep notes for a future product decision; do not treat as an active sprint plan.
- Optionally align `docs/README.md` index blurb to say “research notes (not shipped).”
- Do **not** implement OAuth, migrations, or login buttons in this task.
- Pass criteria: doc and index make deferred/research status obvious; no bulk rewrite of the design sections.
