# Expand AGENTS.md Key URLs with Jul guest / ops routes

## GitHub Issues
- **Issue:** (none — enhancement reviewer)
- **0**

## Problem / goal

**`AGENTS.md` § Key URLs** only lists frontend HAProxy, `/docs`, and `/health`. Agents verifying Jul surfaces keep rediscovering public **`/book`**, **`/waitlist`**, **`/delivery`**, **`/features`**, plus **`/courier`** and **`/platform`**, via scattered feature docs. A short Key URLs list would cut that friction without rewriting product guides.

## Evidence (008 preflight / review)

- Weekly sweep 2026-07-23T19:33Z: SIGNAL `docs_stale×14` basenames already owned; not a bulk `docs/*.md` rewrite
- `AGENTS.md` Key URLs (~L206–210): three bullets only — no guest/ops routes
- Sibling README Access Points / features index tasks own **`README.md`** / **`docs/README.md`** only:
  - **`NEW-0-20260722-1159-readme-delivery-courier-saas-features`**
  - **`NEW-0-20260723-1744-readme-restaurant-groups-and-waitlist`**
  - **`NEW-0-20260723-1903-document-public-features-page`**
- Path-align task **`NEW-0-20260723-1138-align-agents-md-task-paths-to-agents2`** is `agents` → `agents2` wording only — do **not** merge

## High-level instructions for coder

- Add a few bullets under **`AGENTS.md` Key URLs** (localhost:4202 examples) for at least: `/book/{tenantId}`, `/waitlist/{tenantId}`, `/delivery/{tenantId}`, `/features`, and optionally `/courier` + `/platform` (note login/seed env where the file already does for other flows)
- Keep the section short; one line each; no new long runbooks
- Do not edit root README Access Points here (siblings own those)
- Pass/fail: `rg '/delivery|/waitlist|/features' AGENTS.md` hits under Key URLs; no product code
