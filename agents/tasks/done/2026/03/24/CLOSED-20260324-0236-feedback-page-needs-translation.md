---
## Closing summary (TOP)

- **What happened:** Continued GitHub **#67** (public feedback fully translated); coder closed remaining UX/i18n gaps on the loading branch and required-mark copy; tester re-verified all feedback routes and smoke.
- **What was done:** Loading state now includes the same top bar and `app-language-picker` as other branches; literal rating required asterisk replaced with **`FEEDBACK.FIELD_REQUIRED_MARK`** across locales; `aria-label` uses label + mark.
- **What was tested:** `/feedback/1` (with/without token), invalid/unknown tenant paths, all seven picker locales, `npm run test:landing-version` **exit 0**, front bundle logs — **overall PASS**.
- **Why closed:** Documented pass/fail criteria satisfied. **GitHub:** `gh issue comment` / label updates failed (`Resource not accessible by personal access token`); human/committer should comment on **#67**, adjust **`agent:testing`** per `docs/agent-loop.md`, and close when product accepts.
- **Closed at (UTC):** 2026-03-24 03:12
---

# Feedback page needs translation

## GitHub

- **Issue:** https://github.com/satisfecho/pos/issues/67

## Problem / goal

Public feedback URLs (e.g. `/feedback/{tenant}` with token) must show **every** part of the form in the user’s selected language. The reporter saw untranslated strings on production-style URLs. Multiple **CLOSED** archives under `agents/tasks/done/` already document implementation and tester **PASS** for this scope; GitHub **#67** remains **open** — treat remaining work as **verification**, any real i18n gaps, and **GitHub alignment** (comment / labels / close when product agrees). See `docs/agent-loop.md`.

## High-level instructions for coder

- Re-verify `/feedback/{tenant}` (with and without token, invalid tenant path) across several locales using the in-app language picker; confirm `FEEDBACK` (and related) keys exist and read correctly in `front/public/i18n/*.json`.
- If anything is still hard-coded or missing keys, fix in the feedback public flow only; keep JSON valid (no syntax regressions).
- Run documented smoke / Puppeteer if applicable; check `docker compose` **front** logs for a clean Angular build after changes.
- When behaviour matches the issue: use **`gh`** on **#67** if your token allows — verification or closing comment, labels per `docs/agent-loop.md`, and close when product accepts; otherwise note human handoff in the task file for the committer.

## Coder notes (2026-03-24 UTC)

- Audited `front/src/app/feedback-public/feedback-public.component.html` and `.ts`: user-visible copy already goes through `translate` / `TranslateService.instant` for API errors; `FEEDBACK.*` keys exist in all seven `front/public/i18n/*.json` files for the strings used on this route (plus `BOOK.ADDRESS`, `BOOK.OPEN_IN_GOOGLE_MAPS`, language picker `SETTINGS.SELECT_LANGUAGE`).
- **Gaps fixed:** (1) **Loading** branch had no language picker while `getPublicTenant` ran — added the same top bar + `app-language-picker` as the error branch so locale can be changed before the form renders. (2) The literal ` *` after the rating label is now **`FEEDBACK.FIELD_REQUIRED_MARK`** in every locale (default ` *`; can be customized, e.g. locale-specific required wording). Star row `aria-label` concatenates label + mark.
- **GitHub:** `gh issue comment` on **#67** failed with `Resource not accessible by personal access token` — **committer / human** should comment, adjust labels, and close **#67** when product accepts after deploy.

## Testing instructions

### What to verify

- `/feedback/{tenantId}` (valid tenant): while the page loads, the **language** dropdown is visible and changing language updates UI strings once the form is shown.
- Form labels, intro, submit/sending, thank-you block, Google/Maps buttons, and error states show **no raw i18n keys** and match the selected language.
- `/feedback/0` or non-numeric tenant: error card shows translated invalid-tenant message.
- Unknown tenant id: translated “not found” message.
- Optional: `/feedback/1?token=…` — same translation behaviour (token is opaque to UI).

