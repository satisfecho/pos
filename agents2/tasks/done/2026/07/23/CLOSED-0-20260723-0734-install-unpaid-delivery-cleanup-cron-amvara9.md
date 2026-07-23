---
## Closing summary (TOP)

- **What happened:** Unpaid public Satisfecho Delivery TTL cleanup was documented and wrapped on `development`, but amvara9 still lacked the script on checkout and the hourly host cron.
- **What was done:** Promoted `development` → `master` (`6df7867a`), deployed on amvara9 (manual after GHA marketing-artifact failure), dry-ran the wrapper, and installed hourly UTC `:15` cron; demo-reset cron left unchanged.
- **What was tested:** Script present/executable, dry-run exit 0, cleanup cron exact match, demo-reset separate — all **PASS** (tester 2026-07-23).
- **Why closed:** All pass/fail criteria met; no GitHub issue (0).
- **Closed at (UTC):** 2026-07-23 07:42
---

# Install unpaid public delivery cleanup cron on amvara9

## GitHub Issues
- **Issue:** (none — enhancement reviewer)
- **0**

## Problem / goal

TTL cleanup for abandoned unpaid public Satisfecho Delivery checkouts is **documented** and the wrapper exists on **`development`**, but production amvara9 still only runs the tenant-1 **demo data reset** cron. Without the hourly cleanup job, unpaid public rows keep accumulating on all tenants.

## Evidence (008 preflight / review)

- Weekly sweep 2026-07-23: `SIGNAL changelog_sparse` / `docs_stale` already owned; follow-up after **CLOSED-0-20260723-0716-schedule-unpaid-public-delivery-cleanup-cron** (docs + script only)
- `ssh amvara9`: crontab has `reset-demo-data-on-server.sh` only; **no** `cleanup-unpaid-public-delivery-on-server.sh`; script path missing under `/development/pos/scripts/` (not yet on server checkout / `origin/master`)
- Runbook: `docs/0001-ci-cd-amvara9.md` § Unpaid public Satisfecho Delivery cleanup; wrapper `scripts/cleanup-unpaid-public-delivery-on-server.sh` on `development`

## High-level instructions for coder

- Ensure the wrapper + seed module are present on the amvara9 checkout (`/development/pos`) — promote **`development` → `master`** and deploy (or equivalent pull) so `scripts/cleanup-unpaid-public-delivery-on-server.sh` exists and is executable; do not invent a second cleanup path
- Install host cron once per **`docs/0001`** (hourly UTC at `:15`), e.g. install one-liner with `grep -q 'cleanup-unpaid-public-delivery-on-server.sh'`
- Dry-run first: `./scripts/cleanup-unpaid-public-delivery-on-server.sh --dry-run`
- Leave the tenant-1 demo-reset cron unchanged; do not merge the two jobs
- Pass/fail: crontab lists cleanup line; dry-run exits 0; demo-reset cron still present

## Implementation notes (feature coder)

- Merged **`development` → `master`** (`6df7867a`, through **2.1.27**) and pushed `origin/master`.
- GitHub Actions **Deploy to amvara9** failed early on marketing artifact fetch (placeholders for `dilruba` / `flamanapolitana` / `hakone` — PAT/artifact gap). Used **equivalent manual deploy** on amvara9: backed up `front/sites`, `git reset --hard origin/master`, restored sites, ran `bash scripts/deploy-amvara9.sh` (exit 0; HEAD `6df7867a`).
- Dry-run on server: `[dry-run] matched=0 cancelled=0 ttl_hours=2` (exit 0).
- Installed host cron once (UTC hourly at `:15`) via the docs/0001 one-liner; left `0 4 * * * … reset-demo-data-on-server.sh` unchanged.
- No GitHub issue (0) — skipped `gh` label/comment.
- Landing/health smoke after deploy: `https://www.satisfecho.de/` → 200; `/api/health` → `{"status":"ok"}`.

## Testing instructions

