# Remove unused root Contact file (#449)

## GitHub Issues
- **Issue:** https://github.com/satisfecho/pos/issues/449
- **449**

## Problem / goal
Repo root contains an empty file named `Contact` (0 bytes). It appears unused and unnecessary; remove it if nothing in the product or docs depends on it.

## High-level instructions for coder
- Confirm nothing references a root `Contact` path (search repo for imports, docs, scripts, Docker/COPY, links).
- If unused, delete the file and ensure no broken references remain.
- If something still expects it, document why and leave a short note on the GitHub issue instead of deleting blindly.
- Work on **`development`**. Small change; no app feature work beyond cleanup.

## Status
- **WIP → UNTESTED:** 2026-11-25T08:57:46Z
- Confirmed unused: empty (0 bytes), tracked only at repo root, no Dockerfile/compose/script/doc path references to root `Contact`. UI "Contact" strings are i18n/labels only.
- Removed via `git rm Contact`.

## Testing instructions
1. From repo root: `test ! -e Contact && echo OK` (file must be gone).
2. `git ls-files Contact` must print nothing.
3. Optional smoke: `curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:4202/` → 200 (unrelated cleanup; app must still respond).
