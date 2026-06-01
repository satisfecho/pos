# Promote all changes to master

## GitHub Issues
- **Issue:** https://github.com/satisfecho/pos/issues/261
- **261**
- **Supersedes:** https://github.com/satisfecho/pos/issues/253 (closed 2026-05-31; release **2.1.0** shipped via **#256**)

## Problem / goal

Promote tested work from **`development`** to **`master`** and deploy to production (**amvara9** / **satisfecho.de**). The issue author requests merging all current **`development`** changes into **`master`** and confirming production deployment succeeded.

As of this task creation, **`origin/development`** is **`08333377`** and **`origin/master`** is **`8086caa0`** — **`development`** is **4 commits ahead**, including tenant custom subcategories (**#260**), product image upload UX/limit (**#259**), tenant purge transaction fix, and a marketing-site scan update.

Follow **`.cursor/rules/git-development-branch-workflow.mdc`**. This is an explicit production promotion request — **`development` → `master`** merge is allowed.

## Implementation (feature coder)

1. **Synced** `development` via **`./scripts/git-sync-development.sh`**.
2. **Commits promoted** (4 on `development` not on prior `master` tip `8086caa0`):
   - `5a5e60e4` — Fix tenant purge transaction commit (#259 area)
   - `6d7701a0` — 005 reviewer: bosskebabypizzeria scan update
   - `7da4f0b7` — Product image upload errors in UI; 5MB limit (#259)
   - `08333377` — Tenant custom subcategories persistence (#260)
3. **Changelog / version:** No additional bump at promotion time. **`[Unreleased]`** only documents internal agent-loop work. User-facing fixes are already under **`[2.1.3]`** and **`[2.1.4]`**; **`front/package.json`** is **`2.1.4`** on `development`.
4. **Promotion:** Merged **`origin/development` → `master`** (merge commit **`41bc798a`**) and pushed **`origin/master`**.
5. **Deploy:** Push triggered **Deploy to amvara9** run **`26769295375`** — **success** (~2m59s). URL: https://github.com/satisfecho/pos/actions/runs/26769295375
6. **Production smoke (coder):** `curl -sf https://www.satisfecho.de/api/health` → `{"status":"ok"}`; landing footer **2.1.4** + git hash **`41bc798a`** via `test:landing-version` (login step failed 401 without credentials — out of scope, same as #253).

## Current state (after implementation)

| Check | Value |
|-------|-------|
| **`origin/development`** | **`08333377`** (unchanged tip; merge was into `master`) |
| **`origin/master`** | **`41bc798a`** (merge of `8086caa0` + `08333377`) |
| Latest **Deploy to amvara9** on **`master`** | **`26769295375`** — **success** (push, 2026-06-01) |
| Live version | **2.1.4** / **`41bc798a`** |

## Testing instructions

1. **Git:** `git fetch origin && git rev-parse origin/master origin/development` — **`origin/master`** should be **`41bc798a`** (merge commit containing the four development commits above).
2. **GitHub Actions:** `gh run view 26769295375` — **Deploy to amvara9** **green** (marketing artifacts, SSH, build/restart, smoke test).
3. **Live:** `curl -sf https://www.satisfecho.de/api/health` returns OK.
4. **Optional:** `BASE_URL=https://www.satisfecho.de HEADLESS=1 npm run test:landing-version` from `front/` — footer shows **2.1.4** and hash **`41bc798a`** (login optional; 401 without `LOGIN_EMAIL`/`LOGIN_PASSWORD` is not a promotion failure).

**Pass criteria:** **`development`** promoted to **`master`** and **Deploy to amvara9** **green** for commit **`41bc798a`** (or documented manual parity). Closer may close **#261** after tester **PASS**.