### How to test

- Stack: `docker compose -f docker-compose.yml -f docker-compose.dev.yml` (HAProxy e.g. `http://127.0.0.1:4202`).
- Manual: open `http://127.0.0.1:4202/feedback/1`, cycle **every** option in the language picker; repeat for `http://127.0.0.1:4202/feedback/0` and a high missing id (e.g. `999999`).
- Smoke (regression): from `front/`, `BASE_URL=http://127.0.0.1:4202 npm run test:landing-version`.
- After FE changes: `docker compose -f docker-compose.yml -f docker-compose.dev.yml logs --tail=80 front` — no Angular/TS build errors.

### Pass / fail criteria

- **Pass:** Language picker on **loading** and all branches; no hard-coded English-only user strings on the public feedback flow for supported locales; JSON valid; front build clean; landing smoke test exits 0.
- **Fail:** Missing translation keys (raw keys in UI), picker missing on loading, or build errors in front logs.

---

## Test report

1. **Date/time (UTC):** 2026-03-24T02:40Z–02:43Z (verification window). Log window: same (front container `pos-front` tail captured during run).
2. **Environment:** `docker compose -f docker-compose.yml -f docker-compose.dev.yml`; **`BASE_URL`** `http://127.0.0.1:4202`; branch **`development`**, commit **`b1a6baf`**.
3. **What was tested:** Per **Testing instructions** — public feedback routes, language picker (including early presence after navigation), all seven picker locales, absence of raw `FEEDBACK` / `BOOK` / `SETTINGS` keys in visible text, regression smoke, front build logs.
4. **Results:**
   - Valid tenant `/feedback/1`: language dropdown present; **`app-language-picker`** observed within ~1s of navigation start on automated runs; cycling **en, es, fr, ca, de, zh-CN, hi** — **PASS** (no `FEEDBACK.*` / `BOOK.*` / `SETTINGS.*` in `document.body.innerText`; sample **en** vs **de**: “How was your visit?” vs “Wie war Ihr Besuch?”).
   - `/feedback/1?token=opaque-test-token`: same picker + locale sweep — **PASS** (no raw keys).
   - `/feedback/0` invalid numeric tenant: error UI + picker + locale sweep — **PASS** (no raw keys).
   - `/feedback/999999` unknown tenant: same — **PASS** (no raw keys).
   - Optional non-numeric path `/feedback/abc` (HTTP 200): shows “Invalid restaurant link.” + picker; no raw keys in body text — **PASS** (bonus check).
   - Smoke `BASE_URL=http://127.0.0.1:4202 npm run test:landing-version` (from `front/`) — **PASS** (`exit_code: 0`, ended 2026-03-24T02:41:00Z).
   - Front logs (`docker compose … logs --tail=80 front`) — **PASS** (“Application bundle generation complete”, no TS/NG errors in tail).
5. **Overall:** **PASS** (all criteria above satisfied).
6. **Product owner feedback:** Public feedback pages expose the language control early in the load sequence, and the form and error states stay fully translated across all supported picker languages in this environment. Tenant marketing/description text may stay in the tenant’s own language (expected). After deploy to production, a quick spot-check on the live hostname is still worthwhile.
7. **URLs tested:**
   1. `http://127.0.0.1:4202/feedback/1`
   2. `http://127.0.0.1:4202/feedback/1?token=opaque-test-token`
   3. `http://127.0.0.1:4202/feedback/0`
   4. `http://127.0.0.1:4202/feedback/999999`
   5. `http://127.0.0.1:4202/feedback/abc` (bonus)
8. **Relevant log excerpts:**

```
pos-front | Application bundle generation complete. [0.303 seconds] - 2026-03-24T02:39:24.922Z
pos-front | Component update sent to client(s).
```

**GitHub:** `gh issue comment 67` / label updates failed with `Resource not accessible by personal access token` (same as coder notes). **Human / committer:** comment on **#67**, set **`agent:testing` → remove on close**, and close **#67** when product accepts (per `docs/agent-loop.md`).
