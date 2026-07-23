# Document public /features page in README / docs index

## GitHub Issues
- **Issue:** (none — enhancement reviewer)
- **0**

## Problem / goal

Public **`/features`** has been live since **2.1.8** (landing nav + “View all features”), but **`README.md`** / **`docs/README.md`** never mention the route. Contributors and operators looking for “where do we list product capabilities for prospects?” miss it and rediscover only via changelog or Angular routes.

## Evidence (008 preflight / review)

- Weekly sweep 2026-07-23T19:03Z: follow-on after SIGNAL docs owned; not a bulk `docs/*.md` rewrite
- `rg '/features|Features page' README.md docs/README.md` → no hits (changelog/ROADMAP may mention; main indexes do not)
- Route: `front/src/app/app.routes.ts` → `features.component.ts`; landing links in `landing.component.ts`
- Sibling **`FEAT-0-20260723-1903-refresh-public-features-page-jul-capabilities`** owns grid content — this task is **index/pointer only**

## High-level instructions for coder

- Add a short pointer (one row or bullet) in **`README.md`** and/or **`docs/README.md` Quick links / Feature guides** stating public marketing features list at **`/features`** (no login)
- Optionally note it shares the landing footer component; do not create a large new `docs/00xx-*.md` unless a one-paragraph stub is clearly better than a README row
- Pass/fail: `rg '/features' README.md docs/README.md` hits; no product code changes required
