---
## Closing summary (TOP)

- **What happened:** Committer path often bumped `front/package.json` without refreshing `commit-hash.ts`, so landing footer / `test:landing-version` drifted.
- **What was done:** Documented regen+stage of `commit-hash.ts` via `get-commit-hash.js` in `040-committer.md`, the commit-changelog Cursor rule, and a one-line note in `docs/testing.md`.
- **What was tested:** Dry-read of all three docs — all criteria PASS.
- **Why closed:** All acceptance criteria passed; docs-only process fix verified.
- **Closed at (UTC):** 2026-07-23 19:23
---

# Committer: regenerate commit-hash.ts on version bump

## GitHub Issues
- **Issue:** (none — enhancement reviewer)
- **0**

## Problem / goal

Every substantial changelog cut bumps **`front/package.json`** but often leaves **`front/src/environments/commit-hash.ts`** on an older semver. Landing footer and **`test:landing-version`** then fail until someone remembers **`get-commit-hash.js`**. This has recurred across many closed tasks (skip-env workarounds). Make the **040 committer** path always refresh that file when it bumps version so the tracked footer stamp stays correct.

## Evidence (008 preflight / review)

- Weekly sweep 2026-07-23: after **2.1.29** cut, `commit-hash.ts` still at **2.1.8** (concrete sync owned by sibling **NEW-0-20260723-1918-sync-landing-commit-hash-semver**)
- **`agents2/040-committer.md`** mentions bumping `package.json` / lockfile / CHANGELOG but does **not** mention regenerating `commit-hash.ts`
- `front/docker-entrypoint.sh` already calls `get-commit-hash.js` on start; that does not help until restart, and does not update the committed tree for agents/CI reading git

## High-level instructions for coder

- Update **`agents2/040-committer.md`** (and the commit-changelog Cursor rule if needed): when bumping **`front/package.json`** version, always run **`node front/scripts/get-commit-hash.js`** and **stage** the resulting **`commit-hash.ts`** in the same commit as the bump
- Optionally add a one-line reminder in **`docs/testing.md`** near the landing-version section (not a bulk rewrite)
- Do not change product UI; do not invent a new versioning scheme
- Sibling **NEW-0-20260723-1918-sync-landing-commit-hash-semver** owns the immediate file sync — this task is process/docs so future bumps stay clean
- Pass/fail: 040 prompt (and rule if touched) explicitly requires regen+stage of `commit-hash.ts` on version bump; a dry-read of the prompt mentions `get-commit-hash.js`

## Implementation notes

- Updated **`agents2/040-committer.md`**: Version bump section + instruction step 5 require `node front/scripts/get-commit-hash.js` and staging `commit-hash.ts` with the bump.
- Updated **`.cursor/rules/commit-changelog-version.mdc`**: same regen+stage requirement on version bump.
- Added one-line reminder under landing-version in **`docs/testing.md`**.
- No product UI / versioning scheme changes; sibling NEW owns the immediate `commit-hash.ts` sync.

## Testing instructions

1. Dry-read **`agents2/040-committer.md`**: confirm it mentions **`get-commit-hash.js`** and that a version bump must regenerate and stage **`front/src/environments/commit-hash.ts`**.
2. Dry-read **`.cursor/rules/commit-changelog-version.mdc`**: confirm the version-bump bullet requires the same regen+stage step.
3. Dry-read **`docs/testing.md`** (Landing page / Version in footer): confirm the one-line reminder about running **`get-commit-hash.js`** after a package.json bump.
4. Pass if all three mention the regen+stage requirement; fail if any is missing.

## Test report

1. **Date/time (UTC):** 2026-07-23 19:22:58 UTC start; completed ~19:24 UTC. Log window: N/A (docs-only dry-read; no container runtime under test).
2. **Environment:** branch `development` (synced via `./scripts/git-sync-development.sh`); compose `docker-compose.yml` + `docker-compose.dev.yml` up locally but unused for this task; no `BASE_URL`.
3. **What was tested:** Dry-read of `agents2/040-committer.md`, `.cursor/rules/commit-changelog-version.mdc`, and `docs/testing.md` (Landing page / Version in footer) for explicit regen+stage of `commit-hash.ts` via `get-commit-hash.js` on version bump.
4. **Results:**
   - Criterion 1 (`040-committer.md`): **PASS** — Version bump section (lines 33–39) requires `node front/scripts/get-commit-hash.js` and `git add` of `front/src/environments/commit-hash.ts`; instruction step 5 repeats the same.
   - Criterion 2 (`commit-changelog-version.mdc`): **PASS** — Version-bump bullet (item 2) says **Always** run `get-commit-hash.js` after the bump and **stage** `commit-hash.ts` in the same commit.
   - Criterion 3 (`docs/testing.md`): **PASS** — Under “Version in footer”, reminder: after `front/package.json` bump, run `get-commit-hash.js` and commit `commit-hash.ts` with the bump.
5. **Overall:** **PASS**
6. **Product owner feedback:** Committer and Cursor rule now both mandate regenerating and staging the footer stamp with every semver bump, which should stop the recurring landing-version drift. The testing.md one-liner gives humans and agents a second reminder at the smoke-test docs. Sibling NEW task still owns catching up the current out-of-sync `commit-hash.ts` file.
7. **URLs tested:** N/A — no browser
8. **Relevant log excerpts:** N/A — documentation-only verification; no product runtime exercised.
