---
## Closing summary (TOP)

- **What happened:** UI locales drifted from `en.json` with no automated check, so 008 kept rediscovering the same leaf-key gaps (no GitHub issue).
- **What was done:** Added `scripts/check-i18n-locale-parity.py` (stdlib; strict fail + `--warn-only` / env soft mode), documented it in `docs/testing.md` and the ngx-translate cursor rule, and optionally wired warn-only into `go-ahead-loop.sh` via `I18N_PARITY_CHECK=1`.
- **What was tested:** Tester verified strict exit 1 with known lagging locales (`ur` OK), soft modes exit 0, docs command present, and loop warn-only wiring — overall **PASS**.
- **Why closed:** All test criteria passed.
- **Closed at (UTC):** 2026-07-23 18:48
---

# Add i18n leaf-parity check (locales vs en.json)

## GitHub Issues
- **Issue:** (none — enhancement reviewer)
- **0**

## Problem / goal

Seven of nine UI locales lag **`en.json`** by tens to ~189 missing leaf keys (`fr`/`ca`/`zh-CN`/`hi`/`de`/`bg`/`es`). Separate backfill NEWs already cover the gaps, but nothing fails CI or a local check when new English keys ship without siblings — so 008 keeps rediscovering the same class of drift. A small parity checker stops the recurrence.

## Evidence (008 preflight / review)

- Weekly sweep 2026-07-23T18:42Z: `SIGNAL docs_stale×14` + `changelog_sparse` already owned; `demo_tables_check=ok`; NEW≈94 — prefer a **tooling** FEAT over more doc-index spam
- Leaf-missing counts vs `en.json` (flatten): `zh-CN`/`hi`≈189, `fr`≈149, `ca`≈132, `de`≈91, `bg`≈25, `es`≈15, `ur`=0
- Open backfills (do **not** merge or re-queue): `NEW-0-20260723-1638-*`, `1648-*`, `1659-*`
- `.cursor/rules/angular-ngx-translate.mdc` already requires all locale files; no automated enforcer exists under `scripts/` / `front/scripts/`

## High-level instructions for coder

- Add a small checker (prefer Python stdlib or shell + existing Node in-repo — **no** new npm packages) that flattens `front/public/i18n/*.json` and exits non-zero when any locale misses keys present in `en.json` (report counts + a short sample of missing paths)
- Document how to run it in **`docs/testing.md`** (one short subsection or table row); optional: mention in the ngx-translate cursor rule as the verify step
- Optional wire-up: call from an existing smoke/loop helper (`scripts/go-ahead-loop.sh` or similar) only if that is a one-liner and does not block deploys when intentionally partial — default should be usable standalone first
- Do **not** translate/backfill keys in this task (owned by sibling NEWs); do not change Angular product code
- Pass/fail: running the checker against current tree fails (or warns) with known lagging locales; after a locale is filled, that locale passes; `docs/testing.md` has a copy-pasteable command

## Implementation notes (feature coder)

- Added **`scripts/check-i18n-locale-parity.py`** (stdlib only): flattens leaf keys under `front/public/i18n/`, compares each locale to `en.json`, prints counts + sample missing paths, exit **1** on drift.
- Soft mode: `--warn-only` or `I18N_PARITY_WARN_ONLY=1` (exit 0).
- Documented in **`docs/testing.md`** (Backend / data checks → i18n subsection).
- Cursor rule **`.cursor/rules/angular-ngx-translate.mdc`**: verify step points at the script.
- Optional loop: **`scripts/go-ahead-loop.sh`** runs the checker in warn-only when `I18N_PARITY_CHECK=1` (does not fail the loop / deploys).
- No locale backfills; no Angular product code changes.
- No GitHub issue (`0`) — skipped issue label/comment.

## Testing instructions

1. From repo root, run the strict check (expect **exit 1** while sibling backfills are open):

   ```bash
   python3 scripts/check-i18n-locale-parity.py
   ```

   Confirm output lists lagging locales with non-zero `missing=` (e.g. `zh-CN`/`hi`/`fr`/`ca`/`de`/`bg`/`es`) and `ur` as `OK` / `missing=0`.

2. Soft mode must exit **0** even with drift:

   ```bash
   python3 scripts/check-i18n-locale-parity.py --warn-only
   # or: I18N_PARITY_WARN_ONLY=1 python3 scripts/check-i18n-locale-parity.py
   ```

3. Confirm **`docs/testing.md`** documents the copy-pasteable `python3 scripts/check-i18n-locale-parity.py` command under the i18n leaf-parity subsection.

4. Optional: `I18N_PARITY_CHECK=1` on go-ahead-loop is warn-only and must not treat known drift as a hard loop failure.

## Test report

1. **Date/time (UTC):** 2026-07-23 18:46:58Z start → 18:47:06Z end. Log window N/A (stdlib script + docs; no app containers exercised for this check).
2. **Environment:** branch `development` (synced via `./scripts/git-sync-development.sh`); host `python3`; repo root `/Users/raro42/projects/pos2`. Compose stack was up (`pos-front`/`pos-back`/`pos-haproxy` on `4202`) but unused for this task. `BASE_URL` N/A.
3. **What was tested:** Strict leaf-parity exit/status for lagging locales vs `ur`; soft modes (`--warn-only` and `I18N_PARITY_WARN_ONLY=1`); `docs/testing.md` i18n subsection command; optional `go-ahead-loop.sh` warn-only wiring.
4. **Results:**
   - Strict `python3 scripts/check-i18n-locale-parity.py` exits **1** with lagging locales listed — **PASS** (evidence: `bg missing=25`, `ca=132`, `de=91`, `es=15`, `fr=149`, `hi=189`, `zh-CN=189`; `ur OK missing=0`; footer `FAIL: one or more locales miss keys…`; shell `STRICT_EXIT=1`).
   - Soft `--warn-only` exits **0** with same drift — **PASS** (`WARN: FAIL: … (warn-only; exit 0)`; `WARN_ONLY_EXIT=0`).
   - Soft `I18N_PARITY_WARN_ONLY=1` exits **0** — **PASS** (`ENV_WARN_EXIT=0`).
   - `docs/testing.md` documents copy-pasteable command under “i18n locale leaf parity” — **PASS** (lines ~442–454 include `python3 scripts/check-i18n-locale-parity.py` plus warn-only variants).
   - Optional: `I18N_PARITY_CHECK=1` in `scripts/go-ahead-loop.sh` runs warn-only and does not fail the loop on drift — **PASS** (script uses `I18N_PARITY_WARN_ONLY=1` and only logs `WARN` if the checker process itself errors).
5. **Overall:** **PASS**
6. **Product owner feedback:** The checker correctly fails on known locale lag and softens cleanly for loops/CI soft runs. Docs and the ngx-translate verify hint are discoverable. Sibling backfills remain the right place to clear the missing-key debt; this task only added the enforcer.
7. **URLs tested:** N/A — no browser
8. **Relevant log excerpts (last section):**
   ```
   i18n leaf-parity vs en.json (2404 leaves) in …/front/public/i18n
   ur       OK      missing=   0  extra=   0
   zh-CN    MISSING missing= 189  …
   FAIL: one or more locales miss keys present in en.json
   STRICT_EXIT=1
   WARN: FAIL: one or more locales miss keys present in en.json (warn-only; exit 0)
   WARN_ONLY_EXIT=0
   ENV_WARN_EXIT=0
   ```
