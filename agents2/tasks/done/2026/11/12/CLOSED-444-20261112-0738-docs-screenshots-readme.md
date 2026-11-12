---
## Closing summary (TOP)

- **What happened:** Screenshot capture how-to was mixed into the inventory README and needed a dedicated doc.
- **What was done:** Moved automatic and manual capture instructions into `docs/screenshots/how-to-capture-screenshots-automatically.md`; kept inventory in `docs/screenshots/README.md` with a bottom link; updated `docs/README.md` and `docs/0075-promo-videos.md` cross-links.
- **What was tested:** How-to sections, inventory embeds (11/11 PNGs), README/how-to links, and docs index / promo-videos links - overall PASS (docs-only checks).
- **Why closed:** All criteria passed.
- **Closed at (UTC):** 2026-11-12 07:47
---

# Split screenshot capture docs from README (#444)

## GitHub Issues
- **Issue:** https://github.com/satisfecho/pos/issues/444
- **444**

## Status
- **Implemented:** 2026-11-12T07:41:13Z (UTC) - capture how-to moved; inventory README kept; index links updated.

## Problem / goal
`docs/screenshots/README.md` mixes how-to capture guidance with the screenshot inventory. Move the automatic and manual capture instructions into a dedicated doc (`docs/screenshots/how-to-capture-screenshots-automatically.md` or equivalent) and link that new document from the bottom of the existing README so the README stays focused on listing screenshots.

## High-level instructions for coder
- Create `docs/screenshots/how-to-capture-screenshots-automatically.md` with the capture how-to currently in `docs/screenshots/README.md` (automatic Puppeteer/`capture-screenshots.mjs` flow plus optional provider/courier/platform env vars, and the short manual capture steps).
- Remove those how-to sections from `docs/screenshots/README.md`; keep the screenshot inventory and image references intact.
- At the bottom of `docs/screenshots/README.md`, add a clear link to the new how-to document.
- Do not change capture script behavior unless the README move requires a path/doc reference update; do not commit secrets or real passwords (use env-var names only in docs).
- Smoke: open both markdown files; confirm README still lists existing screenshots without broken relative links; how-to doc is reachable from the README link.

## What was done
- Added `docs/screenshots/how-to-capture-screenshots-automatically.md` with automatic + manual capture steps (env-var placeholders only).
- Trimmed how-to sections from `docs/screenshots/README.md`; kept inventory, image embeds, and file-reference table; linked the how-to at the bottom.
- Pointed `docs/README.md` “Capture screenshots” / Screenshots index at the new how-to; inventory stays on `screenshots/README.md`.
- Linked the how-to from `docs/0075-promo-videos.md` Related section.
- No changes to `front/scripts/capture-screenshots.mjs`.

## Testing instructions
1. Confirm `docs/screenshots/how-to-capture-screenshots-automatically.md` exists and contains sections **Capturing screenshots automatically** and **Adding screenshots manually**, plus optional env vars (`PROVIDER_TEST_*`, `COURIER_*`, `PLATFORM_OPERATOR_*`).
2. Confirm `docs/screenshots/README.md` has **no** those how-to sections, still lists Orders through Platform operator with image embeds, and ends with a link to `how-to-capture-screenshots-automatically.md`.
3. Confirm every `![...](*.png)` target in `docs/screenshots/README.md` resolves to an existing file under `docs/screenshots/`.
4. Confirm `docs/README.md` “Capture screenshots” points at the how-to doc and the Screenshots table lists both inventory README and how-to.
5. Confirm `docs/0075-promo-videos.md` Related links the how-to.
6. Optional: `test -f docs/screenshots/how-to-capture-screenshots-automatically.md` and open both markdown files in the editor.

## Test report

- **Date/time (UTC):** 2026-11-12T07:45:57Z start; 2026-11-12T07:46:30Z end. Log window: N/A for docs (stack healthy; front/back 200s observed 07:45-07:46Z).
- **Environment:** branch `development` @ `e6325ecff`; compose `docker-compose.yml` + `docker-compose.dev.yml` (docs-only verification; no BASE_URL browser flow).
- **What was tested:** Docs split for #444 - how-to capture doc vs screenshots inventory README, PNG embeds, cross-links from `docs/README.md` and `docs/0075-promo-videos.md`.

### Results

1. How-to file exists with **Capturing screenshots automatically**, **Adding screenshots manually**, and optional `PROVIDER_TEST_*` / `COURIER_*` / `PLATFORM_OPERATOR_*` env-var names - **PASS** (`docs/screenshots/how-to-capture-screenshots-automatically.md`; no password literals).
2. Inventory README has no automatic/manual how-to sections; lists Orders through Platform operator with embeds; ends with link to how-to - **PASS** (`## Capturing screenshots` is link-only to `how-to-capture-screenshots-automatically.md`).
3. All `![...](*.png)` targets resolve under `docs/screenshots/` - **PASS** (orders, kitchen, reports, reservations, tables, menu, provider, delivery, waitlist, courier, platform - 11/11 OK).
4. `docs/README.md` “Capture screenshots” + Screenshots table list inventory and how-to - **PASS** (lines 27-28 and 157-158).
5. `docs/0075-promo-videos.md` Related links how-to - **PASS** (line 242).
6. Optional `test -f` how-to - **PASS**.

- **Overall:** **PASS**
- **Product owner feedback:** Capture how-to is cleanly separated from the inventory; README stays a visual index with working image links, and the docs index plus promo-videos doc both point at the new guide. No secrets in the how-to; env-var placeholders only.
- **URLs tested:** N/A - no browser (markdown/file checks only).

### Relevant log excerpts

Docs-only task; no product code change. Stack sample during window (not required for pass criteria):

```
pos-front: GET / HTTP/1.0 200 (07:45:57Z .. 07:46:09Z)
pos-back: GET /health HTTP/1.0 200 OK
```
