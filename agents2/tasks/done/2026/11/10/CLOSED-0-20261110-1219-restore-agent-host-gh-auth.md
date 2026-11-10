---
## Closing summary (TOP)

- **What happened:** Agent-host `gh` auth was returning 401, so waiting notices and issue preflight could not run for parked FEATs.
- **What was done:** Confirmed working keyring login as `raro42`, documented the Agent host refresh path, and re-posted waiting notices on #438 and #439 with live comment URLs in FEAT status notes.
- **What was tested:** Tester PASS - `gh issue view` for 438/439 exit 0, waiting comments present, docs/config notes present, no secrets in diffs.
- **Why closed:** All pass/fail criteria met; ops-only host auth restore verified.
- **Closed at (UTC):** 2026-11-10 12:35
---

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

## Status / implementation notes (002 coder) - 2026-11-10

- Synced `development`; renamed **NEW → WIP**.
- Host already had working **`gh auth login`** keyring as **`raro42`** (scopes include `repo`); **`GH_TOKEN` / `GITHUB_TOKEN` unset** in the shell (no stale env override).
- Verified: `gh api user -q .login` → `raro42`; `gh issue view 438|439 --repo satisfecho/pos` exit 0.
- Docs: added **Agent host refresh** subsection under Authentication in `docs/agent-loop.md`; brief `GH_TOKEN` / `GITHUB_TOKEN` comments in `config.env.example` pointing at that refresh path and `ensure_gh_auth_env` in the loop.
- Re-posted waiting notices:
  - #438: https://github.com/satisfecho/pos/issues/438#issuecomment-6767443832
  - #439: https://github.com/satisfecho/pos/issues/439#issuecomment-6767444297
- Updated FEAT-438 / FEAT-439 Status (**Waiting notice posted** timestamps + live comment URLs). Left both as **FEAT** (still blocked on human / SSH for 438; product decisions for 439).
- No product code in `back/` / `front/`; no secrets committed.

## Testing instructions

### What to verify
1. `gh` on the agent host can read and comment on `satisfecho/pos` issues (auth no longer 401).
2. Waiting notices for parked FEATs are visible on GitHub #438 and #439.
3. Ops refresh path is documented for the next 401.

### How to test
```bash
# From any cwd on the agent host
unset GH_TOKEN GITHUB_TOKEN   # ensure keyring path (optional if unset already)
gh auth status
gh api user -q .login
gh issue view 438 --repo satisfecho/pos --json number,title,state
gh issue view 439 --repo satisfecho/pos --json number,title,state
# Confirm comments exist (count >= 1) and bodies mention Waiting for human
gh issue view 438 --repo satisfecho/pos --json comments --jq '.comments|length'
gh issue view 439 --repo satisfecho/pos --json comments --jq '.comments|length'
# Docs present
grep -n 'Agent host refresh' docs/agent-loop.md
grep -n 'GH_TOKEN' config.env.example
```

Do **not** paste token values into the test report.

### Pass/fail criteria
- **PASS:** `gh issue view 438` and `439` exit 0; each issue has the agent waiting comment; FEAT-438/439 Status notes record the live comment URLs; docs refresh note exists; no secrets in the diff.
- **FAIL:** any `gh` call returns 401 / Bad credentials, or comments missing on #438/#439.

## Test report

- **Date/time (UTC):** 2026-11-10T12:34:48Z start - 2026-11-10T12:35:10Z end
- **Log window:** N/A - host `gh` / docs verification only (no Docker product containers required)
- **Environment:** agent host; branch `development`; `GH_TOKEN`/`GITHUB_TOKEN` unset (keyring path); compose N/A; BASE_URL N/A

### What was tested
1. Host `gh` auth can read `satisfecho/pos` issues without 401.
2. Waiting notices visible on #438 and #439.
3. Ops refresh path documented; FEAT-438/439 Status notes cite live comment URLs; no secrets in related diffs.

### Results
1. **PASS** - `gh auth status` logged in as `raro42` (scopes include `repo`); `gh api user` → `raro42`; `gh issue view 438|439` exit 0 (OPEN).
2. **PASS** - #438 comments length 1 (body starts `## Waiting for human (agent FEAT-438)`); #439 comments length 1 (body starts `## Waiting for human (agent FEAT-439)`); API confirms comment ids 6767443832 / 6767444297.
3. **PASS** - `docs/agent-loop.md` line 232 `Agent host refresh`; `config.env.example` lines 198-200 document `GH_TOKEN`/`GITHUB_TOKEN`; FEAT-438/439 Status include Waiting notice posted + live issuecomment URLs; `rg` found no token/private-key patterns in those files.

### Overall: **PASS**

### Product owner feedback
GitHub auth on the agent host is usable again via the keyring account, so parked FEAT waiting notices can land and preflight can observe human replies. The short refresh note in agent-loop docs should reduce the next 401 chase. No product UI was in scope.

### URLs tested
1. https://github.com/satisfecho/pos/issues/438
2. https://github.com/satisfecho/pos/issues/438#issuecomment-6767443832
3. https://github.com/satisfecho/pos/issues/439
4. https://github.com/satisfecho/pos/issues/439#issuecomment-6767444297

### Relevant log excerpts (last section)
```
gh auth status: Logged in to github.com account raro42 (.../hosts.yml); Active account: true; Token scopes include repo
gh api user -q .login → raro42
gh issue view 438 --json number,title,state → {"number":438,"state":"OPEN","title":"We are seeing 500 errors on PROD"} exit 0
gh issue view 439 --json number,title,state → {"number":439,"state":"OPEN","title":"Feat: pay with crypto"} exit 0
comments length 438=1 439=1; both Waiting for human
grep Agent host refresh → docs/agent-loop.md:232
```
