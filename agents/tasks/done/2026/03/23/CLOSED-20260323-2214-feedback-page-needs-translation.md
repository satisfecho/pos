---
## Closing summary (TOP)

- **What happened:** Task #67 (public feedback page i18n) was implemented and fully verified by the tester on the dev stack.
- **What was done:** Feedback route copy was aligned with app i18n; the tester confirmed form, thank-you, and invalid-tenant strings in Français, Català, 中文（简体）, and हिन्दी, plus `test:landing-version` and a clean front build log.
- **What was tested:** Per-task testing instructions §1–4 — overall **PASS** with evidence in the Test report below.
- **Why closed:** All acceptance criteria met; tester overall **PASS**.
- **Closed at (UTC):** 2026-03-23 22:24
- **GitHub:** Issue **#67** — `gh issue comment` / label / close **not applied** from this environment (token: `Resource not accessible by personal access token`); do manually: final comment, remove **`agent:testing`** / **`agent:wip`**, close if fully delivered (see **`docs/agent-loop.md`**).
---

# Feedback page needs translation

## GitHub
- **Issue:** https://github.com/satisfecho/pos/issues/67

## Problem / goal
The public feedback URL (e.g. `https://satisfecho.de/feedback/1?token=…`) shows UI that does not respect the user’s selected language: parts of the form remain untranslated. Every visible string on that flow should use the same i18n approach as the rest of the app so locale selection is consistent end-to-end.

## High-level instructions for coder
- Audit the feedback route/component(s) and templates for hard-coded or missing translation keys.
- Align with existing Angular i18n / translation patterns used elsewhere (e.g. book, public pages); add keys and catalog entries for all user-facing copy on the feedback form and related messages.
- Manually verify at least one non-default locale that the full page (labels, buttons, validation, errors) switches correctly when language changes.
- If docs mention public feedback URLs or i18n conventions, skim `docs/` and `README.md` for consistency.

## Testing instructions

1. With the stack up (e.g. HAProxy on `http://127.0.0.1:4202`), open `/feedback/1` (or a valid tenant id).
2. Use the header language picker and switch to **Français**, **Català**, **中文（简体）**, and **हिन्दी** in turn. Confirm the form title, intro, rating label, comment labels/placeholder, contact fieldset legend and hint, submit/sending button text, and thank-you page copy are in that language (not English).
3. Optional: invalid tenant (`/feedback/0`) and missing tenant — error lines should match the selected language (`FEEDBACK.INVALID_TENANT` / `FEEDBACK.TENANT_NOT_FOUND`).
4. **Automated:** `BASE_URL=http://127.0.0.1:4202 npm run test:landing-version --prefix front` (exit 0). **Front build:** `docker compose -f docker-compose.yml -f docker-compose.dev.yml logs --tail=80 front` — no Angular/TS errors after changes.

---

## Test report

1. **Date/time (UTC):** Started 2026-03-23 22:19:25 UTC; finished 2026-03-23 22:34 UTC (approx.). **Log window:** `docker compose … logs front` reviewed for the same session; landing test ended 22:20:13 UTC per script output.

2. **Environment:** `docker-compose.yml` + `docker-compose.dev.yml`; **BASE_URL** `http://127.0.0.1:4202`; branch **development** @ `6da89d8`. Puppeteer via **puppeteer-core** + host Chrome (`/Applications/Google Chrome.app/Contents/MacOS/Google Chrome`).

3. **What was tested:** Per **Testing instructions** §1–4: public `/feedback/1` with language picker; strings for fr / ca / zh-CN / hi; invalid tenant `/feedback/0` with language carried from prior `/feedback/1` session; thank-you state after real submit (5★) in each of the four locales; `npm run test:landing-version`; front container logs scanned for TS/NG build failures.

4. **Results:**
   - **§1 Stack + `/feedback/1` loads:** **PASS** — page reached, `.feedback-intro` present after tenant load.
   - **§2 Locales (picker):** **PASS** — For each locale, asserted non-English snippets for intro, rating label, contact fieldset/submit label, and (separate run) thank-you title/detail after successful submit; evidence: Puppeteer runs `PASS feedback form locale=*` and `PASS thank-you locale=*` for fr, ca, zh-CN, hi.
   - **§3 Optional invalid tenant:** **PASS** — After selecting each locale on `/feedback/1`, navigation to `/feedback/0` showed localized `FEEDBACK.INVALID_TENANT` text (fr/ca/zh-CN/hi); evidence: `PASS invalid tenant message locale=*`. **Note:** Error view has no language picker; language was carried from the prior page in the same tab session (acceptable UX verification path).
   - **§4 Automated landing + front build:** **PASS** — `test:landing-version` exit code 0 (elapsed ~42s). `docker compose … logs --tail=200 front` + grep: no `error TS`, `NG…`, or “bundle generation failed” lines; recent lines show “Application bundle generation complete”.

5. **Overall:** **PASS** (all criteria met).

6. **Product owner feedback:** The public feedback flow now follows the app language end-to-end: form copy, submit, thank-you, and the invalid-link error all appear in the selected locale for the four tested languages. No build regressions were observed on the dev stack.

7. **URLs tested:**
   1. `http://127.0.0.1:4202/feedback/1` (repeated for locale switches and submissions)
   2. `http://127.0.0.1:4202/feedback/0` (invalid tenant, after language set on `/feedback/1`)
   3. `http://127.0.0.1:4202/` (landing, via `test:landing-version`)

8. **Relevant log excerpts:**
   - Front (compose): `Application bundle generation complete. [0.010 seconds] - 2026-03-23T22:17:30.439Z` and similar — no error lines in tail.
   - `test:landing-version`: `>>> RESULT: Landing version OK; demo login (tenant=1) OK; sidebar nav OK.` / `exit_code: 0`

**GitHub:** `gh issue comment 67` / label edit failed: `Resource not accessible by personal access token (addComment)` — **agent:testing** / comment on #67 not applied from this environment.
