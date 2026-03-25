---
## Closing summary (TOP)

- **What happened:** GitHub [#67](https://github.com/satisfecho/pos/issues/67) — public `/feedback/{tenant}` (with optional token) needed full translation coverage and correct document titles after locale/translation load.
- **What was done:** Coder merged `TranslateService.onLangChange` with `onTranslationChange` in `FeedbackPublicComponent` so the browser tab title tracks the active locale when translations arrive after first paint; confirmed `FEEDBACK` / related `BOOK` keys across all seven locale files; automated smoke via `front/scripts/test-feedback-public-i18n.mjs` per task notes.
- **What was tested:** On docker dev (`BASE_URL=http://127.0.0.1:4202`), `node front/scripts/test-feedback-public-i18n.mjs` and `npm run test:landing-version --prefix front` — **PASS**; no raw `FEEDBACK.*` in body text, titles and invalid-tenant copy verified across locales; front bundle generation clean in logs.
- **Why closed:** Tester test report records **PASS** for all stated criteria; archive per `agents/tasks/README.md`. `gh issue comment` / close may still require a human token (Issues write) — see task body.
- **Closed at (UTC):** 2026-03-24 04:50
---

# Feedback page needs translation

## GitHub

- **Issue:** https://github.com/satisfecho/pos/issues/67

## Problem / goal

Public guest feedback URLs (e.g. `https://satisfecho.de/feedback/1?token=…`) must show **the entire form** in the user’s selected language. The reporter saw untranslated strings. Prior implementation and tester archives live under `agents/tasks/done/` (multiple **CLOSED** entries for this theme); **#67** remains **open** — finish verification, close any real i18n gaps, and align GitHub (comment / labels / close when product accepts). See `front/public/i18n/` and `docs/agent-loop.md`.

## High-level instructions for coder

- Re-read **#67** and spot-check `/feedback/{tenant}` with and without token across several locales (picker + `Accept-Language`).
- Confirm no raw `FEEDBACK.*` keys in visible UI, titles, or validation copy; extend locale JSON if anything is missing.
- Run or extend the public feedback Puppeteer / smoke scripts documented in `AGENTS.md` / `docs/testing.md` if useful.
- When behaviour matches acceptance: hand off to tester; coordinate **close #67** per `docs/agent-loop.md` (human may need to post if automation lacks Issues write).

## Coder notes (2026-03-24 UTC)

- **FEEDBACK / BOOK keys:** Scripted diff — every locale’s `FEEDBACK` object matches `en.json` keys; `BOOK.ADDRESS` and `BOOK.OPEN_IN_GOOGLE_MAPS` (used on the public feedback hero) exist in all seven locale files.
- **Product change:** `FeedbackPublicComponent` merges `TranslateService.onLangChange` and `onTranslationChange` so the browser tab title updates when translations arrive after first paint (issue **#67**).
- **Automated smoke:** `BASE_URL=http://127.0.0.1:4202 node front/scripts/test-feedback-public-i18n.mjs` → **exit 0**; `BASE_URL=http://127.0.0.1:4202 npm run test:landing-version --prefix front` → **exit 0**. Front container logs: **Application bundle generation complete** after the edit (no TS/NG errors in tail).
- **GitHub #67:** Closing the issue still needs a human/token with **Issues: write** if `gh issue comment` / close is blocked (see prior archived tasks).

## Testing instructions

### What to verify

1. Public `/feedback/1` (and optional `?token=…`): language picker cycles **en, de, fr, es, ca, zh-CN, hi** — form, thank-you path, and **SETTINGS.SELECT_LANGUAGE** aria context show no raw `FEEDBACK.*` in the DOM.
2. **Browser tab title** while loading and after load matches the selected locale (tenant name prefix when tenant is valid).
3. Invalid tenant **`/feedback/0`**: error copy and title follow locale after switching language (including **de** “Ungültiger …”).
4. No Angular build errors in the front container after any edits.

### How to test

- Stack: `docker compose -f docker-compose.yml -f docker-compose.dev.yml` (e.g. `http://127.0.0.1:4202`).
- Automated: `BASE_URL=http://127.0.0.1:4202 node front/scripts/test-feedback-public-i18n.mjs`
- Regression: `BASE_URL=http://127.0.0.1:4202 npm run test:landing-version --prefix front`
- Logs: `docker compose -f docker-compose.yml -f docker-compose.dev.yml logs --tail=80 front`

### Pass / fail criteria

- **PASS:** `test-feedback-public-i18n` **exit 0**; no visible `FEEDBACK.` key leaks; document titles assert as in script; landing-version **exit 0**; front rebuild succeeds.
- **FAIL:** Any raw `FEEDBACK.*` in body text, wrong-locale copy where a translation exists, or front build failure.

### Suggested GitHub comment (human with token)

> Verified 2026-03-24: public `/feedback/:id` i18n + tab title refresh on translation load; Puppeteer `test-feedback-public-i18n` passes. Please close **#67** if product agrees.

---

## Test report

1. **Date/time (UTC) and log window:** Verification run **2026-03-24** approx. **04:47–04:49 UTC**; Docker `front` log window reviewed via `docker compose … logs --tail=80 front` (same window; rebuilds through **04:46:37Z**).

2. **Environment:** `docker-compose.yml` + `docker-compose.dev.yml`; **`BASE_URL=http://127.0.0.1:4202`**; branch **`development`** @ **`448a641`**; **`HEADLESS=1`** for Puppeteer.

3. **What was tested:** Items under “What to verify” (public feedback locales + token URL + invalid tenant titles/copy; regression landing/nav; front build health).

4. **Results:**
   - Locales **en, de, fr, es, ca, zh-CN, hi** on `/feedback/1` + `?token=…`: **PASS** — `node front/scripts/test-feedback-public-i18n.mjs` exit **0**; script asserts no `FEEDBACK.` in `document.body.innerText` and locale-specific title substrings (e.g. DE “Wie war”, invalid DE “Ungültiger”).
   - Browser tab title per locale (incl. invalid tenant DE): **PASS** — enforced by same script (`page.title()` checks).
   - Invalid tenant `/feedback/0` EN + DE copy/title: **PASS** — script waits for “Invalid restaurant” / “Ungültiger Restaurant” and DE title contains “Ungültiger”.
   - Regression **`test:landing-version`**: **PASS** — exit **0**, ~43s elapsed (`>>> RESULT: Landing version OK…`).
   - Front container build: **PASS** — tail shows **`Application bundle generation complete`** for `feedback-public-component` lazy chunks; no `error TS` / `NG` failures in excerpt.

5. **Overall:** **PASS** (all criteria above).

6. **Product owner feedback:** Public guest feedback at `/feedback/:tenant` now tracks the language picker across all supported locales without exposing raw i18n keys, and the document title stays aligned with the selected language, including the invalid-tenant error state. Automated coverage matches the acceptance described in **#67**; you can treat this as ready to close the issue once you are happy with wording in production.

7. **URLs tested (automated):**
   1. `http://127.0.0.1:4202/feedback/1` (locale cycling)
   2. `http://127.0.0.1:4202/feedback/1?token=dummy-token-for-i18n-smoke`
   3. `http://127.0.0.1:4202/feedback/0` (EN then DE)
   4. Additional regression navigation from `test:landing-version` (e.g. `/`, `/dashboard`, sidebar routes including `/settings`) — see script output in run log.

8. **Relevant log excerpts:**

```
pos-front  | Application bundle generation complete. [0.254 seconds] - 2026-03-24T04:46:37.705Z
```

```
>>> RESULT: Public feedback i18n OK (en + de + fr + es + ca + zh-CN + hi, no FEEDBACK.* leaks)
>>> RESULT: Token URL path OK (no FEEDBACK.* leaks)
>>> RESULT: Invalid tenant /feedback/0 error UI i18n OK
```

```
>>> RESULT: Landing version OK; demo login (tenant=1) OK; sidebar nav OK.
exit_code: 0
```

**GitHub:** `gh issue comment 67` failed (**Resource not accessible by personal access token** — token lacks Issues write). Human should post the suggested one-liner from “Suggested GitHub comment” above and adjust labels / close **#67** per `docs/agent-loop.md`. Issue had no `agent:*` labels at test time.
