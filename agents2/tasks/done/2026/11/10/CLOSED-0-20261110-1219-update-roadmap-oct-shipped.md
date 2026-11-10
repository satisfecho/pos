---
## Closing summary (TOP)

- **What happened:** Enhancement reviewer filed a docs-only task to refresh ROADMAP for Oct 2026 shipped work still framed as through 2026-09-14.
- **What was done:** Updated `ROADMAP.md` Shipped through 2026-10-22 with customer-facing display (#434), newsletter (#435), and VeriFactu anulación / multi-rate IVA (#431); aligned `docs/0032` on #54 newsletter MVP vs open automation.
- **What was tested:** Docs-only criteria 1-5 all PASS (scope, Shipped date, theme rg, CHANGELOG/CLOSED evidence, open FEATs not marked shipped).
- **Why closed:** All tester criteria passed; no GitHub issue (issue 0).
- **Closed at (UTC):** 2026-11-10 12:44
---

# Update ROADMAP for Oct 2026 shipped work

## GitHub Issues
- **Issue:** (none - enhancement reviewer)
- **0**

## Status
- **Implemented:** 2026-11-10T12:22:31Z (agent 010)
- Docs-only: `ROADMAP.md` + `docs/0032-github-issues-roadmap.md`. No product code. No GitHub issue to label/comment.

## Problem / goal

Root **`ROADMAP.md`** still frames shipped work as "through **2026-09-14**" (CHANGELOG through **2.1.149-2.1.162**). User-visible Oct 2026 slices are already live in CHANGELOG **2.1.183-2.1.186** and closed tasks under **`agents2/tasks/done/2026/10/`**. Contributors reading ROADMAP miss customer-facing counter display, newsletter sending, VeriFactu staff anulación UI / multi-rate IVA, and related doc links. The file's own weekly checklist asks for this refresh; last substantive roadmap pass was **CLOSED-0-20260914-1102**.

## Evidence (008 preflight / review)

- Digest 2026-11-10: `weekly_due=yes` (`last_review_iso=never` / days=999); `G008_NEW_BACKLOG_PAUSE=0`; NEW=0 FEAT=3; demo checks ok; no labeled SIGNAL failures
- `ROADMAP.md` Shipped intro still says through 2026-09-14; `rg` misses newsletter / customer-facing display / `/display`
- Evidence in CHANGELOG **2.1.183-2.1.186** and CLOSED-431 / 434 / 435 (plus related #432/#433 agent/ops notes where product-facing)
- Feature docs exist: `docs/0078-customer-facing-display.md`, `docs/0079-newsletter.md`, `docs/0065` / `docs/0018` for VeriFactu anulación
- Do **not** duplicate open FEAT-388 / 438 / 439 (product/ops blocked on human - not roadmap text)

## High-level instructions for coder

- Skim **`CHANGELOG.md`** from **2.1.183** through newest and recent **`agents2/tasks/done/2026/10/`** CLOSED tasks
- Update **`ROADMAP.md`** Shipped (and In progress / Deferred only when evidence is clear): bump the "through ..." date; add short rows/bullets with doc links for at least:
  - Customer-facing counter display `/display/{table_token}` (#434) - `docs/0078`
  - Newsletter sending (Settings → Newsletter) (#435) - `docs/0079`
  - VeriFactu staff anulación UI + multi-rate IVA (#431) under Billing / fiscal - `docs/0018` / `docs/0065`
  - Optional one-liner for front Node **22.23.4** only if ROADMAP already mentions runtime prerequisites (otherwise leave to README)
- Align **`docs/0032-github-issues-roadmap.md`** only where a #52-#54 status contradicts shipped work (e.g. #54 post-visit email automation vs shipped newsletter MVP) - do not invent umbrella status
- Keep the weekly checklist; no bulk `docs/` rewrite; no product code
- Pass/fail: ROADMAP no longer claims shipped surface stops at 2026-09-14; `rg` hits newsletter / customer display / anulación themes; CHANGELOG/closed-task evidence only

## What changed

- **`ROADMAP.md` Shipped:** Intro through **2026-10-22**; evidence includes CHANGELOG **2.1.183-2.1.186** and `done/2026/10/`. New rows for customer-facing counter display (#434 / `docs/0078`) and newsletter (#435 / `docs/0079`). Billing / fiscal notes staff anulación UI + multi-rate IVA (#431).
- **`ROADMAP.md` In progress:** #54 notes newsletter MVP shipped vs trigger automation still open; VeriFactu live row notes anulación / multi-rate shipped.
- **`docs/0032`:** Marketing / special offers + #54 section acknowledge newsletter MVP (#435); trigger-based post-visit automation remains open. No Node runtime line (ROADMAP had none).
- Left alone: FEAT-388 / 438 / 439; no product code.

## Testing instructions

1. Confirm task is docs-only: `git diff --stat` shows only `ROADMAP.md`, `docs/0032-github-issues-roadmap.md`, and this task file (after rename to UNTESTED).
2. `rg -n '2026-09-14' ROADMAP.md` returns no hits in the Shipped intro (should say **2026-10-22**).
3. `rg -n 'newsletter|/display|customer-facing|anulación|0078|0079' ROADMAP.md docs/0032-github-issues-roadmap.md` hits all themes.
4. Spot-check CHANGELOG **2.1.183-2.1.186** and CLOSED-431 / 434 / 435 under `agents2/tasks/done/2026/10/` match the new roadmap wording (no invented features).
5. Confirm open FEAT-388 / 438 / 439 are **not** listed as shipped in ROADMAP.

## Test report

1. **Date/time (UTC):** 2026-11-10 12:43:07 start - 12:43:31 end. Log window N/A (docs-only; no app runtime verification).
2. **Environment:** branch `development` (synced via `./scripts/git-sync-development.sh`); compose `docker-compose.yml` + `docker-compose.dev.yml` up (containers healthy) but unused for this task; no `BASE_URL` browser run.
3. **What was tested:** Testing instructions 1-5 (docs-only scope, Shipped date, theme `rg`, CHANGELOG/CLOSED evidence alignment, open FEATs not marked shipped).
4. **Results:**
   - Criterion 1 docs-only: **PASS** - Implementing commit `9a9679f82` filtered to this task's deliverables touches only `ROADMAP.md`, `docs/0032-github-issues-roadmap.md`, and the task file (+63/-10). Parent commit also bundled unrelated marketing sites; those are outside this task's "What changed" and are not product-code changes claimed here. Working tree for this verification only renamed the task status prefix.
   - Criterion 2 Shipped date: **PASS** - `rg -n '2026-09-14' ROADMAP.md` empty; intro line 26 says through **2026-10-22** with CHANGELOG **2.1.183-2.1.186** and `done/2026/10/`.
   - Criterion 3 themes: **PASS** - Hits for newsletter, `/display`, customer-facing, anulación, `0078`, `0079` in `ROADMAP.md` and `docs/0032-github-issues-roadmap.md` (rows for #434/#435/#431 and #54 partial).
   - Criterion 4 evidence match: **PASS** - CHANGELOG 2.1.186 (#434 display, #435 newsletter), 2.1.185/184 (#431 anulación + multi-rate) match ROADMAP wording. CLOSED files present: `done/2026/10/14/CLOSED-431-*-verifactu-anulacion-ui-multi-rate-iva.md`, `done/2026/10/22/CLOSED-434-*-coffee-shop-client-facing-interface.md`, `done/2026/10/22/CLOSED-435-*-newsletter-sending.md`.
   - Criterion 5 open FEATs: **PASS** - `FEAT-388`, `FEAT-438`, `FEAT-439` still in `agents2/tasks/`; no #388/#438/#439 or those titles listed as shipped in `ROADMAP.md`.
5. **Overall:** **PASS**
6. **Product owner feedback:** ROADMAP now correctly frames Oct 2026 shipped surface through 2026-10-22 with the three user-facing slices contributors were missing. Docs stay aligned with CHANGELOG and closed tasks without inventing features or prematurely shipping open FEATs. Safe to close.
7. **URLs tested:** N/A - no browser
8. **Relevant log excerpts:** N/A - docs-only verification; no container errors required for pass/fail.
