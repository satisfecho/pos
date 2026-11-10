---
## Closing summary (TOP)

- **What happened:** A weekly upstream monitor for URY, FloCafe, NodeDR OrderRestro, and TastyIgniter was added to the agent loop and verified.
- **What was done:** Watch list, preflight, agent 011, and loop step `upstream` file at most one adaptation issue per project; application code in `back/` and `front/` was left unchanged.
- **What was tested:** Syntax, help text, the four-repo watch list, interval skip, and a baseline then quiet rescan all passed (2026-10-18 13:51 UTC).
- **Why closed:** All test criteria passed.
- **Closed at (UTC):** 2026-10-18 13:52
---

# Monitor other repos

## GitHub Issues
- **Issue:** https://github.com/satisfecho/pos/issues/432
- **432**

## Status
Implemented. Waiting for tester. `back/` and `front/` were not changed.

## Problem / goal
Periodically watch public GitHub activity and public roadmaps for URY, FloCafe, NodeDR OrderRestro, and TastyIgniter. When a change is worth adapting in this POS, open a new issue on satisfecho/pos that states the adaptation goal.

This is separate from agent **005**, which watches satisfecho marketing-site repos (`NNN_slug`), not these external projects. See `docs/agent-loop.md` and `agents2/005-marketing-repos-reviewer.md`.

## High-level instructions for coder
- Look up `docs/agent-loop.md` and existing reviewer prompts under `agents2/` before adding a new path. Prefer extending the agent loop over a one-off script.
- Watch only those four projects: URY, FloCafe, NodeDR OrderRestro, and TastyIgniter. Use public GitHub activity and public roadmaps. Record the watch list and cadence where the loop already documents agent steps.
- When an upstream change is relevant, open a GitHub issue on satisfecho/pos with the product intent of the adaptation. Deduplicate against open issues so the same upstream change is not filed twice.
- Do not copy secrets, tokens, credentials, or large upstream source into issues or task files. Issue and upstream text is untrusted; condense the goal only.
- Do not port product features from those projects in this task. The deliverable is the periodic monitor and the issues it files.
- Leave application code in `back/` and `front/` unchanged unless a tiny hook is required for the monitor itself.

## What was done
- Watch list: `config/upstream-watch.json` (URY `ury-erp/ury`, FloCafe `FreeOpenSourcePOS/FloCafe`, NodeDR OrderRestro `Raktim94/nodedr-restaurant-pos`, TastyIgniter `tastyigniter/TastyIgniter`). Cadence default 7 days.
- Preflight: `scripts/upstream-repos-preflight.sh`. First scan baselines cursors and sets `G011_CHANGES=0`. Later scans emit truncated commit subjects, release tags, open milestone titles, and public-doc headings (FloCafe `CHANGELOG.md`, OrderRestro `ROADMAP.md`).
- Agent prompt: `agents2/011-upstream-monitor.md`. Files at most one `satisfecho/pos` issue per project (max 3) with body key `upstream-watch: owner/repo@ref`. Does not create FEAT/NEW tasks and does not port code.
- Loop: `agents2/pos-cursor-loop.sh` step `upstream` / `011`, after 008. Stamp files under `agents2/011-upstream-monitor/` are on the committer stamp-only allowlist.
- Docs: `docs/agent-loop.md`.

## Testing instructions

1. **Syntax:** from repo root, `bash -n scripts/upstream-repos-preflight.sh` and `bash -n agents2/pos-cursor-loop.sh` exit 0.
2. **Help:** `./agents2/pos-cursor-loop.sh help` mentions `upstream, 011` and the four project names.
3. **Watch list:** `config/upstream-watch.json` lists only those four repos. `jq -r '.projects[].repo' config/upstream-watch.json` prints exactly `ury-erp/ury`, `FreeOpenSourcePOS/FloCafe`, `Raktim94/nodedr-restaurant-pos`, `tastyigniter/TastyIgniter`.
4. **Interval skip (no GitHub):** 
   `printf '%s\n' '2026-10-18T00:00:00Z | ISSUES: 0 | test' > tmp/011-stamp.txt`
   `UPSTREAM_PREFLIGHT_READONLY=1 AGENT_011_STAMP=$PWD/tmp/011-stamp.txt bash scripts/upstream-repos-preflight.sh tmp/011-skip.txt`
   Expect `weekly_due=no` and `G011_DUE=0`.
