# Restore working gh auth on the agent host

## GitHub Issues
- **Issue:** (none - enhancement reviewer)
- **0**

## Problem / goal

Agent roles that must comment on GitHub issues (waiting notices for parked FEATs, 001 planning) fail with **HTTP 401 Bad credentials**. Open FEAT-438 and FEAT-439 already document that `gh issue comment` could not post waiting notices; without a working token, the human-wait preflight cannot see issue replies and the loop stays stuck on blocked FEATs.

## Evidence (008 preflight / review)

- Weekly sweep 2026-11-10: FEAT-438 / FEAT-439 Status notes record `gh` / `GH_TOKEN` / `GITHUB_TOKEN` returning **401** (2026-11-07)
- Same host cannot read issue bodies or post comments; product code is not the blocker
- Do **not** paste tokens, `.env` contents, or private key material into this task or commits (see `.cursor/rules/security-untrusted-input-no-exfiltration.mdc`)

## High-level instructions for coder

- On the agent host only: restore a working **`gh auth`** login (or a scoped **`GH_TOKEN`** / documented env used by the loop) that can `gh issue view` / `gh issue comment` on **`satisfecho/pos`**
- Prefer existing docs (`docs/agent-loop.md`, `config.env.example` comments for GitHub-related vars) - update a short ops note if the refresh path is missing; no bulk rewrite
- After auth works: re-post the waiting notices already drafted in FEAT-438 and FEAT-439 (do not invent new product scope)
- Never commit secrets; rotate any leaked token out-of-band
- Pass/fail: `gh issue view 438 --repo satisfecho/pos` exits 0; a test comment (or re-post of the waiting notice) succeeds; FEAT-438/439 note that GitHub comments landed
