# Order header actions: stable alignment in badge (Orders)

## GitHub
- **Issue:** https://github.com/satisfecho/pos/issues/59

## Problem / goal
On **Orders**, header action buttons inside the badge jump between `flex-start`, centered, and other positions (layout inconsistency). Actions should have a single, predictable alignment regardless of badge content length or viewport. See issue screenshot.

## High-level instructions for coder
- Inspect orders list/detail header template and styles (badge container, flex/grid, wrapping).
- Remove sources of non-deterministic alignment (e.g. mixed `justify-content`, conditional classes, min-height gaps); prefer one layout rule that holds across typical order states.
- Verify in browser at a few order states and widths; run relevant Puppeteer test if present (`docs/testing.md`).

## Implementation
- **`front/src/app/orders/orders.component.ts` (styles):** `.order-header` no longer uses `align-items: center` (that vertically centered the action row against a variable-height left column, so alignment looked different per card). It now uses `align-items: flex-start` plus `gap` so actions stay top-aligned with the first line of meta. `.order-header-actions` uses `flex-wrap: wrap` and `justify-content: flex-end` so wrapped controls stay consistently right-aligned in the card.

## Testing instructions
1. Stack up (e.g. Docker dev on HAProxy port **4202**): ensure front build is green (`docker compose -f docker-compose.yml -f docker-compose.dev.yml logs --tail=40 front`).
2. Manual: log in as staff with Orders access, open **`/staff/orders`**. On **Active orders** and **Not paid yet**, compare cards with short vs long header text (customer name, urgent badge, many action buttons). Header actions should stay **top-aligned** with the header block and **right-aligned** when they wrap; no vertical “floating” in the middle of tall headers.
3. Automated (optional): from repo root with app up, `BASE_URL=http://127.0.0.1:4202` (or your port) and credentials in env, run `node front/scripts/review-order-edit-puppeteer.mjs` per `docs/testing.md` §7b; or `BASE_URL=… npm run test:landing-version --prefix front` as a quick smoke.

---

## Test report

1. **Date/time (UTC):** 2026-03-23T14:25:04Z — **log window:** ~14:12Z–14:25Z (front container rebuild/complete lines; full session through Puppeteer).

2. **Environment:** `docker-compose.yml` + `docker-compose.dev.yml`; **`BASE_URL`** `http://127.0.0.1:4202` (HAProxy); branch **`development`**, commit **`2efce91`**.

3. **What was tested:** Per **Testing instructions** and **What to verify** (stable header/action alignment on Orders cards; optional Puppeteer).

4. **Results:**
   - **Front build green (no TS/NG errors in recent logs):** **PASS** — `docker compose … logs --tail=80 front` shows repeated `Application bundle generation complete` with no error lines in the sampled window.
   - **Orders page loads; staff login works:** **PASS** — Puppeteer `review-order-edit-puppeteer.mjs` completed login and navigation.
   - **Header actions top-aligned with meta, right-aligned when wrapping (implementation / computed styles):** **PASS** — On five `.order-card .order-header` samples, `getComputedStyle`: `.order-header` `align-items: flex-start`; `.order-header-actions` `justify-content: flex-end`, `flex-wrap: wrap` (matches source in `orders.component.ts` inline styles).
   - **Optional automated review (Edit modal, status popover):** **PASS** — `node front/scripts/review-order-edit-puppeteer.mjs` exited 0 (“Review OK”).

5. **Overall:** **PASS**

6. **Product owner feedback:** Order cards now use a single, predictable flex rule: actions align to the top of the header row and stay right-justified with wrap, which should remove the previous “floating” middle alignment on tall headers. No regressions were seen in the standard orders edit/status flows used in smoke testing.

7. **URLs tested:**
   1. `http://127.0.0.1:4202/login?tenant=1`
   2. `http://127.0.0.1:4202/staff/orders`

8. **Relevant log excerpts:**
   - `pos-front`: `Application bundle generation complete. [0.015 seconds] - 2026-03-23T14:13:07.601Z` / `Page reload sent to client(s).`
   - Puppeteer (stdout): `Review OK: Edit buttons present, order edit modal opens (from History), status popover visible.`

**GitHub (#59):** `gh issue comment` returned “Resource not accessible by personal access token”; `gh issue edit` could not add label `agent:testing` (label not found / permissions). Human should apply labels/comments if required by process.