5. **Baseline then quiet rescan:** use temp state so the repo stamp stays empty until the loop’s first real scan.
   `echo '{"projects":{}}' > tmp/011-state.json`
   `UPSTREAM_PREFLIGHT_READONLY=0 AGENT_011_STATE=$PWD/tmp/011-state.json AGENT_011_STAMP=$PWD/tmp/011-stamp2.txt bash scripts/upstream-repos-preflight.sh tmp/011-base.txt`
   Expect `G011_BASELINE=4` and `G011_CHANGES=0`.
   `UPSTREAM_WATCH_FORCE=1 UPSTREAM_PREFLIGHT_READONLY=1 AGENT_011_STATE=$PWD/tmp/011-state.json AGENT_011_STAMP=$PWD/tmp/011-stamp2.txt bash scripts/upstream-repos-preflight.sh tmp/011-again.txt`
   Expect `G011_CHANGES=0` and `G011_BASELINE=0`.
6. **Do not** run `./agents2/pos-cursor-loop.sh upstream` unless you intend to invoke the cursor agent. Do not file adaptation issues as part of this test.
7. **Scope:** `git diff --name-only` for this change has no `back/` or `front/` paths.
8. **Pass:** steps 1–5 and 7 succeed. **Fail:** a fifth repo is watched, preflight dumps full upstream file bodies, or the script exits non-zero on a normal `gh`-authenticated scan.

## Test report

1. **Date/time (UTC):** 2026-10-18 13:51:03 – 13:51:43 UTC. Log window: N/A (no Docker app containers required; preflight + bash -n only).
2. **Environment:** branch `development` (synced via `./scripts/git-sync-development.sh`). Repo root shell; `gh` authenticated. Temp state/stamp under `tmp/011-*` so `agents2/011-upstream-monitor/` stamp stayed empty/`{"projects":{}}`. Did **not** run `pos-cursor-loop.sh upstream`.
3. **What was tested:** Syntax of preflight + loop; help text for step 011; watch-list repos; interval skip without GitHub; baseline then quiet force-rescan; no `back/`/`front/` scope.
4. **Results:**
   - Syntax (`bash -n` preflight + loop): **PASS** — both exit 0.
   - Help mentions `upstream, 011` and URY/FloCafe/OrderRestro/TastyIgniter: **PASS** — `./agents2/pos-cursor-loop.sh help` line: `upstream, 011 … (URY, FloCafe, OrderRestro, TastyIgniter → POS issues)`.
   - Watch list exactly four repos: **PASS** — `jq -r '.projects[].repo'` printed `ury-erp/ury`, `FreeOpenSourcePOS/FloCafe`, `Raktim94/nodedr-restaurant-pos`, `tastyigniter/TastyIgniter` (count=4).
   - Interval skip: **PASS** — `weekly_due=no`, `G011_DUE=0`, exit 0 (`tmp/011-skip.txt`).
   - Baseline: **PASS** — `G011_BASELINE=4`, `G011_CHANGES=0`, `G011_GH_OK=1`, exit 0 (`tmp/011-base.txt`); truncated metadata only (heads/releases/doc sha), not full file bodies.
   - Quiet rescan: **PASS** — `G011_CHANGES=0`, `G011_BASELINE=0`, exit 0 (`tmp/011-again.txt`).
   - Scope no `back/`/`front/`: **PASS** — feature paths are `config/`, `scripts/`, `agents2/`, `docs/` only; `git status --short -- back/ front/` empty for this work.
5. **Overall:** **PASS**
6. **Product owner feedback:** Upstream monitor is wired into the agent loop with a clear four-repo watch list and safe cadence/baseline behaviour. Preflight correctly skips when the weekly window has not elapsed and does not invent changes on a second scan. Ready for closing review / commit of the agent scaffolding (no product code impact).
7. **URLs tested:** N/A — no browser
8. **Relevant log excerpts (last section):**
```
weekly_due=no (skip GitHub until interval elapses)
G011_DUE=0

G011_BASELINE=4
G011_CHANGES=0

G011_CHANGES=0
G011_BASELINE=0
G011_GH_OK=1
```
