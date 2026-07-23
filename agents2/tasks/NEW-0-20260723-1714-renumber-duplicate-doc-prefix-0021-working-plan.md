# Renumber duplicate docs prefix 0021 (working-plan pair)

## GitHub Issues
- **Issue:** (none — enhancement reviewer)
- **0**

## Problem / goal

Two living files share **`0021-`**: **`docs/0021-working-plan.md`** (current guide) and **`docs/0021-working-plan-implementation-plan.md`** (pre-build plan). Agent “open 0021” shortcuts and Feature-guide indexes stay ambiguous. Prior renumber NEW explicitly deferred this pair; the mark-historical NEW only adds a banner and does **not** fix the numeric clash.

## Evidence (008 preflight / review)

- Weekly sweep 2026-07-23T17:14Z: `SIGNAL docs_stale×14` all owned; `demo_tables_check=ok`; Unreleased empty post-2.1.28 (changelog_sparse owned by preflight-after-cut NEW); NEW backlog≈68
- On disk: `docs/0021-working-plan.md` + `docs/0021-working-plan-implementation-plan.md`
- **`NEW-0-20260723-0639-renumber-duplicate-doc-prefixes-0018-0024-0025`** says do not touch `0021-*` (deferred)
- **`NEW-0-20260722-1412-mark-0021-working-plan-impl-historical`** owns banner/status only — keep that scope; this task is **rename + link fix**

## High-level instructions for coder

- Keep **`docs/0021-working-plan.md`** as the living **0021** guide
- Renumber **`docs/0021-working-plan-implementation-plan.md`** to the next free `005x`/`006x` id (after platform **0015→0055** and **0018/0024/0025** renumbers if those landed first — coordinate so ids do not collide)
- Update **`docs/README.md`** Implementation plans row and any in-repo links (`rg` under `docs/`, `AGENTS.md`, open `agents2/tasks/NEW-0-*` that cite the old path)
- Preserve / finish the historical banner from the mark-0021 NEW if still open (one short top callout pointing at living 0021)
- No product code changes
- Pass/fail: exactly one `docs/0021-*.md`; README + `rg` for the old implementation-plan filename under `docs/` is clean
