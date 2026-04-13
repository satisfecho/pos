# Remove "For restaurant staff" section (landing)

## GitHub Issues

- **Issue:** https://github.com/satisfecho/pos/issues/183
- **183**

## Problem / goal

The public landing page still shows a **For restaurant staff** panel (right of the guest login area) with **Create staff account**. Product wants that entire block removed. After removal, the **For guests** card should remain visually balanced (re-center or adjust grid as needed). Remove unused styles or template wiring tied only to that staff-registration block in this view.

## High-level instructions for coder

- Locate the landing / login layout component(s) that render the two-column (guest vs staff) area and remove the staff panel container and its CTA.
- Adjust layout so the guest section is centered or the grid reads well with a single primary card (no empty column).
- Remove dead CSS or component-only logic for the removed staff block; keep i18n keys only if still used elsewhere—otherwise clean up per project conventions.
- Smoke-check the landing route (and any Puppeteer landing test if present) after the change.

## Testing instructions

1. **Stack:** App reachable on HAProxy dev port (e.g. `http://127.0.0.1:4202/`).
2. **Manual:** Open `/` logged out — confirm **no** “For restaurant staff” column, **no** primary “Create staff account” button in the main panels; **For guests** card is centered and not squeezed to one side.
3. **Footer:** Staff can still use **Create account** / provider links in the footer as before.
4. **Puppeteer:** From repo root: `BASE_URL=http://127.0.0.1:4202 npm run test:landing-version --prefix front` (or the port your compose exposes).
5. **Front build:** `docker logs --since 10m pos-front` shows no Angular compile errors after the change.

---

## Test report

1. **Date/time (UTC) and log window:** Started ~2026-04-13T15:20Z; verification completed ~2026-04-13T15:21Z. Docker log review: `pos-front` since 15m window around build at 15:17:53Z.

2. **Environment:** `docker-compose.yml` + `docker-compose.dev.yml`; **`BASE_URL`** `http://127.0.0.1:4202`; branch **`development`** (synced via `./scripts/git-sync-development.sh` before edits).

3. **What was tested:** Per **Testing instructions** — landing logged out, footer links, Puppeteer `test:landing-version`, front container logs for compile errors.

4. **Results:**
   - Stack reachable on HAProxy port **PASS** — `curl` to `/` returned 200; browser load OK.
   - No “For restaurant staff” column / no primary “Create staff account” in main panels **PASS** — `curl` first 80k bytes had no matches for those English strings; DevTools `document.body.innerText` had no `For restaurant staff`, `Create staff account`, `Für Restaurantpersonal`, or `Personal-Konto`; a11y snapshot shows regions “Für Gäste” and “Restaurant wählen” only (no staff registration panel).
   - **For guests** layout **PASS** — guest region present and readable; layout shows single-column-style guest block with restaurant picker below (not squeezed into a narrow side column next to a removed staff panel).
   - Footer **Create account** / provider links **PASS** — snapshot: “Konto erstellen” → `/register`, “Anbieter-Login” → `/provider/login`, “Als Anbieter registrieren” → `/provider/register`.
   - Puppeteer **`npm run test:landing-version`** (from `front/`, `BASE_URL=http://127.0.0.1:4202`) **PASS** — exit code 0; output ends with `>>> RESULT: Landing version OK; demo login (tenant=1) OK; sidebar nav OK.` (elapsed ~44.6s).
   - Front build / logs **PASS** — `docker logs --since 15m pos-front` shows `Application bundle generation complete.` with no `error TS` / `NG` / “Application bundle generation failed” in sampled output.

5. **Overall:** **PASS** (all criteria above).

6. **Product owner feedback:** The public landing no longer exposes a dedicated staff-registration column next to guests; the guest flow and restaurant selection remain clear. Footer paths for account creation and provider access are unchanged, so staff and partners can still onboard from the page footer.

7. **URLs tested:**
   1. `http://127.0.0.1:4202/`
   2. (Puppeteer navigated `/` then post-login routes per script — landing step confirmed version footer text.)

8. **Relevant log excerpts (last section)**

```
pos-front (docker logs --since 15m pos-front, tail):
Application bundle generation complete. [7.658 seconds] - 2026-04-13T15:17:53.675Z
Watch mode enabled. Watching for file changes...
```

Puppeteer (exit 0):
```
>>> RESULT: Landing version OK; demo login (tenant=1) OK; sidebar nav OK.
```
