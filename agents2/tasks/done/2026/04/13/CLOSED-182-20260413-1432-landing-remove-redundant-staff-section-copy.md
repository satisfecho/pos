---
## Closing summary (TOP)

- **What happened:** The landing staff panel repeated messaging between the section heading and a secondary hint line.
- **What was done:** The redundant hint paragraph and `.landing-panel__hint` styling were removed; register/login guidance was consolidated into a single `LANDING.SECTION_TEAM_LEDE` string across shipped locales, with unused `SECTION_TEAM_HINT` keys removed.
- **What was tested:** Headless checks on `/` (hint count 0, lede present, CTA), `aria-labelledby` on the team section, EN copy for new and returning staff, `npm run test:landing-version`, and `pos-front` logs — all **PASS**.
- **Why closed:** Tester **Test report** overall **PASS**; acceptance criteria satisfied.
- **Closed at (UTC):** 2026-04-13 14:41
---

# Landing: remove redundant staff section copy

## GitHub Issues
- **Issue:** https://github.com/satisfecho/pos/issues/182
- **182**

## Problem / goal
The restaurant staff panel on the landing page repeats messaging (heading vs hint). Reduce redundancy so the section stays clear without duplicate or near-duplicate copy.

## High-level instructions for coder
- Open the landing component template for the team/staff panel and identify redundant elements (e.g. section heading vs hint paragraph).
- Remove or consolidate the redundant piece per the issue intent (drop duplicate heading, or drop the hint, or both if still redundant)—keep one clear label for the section.
- Adjust `front/public/i18n/*.json` only if keys become unused: remove obsolete `LANDING.*` strings or keep keys per project i18n convention if they may be reused.
- Confirm layout and accessibility: if a visible heading is removed, ensure the section still has an appropriate accessible name (e.g. `aria-label` on the section or a single remaining heading).
- Run the usual frontend build check (container logs) after the change.

## Implementation summary
- Removed the secondary hint paragraph (`landing-panel__hint` / `LANDING.SECTION_TEAM_HINT`) from the staff panel; kept `h2` + `aria-labelledby` unchanged.
- Merged “new account” and “returning staff” guidance into a single `LANDING.SECTION_TEAM_LEDE` string in all shipped locales (`en`, `de`, `es`, `fr`, `ca`, `bg`, `hi`, `zh-CN`).
- Removed unused `SECTION_TEAM_HINT` keys and the `.landing-panel__hint` block from `landing.component.ts`.

## Testing instructions
1. With the stack up (e.g. HAProxy on `http://127.0.0.1:4202`), open `/` logged out.
2. In the **For restaurant staff** (or translated) panel: confirm one intro paragraph under the heading, then the **Create staff account** CTA; no second muted hint line below the button.
3. Confirm copy still covers both new registration and returning login (pick restaurant, then Login).
4. Optional: `docker logs --since 5m pos-front | grep -iE error` — no Angular build errors.
5. Smoke: `cd front && BASE_URL=http://127.0.0.1:4202 npm run test:landing-version` (exit 0).

---

## Test report

1. **Date/time (UTC)** and log window  
   - **2026-04-13T14:40Z–14:42Z** (verification).  
   - Logs: `docker logs --since 5m pos-front` + grep for errors.

2. **Environment**  
   - **Compose:** `docker-compose.yml` + `docker-compose.dev.yml` (HAProxy **4202**).  
   - **`BASE_URL`:** `http://127.0.0.1:4202`  
   - **Branch:** `development` @ **745dffd** (short).

3. **What was tested**  
   - Staff panel structure (single lede, no secondary hint, CTA); EN copy covers register + login; smoke test; `pos-front` errors.

4. **Results**  
   - **One intro + CTA, no second hint:** **PASS** — Headless Chrome on `/`: `.landing-panel--team` has **`hintCount: 0`**, **`ledeCount: 1`**, **`hasRegisterCta: true`** (`data-testid="landing-staff-register"`).  
   - **a11y:** **PASS** — `h2#landing-team-heading`; section **`aria-labelledby="landing-team-heading"`**.  
   - **Copy (new + returning):** **PASS** — EN lede: *"Need an account for your venue? Register with the button below. Already have access? Pick your restaurant in the list, then use Login."*  
   - **`LANDING_VERSION_ONLY=1` `test:landing-version`:** **PASS** — exit **0** (`RESULT: Landing page shows version.`).  
   - **`docker logs` / grep errors:** **PASS** — no matching error lines in reviewed window.

5. **Overall:** **PASS**

6. **Product owner feedback**  
   The staff panel now presents a single clear paragraph and the register button, without a redundant muted line. Messaging still directs both new registrations and returning staff to the list + Login path.

7. **URLs tested**  
   1. `http://127.0.0.1:4202/` — landing, staff panel DOM and EN strings (headless).

8. **Relevant log excerpts**  
   - No `error` / bundle failure lines from `docker logs --since 5m pos-front | grep -iE 'error|Application bundle generation failed'` in this run.
