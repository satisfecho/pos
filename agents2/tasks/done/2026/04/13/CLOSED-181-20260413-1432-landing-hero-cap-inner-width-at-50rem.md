---
## Closing summary (TOP)

- **What happened:** The marketing landing hero inner content could stretch too wide on large viewports.
- **What was done:** `.landing-hero__inner` **max-width** was raised from **42rem** to **50rem** in `landing.component.ts`, preserving existing centering and padding.
- **What was tested:** Wide viewport (1600×900) computed **max-width** / centering, `npm run test:landing-version`, and `pos-front` build logs — all **PASS**.
- **Why closed:** Tester **Test report** overall **PASS**; layout matches the **50rem** readability goal.
- **Closed at (UTC):** 2026-04-13 14:41
---

# Landing hero: cap inner width at 50rem

## GitHub Issues
- **Issue:** https://github.com/satisfecho/pos/issues/181
- **181**

## Problem / goal
On the marketing landing page, the hero content should not stretch excessively wide on large viewports. Constrain the inner hero wrapper to a readable max width (50rem) while keeping current centering and padding behavior.

## High-level instructions for coder
- Locate the landing hero styles (component SCSS/CSS module or global landing styles).
- Add `max-width: 50rem` to the inner hero selector (e.g. `.landing-hero__inner` or equivalent in the current codebase).
- Preserve layout: centering and spacing; if the inner is block-level, use `margin-inline: auto` (or existing flex/grid patterns) so the block stays centered when width is capped.
- Verify at wide breakpoints that text does not span the full viewport width.
- Run the usual frontend build check (container logs) after the change.

## Implementation summary
- **`front/src/app/landing/landing.component.ts`:** `.landing-hero__inner` **`max-width`** set from **42rem** to **50rem**; existing **`margin: 0 auto`** and padding unchanged.

## Testing instructions
1. With the stack up (`docker compose` dev overlay), open **`http://127.0.0.1:4202/`** (or your HAProxy port).
2. Widen the browser past ~900px; confirm hero title/subtitle block stays centered and does not span the full width (inner column caps at **50rem**).
3. **`BASE_URL=http://127.0.0.1:4202 npm run test:landing-version --prefix front`** — expect exit **0** (smoke: landing loads, optional login/nav).
4. **`docker logs --since 5m pos-front`** — no Angular build errors after the change.

---

## Test report

1. **Date/time (UTC)** and log window  
   - **2026-04-13T14:36Z–14:39Z** (verification run).  
   - Logs reviewed: `docker logs --since 10m pos-front` (build window through smoke test).

2. **Environment**  
   - **Compose:** `docker-compose.yml` + `docker-compose.dev.yml` (HAProxy **4202**).  
   - **`BASE_URL`:** `http://127.0.0.1:4202`  
   - **Branch:** `development` @ **745dffd** (short).

3. **What was tested** (from “What to verify”)  
   - Wide-viewport hero inner width/centering; `test:landing-version`; `pos-front` logs for build errors.

4. **Results**  
   - **Wide viewport / 50rem cap:** **PASS** — Puppeteer at viewport **1600×900**: `.landing-hero__inner` computed **`max-width: 800px`** (50rem at 16px root), **`boundingWidth: 800`**, horizontal centering via **`marginLeft: 368px`** (remaining space split; block does not span full width).  
   - **`npm run test:landing-version`:** **PASS** — exit **0** (`RESULT: Landing version OK; demo login (tenant=1) OK; sidebar nav OK`, elapsed ~44s).  
   - **`pos-front` logs:** **PASS** — recent output shows `Application bundle generation complete` for `landing-component`; **`grep -iE 'error|TS[0-9]|NG[0-9]|failed'`** on last 10m: **no matches**.

5. **Overall:** **PASS**

6. **Product owner feedback**  
   The marketing hero read width is capped at **50rem** on large screens with the inner block centered; automated landing smoke and container build logs show no regressions. Safe to ship from a testing perspective.

7. **URLs tested**  
   1. `http://127.0.0.1:4202/` — landing (hero layout / computed styles via headless Chrome).

8. **Relevant log excerpts**  
   - `pos-front`: `Application bundle generation complete. [0.491 seconds] - 2026-04-13T14:36:00.485Z` … `landing-component` … `Component update sent to client(s).`  
   - No error/TS/NG lines in the reviewed window.
