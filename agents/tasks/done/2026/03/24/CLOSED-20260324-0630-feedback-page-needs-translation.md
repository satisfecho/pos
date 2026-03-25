---
## Closing summary (TOP)

- **What happened:** GitHub issue #67 (public feedback page i18n) completed the pipeline: coder re-verified implementation and keys; tester recorded a PASS on the dev stack.
- **What was done:** No additional `front/` changes were needed; FeedbackPublic already uses the translate pipe and `TranslateService` for titles; `FEEDBACK.*` keys are present across supported locales per task notes.
- **What was tested:** `BASE_URL=http://127.0.0.1:4202 node front/scripts/test-feedback-public-i18n.mjs` (HEADLESS=1) exited 0; locales, `?token=`, thank-you (DE), and `/feedback/0` error paths passed; optional satisfecho.de spot-check was N/A for that run.
- **Why closed:** Test report **Overall: PASS**; no raw `FEEDBACK.` leaks; criteria in the task met for archiving.
- **Closed at (UTC):** 2026-03-24 07:45
---

# Feedback page needs translation

## GitHub

- **Issue:** https://github.com/satisfecho/pos/issues/67

## Problem / goal

Public guest feedback URL (e.g. `/feedback/{tenant}` with optional `?token=…`) must show **fully translated** UI: every form label, message, and document title in the user’s selected language (and `Accept-Language`), with **no raw i18n keys** (e.g. `FEEDBACK.*`) visible. Example from the issue: production-style URL on satisfecho.de with token query. Multiple **PASS** archives exist under `agents/tasks/done/` for dev verification; remaining scope often includes **production parity**, **GitHub closure** when product agrees, and any **real gaps** still found.

Relevant areas: `front/src/app/feedback-public/`, `front/public/i18n/`, `docs/agent-loop.md`.

## High-level instructions for coder

- Re-verify `/feedback/{tenant}` with and without `?token=…` across supported locales (picker + `Accept-Language`); confirm UI and **browser tab title** stay translated after load and language changes.
- If dev is clean: optional spot-check **satisfecho.de** for cache/deploy drift; fix any remaining untranslated strings or title handling.
- Run or extend automated coverage (e.g. public feedback i18n Puppeteer script from `docs/testing.md` / `AGENTS.md`) if gaps appear.
- When product accepts: post a short verification comment on **#67** and close the issue; align labels per `docs/agent-loop.md` (human may need to post if automation lacks **Issues** write on `gh`).

## Coder notes (2026-03-24 UTC)

- **FEAT → WIP** picked up; **no `front/` or `back/` code changes** — `FeedbackPublicComponent` already uses `translate` pipe / `TranslateService.get()` for document title (with `onLangChange` + `onTranslationChange`), and all public `FEEDBACK.*` keys exist in **en, de, es, fr, ca, zh-CN, hi** (script-checked: no missing keys vs `en.json`).
- **Puppeteer** `front/scripts/test-feedback-public-i18n.mjs` against `BASE_URL=http://127.0.0.1:4202`: all assertions passed (locales, token URL, post-submit thank-you de, `/feedback/0` error UI, ES `navigator.language` stub).
- **Production:** optional spot-check **satisfecho.de** `/feedback/1` (and with `?token=…` if available) remains for tester / human — not run from this environment.

---

## Testing instructions

### What to verify

- Public `/feedback/{tenant}` (with and without `?token=…`): no raw `FEEDBACK.` strings in visible UI or document title; language picker and initial `Accept-Language` / `navigator.language` behavior; title updates after language change.
- Error paths: invalid tenant id (e.g. `/feedback/0`) shows translated messages.
- After successful submit: thank-you copy and optional Google review CTA are translated.

### How to test

- Stack: `docker compose -f docker-compose.yml -f docker-compose.dev.yml` (HAProxy e.g. **4202**).
- Automated: from repo root  
  `BASE_URL=http://127.0.0.1:4202 node front/scripts/test-feedback-public-i18n.mjs`  
  Optional: `TENANT_ID=1` (default).
- Manual: open `/feedback/1`, switch languages via picker, confirm tab title and form strings; hard-refresh and repeat.
- Optional prod: same checks on `https://satisfecho.de/feedback/1` after deploy.

### Pass / fail criteria

- **Pass:** Puppeteer script exits **0**; manual spot-check shows no i18n key leaks; titles and messages match selected language.
- **Fail:** Any `FEEDBACK.` visible to users, wrong/stale title after locale change, or Puppeteer assertion failure — return task **testing → wip** with logs.

---

## Test report

1. **Date/time (UTC):** 2026-03-24 06:32–06:34 UTC (verification run). Log window reviewed: HAProxy ~06:33 (request lines below).

2. **Environment:** `docker-compose.yml` + `docker-compose.dev.yml`; `BASE_URL=http://127.0.0.1:4202`; branch `development`, commit `9fa484a`; `HEADLESS=1`.

3. **What was tested:** Per **What to verify** — public feedback i18n (picker + navigator stub), `?token=`, post-submit thank-you, invalid tenant `/feedback/0`.

4. **Results:**
   - No raw `FEEDBACK.` in visible UI or document title across locales: **PASS** — Puppeteer `waitForFunction` + `innerText` / `title` checks all green.
   - Language picker and initial `navigator.language` (es stub) behavior: **PASS** — first load asserts Spanish copy and title contains `Cómo`.
   - Title updates after language change (de, fr, es, ca, zh-CN, hi): **PASS** — each locale asserts expected title substring after `select('.language-select', …)`.
   - Error path `/feedback/0`: **PASS** — EN “Invalid restaurant”, DE “Ungültiger Restaurant”, titles localized.
   - After submit: thank-you in DE (`Vielen Dank`), title without `FEEDBACK.`: **PASS**.
   - Optional production `satisfecho.de`: **N/A** — not in scope for this run (task lists as optional).

5. **Overall:** **PASS**

6. **Product owner feedback:** Public feedback is fully covered by automated checks on the dev stack: all supported languages show real copy and tab titles, including token URLs and the thank-you step. Production spot-check on satisfecho.de remains a quick sanity check after deploy if you want parity confirmation outside Docker.

7. **URLs tested**
   1. `http://127.0.0.1:4202/feedback/1` (multiple navigations, locale switches, submit)
   2. `http://127.0.0.1:4202/feedback/1?token=dummy-token-for-i18n-smoke`
   3. `http://127.0.0.1:4202/feedback/0` (invalid tenant, en then de)

8. **Relevant log excerpts**
   - Command: `BASE_URL=http://127.0.0.1:4202 HEADLESS=1 node front/scripts/test-feedback-public-i18n.mjs` → exit **0**; stdout included five `>>> RESULT: … OK` lines (ES auto, all locales, token, thank-you de, invalid tenant).
   - `curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:4202/feedback/1` → **200**.
   - HAProxy (excerpt): `GET /feedback/0 HTTP/1.1` … **200**; `GET /i18n/de.json` … **304** (locale bundles loaded during run).
