# Remove unused zz_cursor-agents-do-not-use folder

## GitHub Issues
- **Issue:** https://github.com/satisfecho/pos/issues/417
- **417**

## Status
- **Implemented** (010 feature coder) — 2026-09-19
- Removed 192 tracked files. Did not change `back/` or `front/`. Did not copy old task files into `agents2/tasks/`.

## Problem / goal
The repo still tracks `zz_cursor-agents-do-not-use/`. That folder is an old copy of agent prompts. The live loop is `agents2/` (see `docs/agent-loop.md`). Issue #417 asks to remove the old folder if that is safe.

## High-level instructions for coder
- Confirm nothing outside `zz_cursor-agents-do-not-use/` still calls that path (`git grep zz_cursor-agents-do-not-use`). On 2026-09-19 that search was empty. Do not delete `agents2/`, `agents/`, or live loop scripts.
- Remove the tracked folder from git (`zz_cursor-agents-do-not-use/`, about 192 files: old prompts, `pos-agent-loop.sh`, `pi-agent-loop.sh`, `proxy.py`, archived task copies).
- Do not copy those old task files into `agents2/tasks/`. Do not change `back/` or `front/`.
- After the delete, search again. The name must not remain in tracked files. `agents2/pos-cursor-loop.sh` and `docs/agent-loop.md` must still exist.
- Smoke is not a UI change. Confirm the app still answers (`curl` to `http://127.0.0.1:4202/` returns 200) so the delete did not touch the running stack.

## What changed
- Deleted the tracked tree `zz_cursor-agents-do-not-use/` (192 files). That set was old prompts, `pos-agent-loop.sh`, `pi-agent-loop.sh`, `proxy.py`, and archived task copies.
- `git ls-files` for that path is empty. `git grep` for that name matches only this task file and the changelog note.
- `agents2/pos-cursor-loop.sh` and `docs/agent-loop.md` still exist. Local ignored leftovers (`.DS_Store`, `time-of-last-review.txt`) were removed from the working tree. They were not tracked.
- Smoke: `curl` to `http://127.0.0.1:4202/` returned 200.

## Testing instructions

**What to verify**
- Git no longer tracks the unused folder from issue #417.
- No code, script, or doc calls that path. Text hits are only this task file and the changelog note.
- `agents2/pos-cursor-loop.sh` and `docs/agent-loop.md` still exist.
- The running app still answers. This change does not touch `back/` or `front/`.

**How to test**
1. From the repo root, on branch `development`:
   - `git ls-files zz_cursor-agents-do-not-use` prints nothing.
   - `git grep zz_cursor-agents-do-not-use` lists only this task file and `CHANGELOG.md`.
   - `test -f agents2/pos-cursor-loop.sh && test -f docs/agent-loop.md`
2. With the dev stack up (`docker-compose.yml` + `docker-compose.dev.yml`):
   - `curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:4202/` returns `200`.

**Pass/fail criteria**
- **Pass:** the path has zero tracked files, grep hits only this task file and `CHANGELOG.md`, both live files exist, and curl returns 200.
- **Fail:** any tracked file remains under that folder, another file still calls that path, a live loop file is missing, or curl is not 200.

## Test report

1. **Date/time (UTC):** start 2026-09-19T17:38:48Z, end 2026-09-19T17:40:23Z. Log window: `docker logs --since 2026-09-19T17:38:00Z pos-haproxy`.
2. **Environment:** `docker-compose.yml` + `docker-compose.dev.yml`. `BASE_URL=http://127.0.0.1:4202`. Branch `development` at `c963affaf`.
3. **What was tested:** Git no longer tracks `zz_cursor-agents-do-not-use/`. No code, script, or doc calls that path except this task file and `CHANGELOG.md`. Live loop files still exist. The app still answers. No UI change, so no contrast check.
4. **Results:**
   - **PASS** — `git ls-files zz_cursor-agents-do-not-use` printed nothing. The folder is not on disk.
   - **PASS** — `git grep zz_cursor-agents-do-not-use` listed only `CHANGELOG.md` (the task file was not in the index after the status rename). `git grep --untracked` listed only this task file and `CHANGELOG.md`.
   - **PASS** — `test -f agents2/pos-cursor-loop.sh` and `test -f docs/agent-loop.md` both succeeded.
   - **PASS** — `curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:4202/` returned `200`.
5. **Overall:** **PASS**
6. **Product owner feedback:** The old agent prompt folder is gone from git. The live loop files remain. The local app still answers on port 4202.
7. **URLs tested:**
   1. `http://127.0.0.1:4202/`
8. **Relevant log excerpts:**

```text
192.168.65.1:64960 [19/Sep/2026:17:38:56.512] http_frontend frontend_backend/front1 0/0/1/9/10 200 3549 - - ---- 4/4/3/3/0 0/0 "GET / HTTP/1.1"
```
