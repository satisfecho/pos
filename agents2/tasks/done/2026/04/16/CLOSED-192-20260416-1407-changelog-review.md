# Changelog Review

## GitHub Issues
- **Issue:** https://github.com/satisfecho/pos/issues/192
- **192**

## Problem / goal
Review the repository root `CHANGELOG.md`, especially the `[Unreleased]` section. Compare it to recent commits on `development` and ensure entries match what actually shipped or is about to ship: add missing user-relevant items, fix inaccurate wording, and trim noise. Keep scope to changelog accuracy and repo release conventions unless the issue is expanded later.

## High-level instructions for coder
- Inspect `CHANGELOG.md` and cross-check with `git log` / recent merges on `development` so `[Unreleased]` reflects real changes.
- Apply project rules in `.cursor/rules/commit-changelog-version.mdc` (and `AGENTS.md`) for when to version-bump vs leave items under `[Unreleased]`.
- Update `README.md` or `docs/` only if the changelog review reveals documented behavior that no longer matches reality.
- After edits, run an appropriate smoke check if anything beyond markdown could be affected; pure changelog edits may only need quick sanity review.

## Testing instructions

1. Open `CHANGELOG.md` and confirm **`[Unreleased]`** lists only work **after** the **2.0.75** release (package `front/package.json` still at `2.0.75`): floor plan payment chip anchor (#188), `payment_status` pending behavior (#189), `bill_requested_at` preserved on mark paid / finish (#190).
2. Spot-check version sections **2.0.72**–**2.0.75** against `git log` for `front/` and `back/` (optional: `git log --oneline cc53daf^..4bf90f4` for the 2.0.73–2.0.75 window) so nothing user-visible is missing or duplicated under the wrong version.
3. No Docker or frontend build required (markdown-only change).

---

## Test report

1. **Date/time (UTC) and log window:** 2026-04-16 14:13–14:18 UTC. No container log window (markdown-only verification; no Docker services exercised).

2. **Environment:** Repo `/Users/raro42/projects/pos2`, branch `development` (synced via `./scripts/git-sync-development.sh` before edits). No `BASE_URL` / browser.

3. **What was tested:** Items 1–3 under **Testing instructions** above (`CHANGELOG.md` `[Unreleased]` vs 2.0.75 baseline; spot-check 2.0.72–2.0.75 vs `git log`).

4. **Results:**
   - **`[Unreleased]` scope vs 2.0.75 / `#188`–`#190`:** **PASS** — `CHANGELOG.md` `[Unreleased]` contains under **Changed** the floor-plan payment chip anchor (#188); under **Fixed**, `payment_status` pending (#189) and `bill_requested_at` preservation on mark paid / finish (#190). `front/package.json` `"version": "2.0.75"` matches the task baseline.
   - **Version sections 2.0.72–2.0.75 vs `git log`:** **PASS** — Spot-check: `2.0.75` documents #187 (payment chip vs operational fill); commits `7a111ff` (#188), `cdd69f9` (#189), `d74ad6b` (#190) appear after the 2.0.75 release content and are correctly only in `[Unreleased]`, not duplicated under `2.0.75`. `2.0.74` / `2.0.73` / `2.0.72` entries align with the referenced issues in recent `git log` for `front/` and `back/` (no obvious wrong-version placement in this pass).
   - **Docker / frontend build:** **PASS** — Not required per Testing instructions §3.

5. **Overall:** **PASS** (all criteria).

6. **Product owner feedback:** The changelog keeps unreleased floor-plan and payment fixes (#188–#190) clearly separated from the shipped **2.0.75** section (#187), which matches how the work landed on `development`. Readers can trust `[Unreleased]` for what is still pending release at **2.0.75**.

7. **URLs tested:** **N/A — no browser** (static file review only).

8. **Relevant log excerpts:** **N/A** — no application requests; verification used repository files and `git log` only.
