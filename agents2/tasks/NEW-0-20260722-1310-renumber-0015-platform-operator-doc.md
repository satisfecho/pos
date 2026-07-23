# Renumber duplicate 0015 platform-operator doc

## GitHub Issues
- **Issue:** (none — enhancement reviewer)
- **0**

## Problem / goal

Two feature guides share the **`0015-`** prefix: `docs/0015-kitchen-display.md` (kitchen/bar KDS) and `docs/0015-platform-operator-portal.md` (SaaS platform portal). `docs/README.md` indexes both under Feature guides with the same number, so agents and humans cannot tell which “0015” to open. Kitchen display owned the number first; platform portal should get the next free id.

## Evidence (008 preflight / review)

- Weekly docs drift sweep: duplicate numeric prefixes in `docs/` (`0015`, also `0018`/`0024`/`0025` — scope **only 0015 platform** here; other pairs already have or will get separate tasks)
- Platform doc exists and is recent (2026-07-14); kitchen doc is older and correctly listed as kitchen KDS
- Cross-links: `WIP-296` and README delivery/saas NEW mention `docs/0015-platform-operator-portal.md` — update those paths when renaming

## High-level instructions for coder

- Rename `docs/0015-platform-operator-portal.md` → **`docs/0055-platform-operator-portal.md`** (next free `005x` after 0054 restaurant groups).
- Update **`docs/README.md`** Feature guides row (link + keep kitchen as 0015).
- Update in-repo references that point at the old path (at least open task **`NEW-0-20260722-1159-readme-delivery-courier-saas-features.md`** if still open, and **`WIP-296-…`** context line). Prefer a short `rg '0015-platform-operator'` pass under `docs/` and `agents2/`.
- Do not renumber kitchen display; no product code changes.
- Pass/fail: only one `0015-*.md`; platform guide opens as `0055-…`; README links resolve.
