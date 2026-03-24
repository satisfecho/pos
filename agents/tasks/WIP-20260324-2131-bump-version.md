# Bump Version

## GitHub

- **Issue:** https://github.com/satisfecho/pos/issues/70

## Problem / goal

The reporter notes many unmerged commits on `development` and asks to bump the version and merge into `master`/`main`. Version and changelog live in this repo per `front/package.json` / `CHANGELOG.md` and team rules in `.cursor/rules/commit-changelog-version.mdc`. Promotion of `development` → `master` is governed by `.cursor/rules/git-development-branch-workflow.mdc` and `docs/agent-loop.md` (not every bump requires an immediate production merge unless criteria there are met).

## High-level instructions for coder

- Review `CHANGELOG.md` `[Unreleased]` and align with what would ship; cut a new `## [X.Y.Z] - YYYY-MM-DD` section when appropriate and bump `front/package.json` / `front/package-lock.json` per project convention.
- Confirm branch state: routine commits stay on `development`; merging to `master` only when the workflow allows (batch cadence, production-urgent, or explicit product request).
- If the issue author expects an immediate production release, capture that explicitly in the issue or verify with the maintainer before merging `master`.
- After changes, run the usual smoke checks from `AGENTS.md` / `docs/testing.md` for anything that touches the built app.

## Implementation (feature coder)

- Released **`[2.0.54] - 2026-03-24`** from prior `[Unreleased]` entries; reset `[Unreleased]` to empty.
- Bumped **`front/package.json`** and **`front/package-lock.json`** to **2.0.54**.
- **No `development` → `master` merge** in this change: promotion follows `.cursor/rules/git-development-branch-workflow.mdc` (issue #70 asked generally; use batch/urgent criteria or maintainer confirmation for production).

## Testing instructions

- **What to verify:** Changelog and app version reflect **2.0.54**; no typos in `CHANGELOG.md` headers.
- **How to test:**
  1. Open `CHANGELOG.md` — top released section is **`## [2.0.54] - 2026-03-24`**; **`## [Unreleased]`** has no bullet lists yet.
  2. `grep '"version"' front/package.json` → **2.0.54**; same in **`front/package-lock.json`** root and **`packages.""`** entries.
  3. With stack up (HAProxy e.g. **4202**): `BASE_URL=http://127.0.0.1:4202 npm run test:landing-version --prefix front` — pass (checks landing / version display).
  4. Optional (staff login): `npm run test:changelog --prefix front` — dashboard changelog modal still loads **GET /changelog** after release section change.
- **Pass–fail:** Steps 1–2 exact; step 3 exit code **0**; step 4 optional exit **0** or skip if no credentials.

---

## Test report

1. **Date/time (UTC) and log window:** Started **2026-03-24T21:35:24Z**; Puppeteer and compose logs through **~2026-03-24T21:36:05Z**.

2. **Environment:** `docker-compose.yml` + `docker-compose.dev.yml`; **`BASE_URL=http://127.0.0.1:4202`**; git branch **`development`**.

3. **What was tested (from “What to verify”):** Changelog and app version reflect **2.0.54**; `CHANGELOG.md` headers; package versions; landing smoke + optional changelog modal.

4. **Results:**
   - **`CHANGELOG.md`:** **PASS** — `## [Unreleased]` is empty (no bullets); next section is `## [2.0.54] - 2026-03-24` (header spelling OK). Evidence: workspace file lines 7–9.
   - **`front/package.json` / `package-lock.json`:** **PASS** — `"version": "2.0.54"` at package root and `packages.""`. Evidence: `grep '"version"' front/package.json` → 2.0.54; lockfile lines 3 and 9.
   - **Landing visible version vs 2.0.54:** **FAIL** — `npm run test:landing-version` exited **0**, but script only requires *a* semver in the footer; DOM text was **`2.0.42 66a1696`**. Workspace `front/src/environments/commit-hash.ts` still exports **`version = '2.0.42'`** (auto-generated file not refreshed after bump). Evidence: Puppeteer log line “Version element text: 2.0.42 66a1696”; `commit-hash.ts` on disk.
   - **`npm run test:changelog`:** **PASS** — exit **0**; modal content length 76610; “What's new” flow OK. Evidence: script stdout “Changelog (What's new) test passed.”

5. **Overall:** **FAIL** — failed criterion: **app-visible version must match release 2.0.54** (per task “What to verify”), despite package/changelog being correct.

6. **Product owner feedback:** The release metadata in git is consistent at **2.0.54**, but guests and staff still see **2.0.42** on the public landing footer because the generated **`commit-hash.ts`** was not updated with the bump. Regenerate it (Docker entrypoint / `node front/scripts/get-commit-hash.js` or equivalent) and re-run the landing check until the footer shows **2.0.54**.

7. **URLs tested:**
   1. `http://127.0.0.1:4202/`
   2. `http://127.0.0.1:4202/login?tenant=1`
   3. `http://127.0.0.1:4202/dashboard` (and 15 sidebar routes + 5 inventory sublinks per script)

8. **Relevant log excerpts:**
   - **Puppeteer (`test:landing-version`):** `Version element text: 2.0.42 66a1696` … `>>> RESULT: Landing version OK; demo login (tenant=1) OK; sidebar nav OK.` (exit 0).
   - **`docker compose … logs --tail=25 front`:** `Application bundle generation complete. [0.405 seconds] - 2026-03-24T21:33:07.193Z` / `Page reload sent to client(s).` (no build errors in window).
