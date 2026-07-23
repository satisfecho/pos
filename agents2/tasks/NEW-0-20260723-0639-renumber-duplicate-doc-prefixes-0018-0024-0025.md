# Renumber remaining duplicate docs prefixes (0018 / 0024 / 0025)

## GitHub Issues
- **Issue:** (none — enhancement reviewer)
- **0**

## Problem / goal

Several `docs/` pairs still share the same numeric prefix, so Feature-guide indexes and agent “open 00NN” shortcuts are ambiguous. **`NEW-0-20260722-1310-renumber-0015-platform-operator-doc`** already owns the **0015** kitchen vs platform split; the same sweep noted **0018**, **0024**, and **0025** still need renames, and those renumber tasks were never queued.

## Evidence (008 preflight / review)

- Weekly docs drift (SIGNAL `docs_stale`); pairs still on disk:
  - `0018-gmail-setup.md` vs `0018-verifactu-fiscal-invoicing.md`
  - `0024-whatsapp-reminder-notes.md` vs `0024-deploy-css-fix-amvara9.md`
  - `0025-reservation-overbooking-detection.md` vs `0025-test-scenario-one-empty-table.md`
- Status/content NEWs already cover some of these files (gmail SMTP, WhatsApp shipped, overbooking shipped, 0025 seat math, 0024 deploy CSS shipped) — **this task is rename + link fix only**, not another status banner rewrite
- Do **not** touch `0015-*` (owned by the platform renumber NEW) or `0021-*` unless a quick `rg` shows a trivial one-liner left; prefer the three pairs above

## High-level instructions for coder

- Assign the next free `005x` / `006x` ids (after **0054** restaurant groups and any **0055** platform rename already applied). Suggested keep-original / rename-newcomer:
  - Keep **verifactu** as 0018; renumber **gmail-setup** → next free
  - Keep **whatsapp** as 0024; renumber **deploy-css-fix** → next free (or reverse if README historically preferred deploy as 0024 — pick one rule and document in the commit message)
  - Keep **overbooking-detection** as 0025; renumber **test-scenario-one-empty-table** → next free
- Update **`docs/README.md`** Feature guides rows and any in-repo links (`rg` under `docs/`, `AGENTS.md`, open `agents2/tasks/NEW-0-*` that cite the old paths)
- Coordinate with open status NEWs that still name the old basenames (update their paths in-place when renaming so coders are not sent to missing files)
- No product code changes
- Pass/fail: each of 0018 / 0024 / 0025 has exactly one `docs/00NN-*.md`; README links resolve; `rg` for old filenames under `docs/` is clean