1. **Script on amvara9:**  
   `ssh amvara9 'test -x /development/pos/scripts/cleanup-unpaid-public-delivery-on-server.sh && ls -la /development/pos/scripts/cleanup-unpaid-public-delivery-on-server.sh'`  
   Expect executable present; server HEAD should include it (`git -C /development/pos rev-parse --short HEAD` near `6df7867a` or later master).

2. **Dry-run exits 0:**  
   `ssh amvara9 'cd /development/pos && ./scripts/cleanup-unpaid-public-delivery-on-server.sh --dry-run'`  
   Expect exit 0 and a `[dry-run] matched=… cancelled=0 …` line.

3. **Cleanup cron installed:**  
   `ssh amvara9 'crontab -l | grep cleanup-unpaid-public-delivery-on-server.sh'`  
   Expect: `15 * * * * cd /development/pos && ./scripts/cleanup-unpaid-public-delivery-on-server.sh >>/var/log/pos-unpaid-public-delivery-cleanup.log 2>&1`

4. **Demo-reset cron still present (unchanged):**  
   `ssh amvara9 'crontab -l | grep reset-demo-data-on-server.sh'`  
   Expect: `0 4 * * * cd /development/pos && ./scripts/reset-demo-data-on-server.sh >>/var/log/pos-demo-reset.log 2>&1`  
   Confirm cleanup was **not** merged into that line.

5. **Pass/fail:** All of the above green; no second cleanup path invented.

## Test report

1. **Date/time (UTC):** 2026-07-23T07:41:34Z – 2026-07-23T07:41:48Z. Log window: amvara9 host SSH checks (no local Docker logs required).
2. **Environment:** Production amvara9 (`/development/pos`), server HEAD `6df7867a` (`origin/master`). Local branch `development` @ `9a95a899` (tester only; verification on amvara9). No `BASE_URL` browser flow.
3. **What was tested:** Script present/executable; dry-run exit 0; cleanup cron at `:15`; demo-reset cron unchanged and separate; no second cleanup path.
4. **Results:**
   - Script on amvara9: **PASS** — `-rwxr-xr-x` `/development/pos/scripts/cleanup-unpaid-public-delivery-on-server.sh`; `git rev-parse --short HEAD` → `6df7867a`.
   - Dry-run exits 0: **PASS** — `[dry-run] matched=0 cancelled=0 ttl_hours=2 cutoff=2026-07-23T05:41:44.124528+00:00`; `DRY_RUN_EXIT=0`.
   - Cleanup cron installed: **PASS** — `15 * * * * cd /development/pos && ./scripts/cleanup-unpaid-public-delivery-on-server.sh >>/var/log/pos-unpaid-public-delivery-cleanup.log 2>&1` (exactly one crontab match).
   - Demo-reset cron still present: **PASS** — `0 4 * * * cd /development/pos && ./scripts/reset-demo-data-on-server.sh >>/var/log/pos-demo-reset.log 2>&1`; cleanup not merged into that line.
   - No second cleanup path: **PASS** — only `cleanup-unpaid-public-delivery-on-server.sh` under scripts; crontab grep count = 1.
5. **Overall:** **PASS**
6. **Product owner feedback:** Hourly unpaid public delivery TTL cleanup is live on amvara9 alongside the existing daily demo reset. Abandoned unpaid public checkouts will no longer accumulate indefinitely once past the 2h TTL. No GitHub issue to update (issue 0).
7. **URLs tested:** N/A — no browser
8. **Relevant log excerpts (last section):**
```
-rwxr-xr-x 1 root root 1214 Jul 23 07:37 /development/pos/scripts/cleanup-unpaid-public-delivery-on-server.sh
6df7867a
[dry-run] matched=0 cancelled=0 ttl_hours=2 cutoff=2026-07-23T05:41:44.124528+00:00
DRY_RUN_EXIT=0
15 * * * * cd /development/pos && ./scripts/cleanup-unpaid-public-delivery-on-server.sh >>/var/log/pos-unpaid-public-delivery-cleanup.log 2>&1
0 4 * * * cd /development/pos && ./scripts/reset-demo-data-on-server.sh >>/var/log/pos-demo-reset.log 2>&1
```
