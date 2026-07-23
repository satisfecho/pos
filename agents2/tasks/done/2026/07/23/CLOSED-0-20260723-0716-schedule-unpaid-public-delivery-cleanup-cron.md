---
## Closing summary (TOP)

- **What happened:** Ops gap: unpaid public Satisfecho Delivery TTL cleanup CLI existed, but amvara9 host cron was undocumented next to demo reset.
- **What was done:** Added `scripts/cleanup-unpaid-public-delivery-on-server.sh`, documented hourly UTC cron in `docs/0001`, and cross-linked from `docs/0053`; demo-reset cron left unchanged.
- **What was tested:** Docs/crontab/cross-link checks and wrapper + CLI `--dry-run` all **PASS** (tester 2026-07-23).
- **Why closed:** All pass/fail criteria met; no GitHub issue (0).
- **Closed at (UTC):** 2026-07-23 07:23
---

# Schedule unpaid public Satisfecho Delivery TTL cleanup on amvara9

## GitHub Issues
- **Issue:** (none — enhancement reviewer)
- **0**

## Problem / goal

Abandoned unpaid public Satisfecho Delivery checkouts can accumulate on **all** tenants. The idempotent cleanup CLI shipped in **2.1.27** (`python -m app.seeds.cleanup_unpaid_public_delivery`), and **`docs/0053`** says to schedule it on host cron, but **`docs/0001-ci-cd-amvara9.md`** only documents the tenant-1 **demo data reset** cron. Without a production schedule, unpaid public rows keep growing outside demo tenant 1.

## Evidence (008 preflight / review)

- Weekly sweep 2026-07-23: `SIGNAL changelog_sparse` / `docs_stale` already owned; investigating post-ship ops gap after **CLOSED-0-20260723-0658-cleanup-unpaid-public-delivery-orders**
- Cleanup CLI + pytest live; **0053** § Unpaid public checkout cleanup documents commands and notes “Optional ops: schedule… host cron (separate from tenant-1 demo reset)”
- `docs/0001-ci-cd-amvara9.md` § Daily demo data reset has crontab for `reset-demo-data-on-server.sh` only — no `cleanup_unpaid_public_delivery`
- Demo reset wipes tenant 1 orders only; it does **not** replace all-tenant TTL cleanup

## High-level instructions for coder

- Document a host cron on amvara9 in **`docs/0001-ci-cd-amvara9.md`** (new short subsection next to demo reset), e.g. hourly or every few hours UTC, running:
  `docker compose … exec -T back python -m app.seeds.cleanup_unpaid_public_delivery`
  (or a thin `scripts/cleanup-unpaid-public-delivery-on-server.sh` wrapper mirroring `reset-demo-data-on-server.sh` if that is clearer)
- Keep scope **ops/docs (+ optional wrapper script)** — do not change cleanup business rules or merge into tenant-1 demo reset
- Cross-link from **`docs/0053-satisfecho-delivery-order-channel.md`** “Optional ops” to the 0001 cron stanza
- Pass/fail: 0001 has a copy-paste crontab (or install one-liner); dry-run on dev still works; demo-reset cron unchanged

## Implementation notes (feature coder)

- Added `scripts/cleanup-unpaid-public-delivery-on-server.sh` (executable; mirrors demo-reset wrapper; passes through `--dry-run` / `--ttl-hours` / etc.).
- Documented **§ Unpaid public Satisfecho Delivery cleanup (all tenants)** in `docs/0001-ci-cd-amvara9.md` with hourly UTC cron at `:15` and install one-liner.
- Cross-linked from `docs/0053` Optional ops → 0001 cron stanza.
- Demo-reset cron stanza left unchanged. No cleanup business-rule changes.
- Changelog `[Unreleased]` entry added. No GitHub issue (0) — skipped `gh` label/comment.

## Testing instructions

