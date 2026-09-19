# Remove unused zz_cursor-agents-do-not-use folder

## GitHub Issues
- **Issue:** https://github.com/satisfecho/pos/issues/417
- **417**

## Problem / goal
The repo still tracks `zz_cursor-agents-do-not-use/`. That folder is an old copy of agent prompts. The live loop is `agents2/` (see `docs/agent-loop.md`). Issue #417 asks to remove the old folder if that is safe.

## High-level instructions for coder
- Confirm nothing outside `zz_cursor-agents-do-not-use/` still calls that path (`git grep zz_cursor-agents-do-not-use`). On 2026-09-19 that search was empty. Do not delete `agents2/`, `agents/`, or live loop scripts.
- Remove the tracked folder from git (`zz_cursor-agents-do-not-use/`, about 192 files: old prompts, `pos-agent-loop.sh`, `pi-agent-loop.sh`, `proxy.py`, archived task copies).
- Do not copy those old task files into `agents2/tasks/`. Do not change `back/` or `front/`.
- After the delete, search again. The name must not remain in tracked files. `agents2/pos-cursor-loop.sh` and `docs/agent-loop.md` must still exist.
- Smoke is not a UI change. Confirm the app still answers (`curl` to `http://127.0.0.1:4202/` returns 200) so the delete did not touch the running stack.
