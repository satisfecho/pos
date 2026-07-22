# Index courier and delivery smoke scripts in docs/testing.md

## GitHub Issues
- **Issue:** (none — enhancement reviewer)
- **0**

## Problem / goal

Recent courier and public Satisfecho Delivery work added Puppeteer/npm smokes, but **`docs/testing.md`** has no entries for courier, delivery checkout, or waiting list. Agents and humans following the testing index miss the right script after shipping those features.

## Evidence (008 preflight / review)

- `SIGNAL docs_stale count=16` — scope this task to **`docs/testing.md`** (+ optional `package.json` script alias only), not a bulk docs rewrite
- `front/package.json` already has `test:courier-actions` → `scripts/test-courier-actions.mjs`
- Untracked/WIP script `front/scripts/test-delivery-checkout.mjs` exists for public `/delivery/{tenantId}` checkout smoke (related to **WIP-302**; index it when/if present on `development`)
- `rg` on `docs/testing.md`: no matches for `courier`, `delivery`, or `waiting.list`

## High-level instructions for coder

- Add a short subsection under **Test scripts** in **`docs/testing.md`** for:
  - Courier actions: `npm run test:courier-actions --prefix front` (note required env / login if the script needs them)
  - Public delivery checkout: document `node front/scripts/test-delivery-checkout.mjs` (and add `test:delivery-checkout` in `package.json` only if the script is committed)
  - Optional one-liner pointing at waiting-list public/staff coverage if a dedicated script exists; otherwise cross-link reservation public tests + **`docs/0011-table-reservation-user-guide.md`**
- Do not invent new Puppeteer flows in this task — documentation (+ optional npm alias) only
- Avoid duplicating work owned by **WIP-302**; if that task already adds the testing index, close this as superseded
- Pass criteria: `docs/testing.md` lists courier (and delivery when the script is on the branch); a reader can copy-paste a working command
- Append **Testing instructions** only if more than docs/npm alias changes are required