1. **Docs present:** Confirm `docs/0001-ci-cd-amvara9.md` has subsection **Unpaid public Satisfecho Delivery cleanup (all tenants)** with:
   - Manual: `./scripts/cleanup-unpaid-public-delivery-on-server.sh` and `--dry-run`
   - Copy-paste crontab: `15 * * * * cd /development/pos && ./scripts/cleanup-unpaid-public-delivery-on-server.sh >>/var/log/pos-unpaid-public-delivery-cleanup.log 2>&1`
   - Install one-liner using `grep -q 'cleanup-unpaid-public-delivery-on-server.sh'`
   - Explicit note that this is **separate** from tenant-1 demo reset
2. **Demo reset unchanged:** `docs/0001` § Daily demo data reset still has `0 4 * * *` … `reset-demo-data-on-server.sh` only (no merge of cleanup into that job).
3. **0053 cross-link:** `docs/0053-satisfecho-delivery-order-channel.md` § Unpaid public checkout cleanup Optional ops points at `docs/0001` § Unpaid public Satisfecho Delivery cleanup.
4. **Wrapper + dry-run (dev):**
   ```bash
   # From repo root; stack up
   docker compose -f docker-compose.yml -f docker-compose.dev.yml exec -T back \
     python -m app.seeds.cleanup_unpaid_public_delivery --dry-run
   # Expect exit 0 and a `[dry-run] matched=… cancelled=0 …` line
   test -x scripts/cleanup-unpaid-public-delivery-on-server.sh
   bash -n scripts/cleanup-unpaid-public-delivery-on-server.sh
   ```
5. **Pass/fail:** All of the above green; no change to cleanup TTL rules or demo-reset cron behavior.

## Test report

1. **Date/time (UTC):** 2026-07-23 07:21:54 start → 07:22:47 end. Log window: pos-back `--since 5m`.
2. **Environment:** `docker-compose.yml` + `docker-compose.dev.yml`; branch `development` @ `30056743`; local stack (pos-back Up). No browser / BASE_URL. No GitHub issue (0).
3. **What was tested:** Docs subsection + crontab/install one-liner in 0001; demo-reset cron unchanged; 0053 Optional ops cross-link; wrapper executable + bash -n; CLI `--dry-run` exit 0.
4. **Results:**
   - Docs present (0001 § Unpaid public…): **PASS** — subsection at L125–155 with manual/`--dry-run`, crontab `15 * * * * …cleanup-unpaid-public-delivery-on-server.sh`, install one-liner `grep -q 'cleanup-unpaid-public-delivery-on-server.sh'`, and explicit “separate from tenant-1 demo reset”.
   - Demo reset unchanged: **PASS** — § Daily demo data reset still `0 4 * * *` … `reset-demo-data-on-server.sh` only (L97–123); cleanup not merged.
   - 0053 cross-link: **PASS** — Optional ops points to `docs/0001-ci-cd-amvara9.md` § Unpaid public Satisfecho Delivery cleanup.
   - Wrapper + dry-run: **PASS** — `test -x` yes; `bash -n` ok; `python -m app.seeds.cleanup_unpaid_public_delivery --dry-run` exit 0 with `[dry-run] matched=0 cancelled=0 ttl_hours=2 cutoff=2026-07-23T05:22:15.250180+00:00`.
5. **Overall:** **PASS**
6. **Product owner feedback:** Ops gap is closed in docs: hourly UTC cron and a thin server wrapper sit next to demo reset without mixing jobs. Dry-run on local Docker confirms the CLI still behaves. Installing the cron on amvara9 remains a one-time host step for ops.
7. **URLs tested:** N/A — no browser
8. **Relevant log excerpts (last section):** CLI stdout (not HTTP):
   ```
   [dry-run] matched=0 cancelled=0 ttl_hours=2 cutoff=2026-07-23T05:22:15.250180+00:00
   EXIT=0
   ```
   pos-back in window showed only routine `/docs` 200s; no errors from the dry-run module invocation.
