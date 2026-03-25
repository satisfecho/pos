---
## Closing summary (TOP)

- **What happened:** Independent tester re-ran verification for GitHub **#67** (public `/feedback/{tenant}` i18n) on local Docker and recorded **PASS** with evidence (development @ `627d59b`).
- **What was done:** Confirmed automated `test-feedback-public-i18n.mjs` (locales, `?token=`, thank-you, invalid tenant, tab titles) and `test:landing-version` both **PASS**; front build healthy in cited log window. Optional production spot-check and `gh issue comment` were not completed (N/A / token).
- **What was tested:** Full §1–§4 criteria from the task — **PASS** overall per tester table; §5 production **N/A** this run.
- **Why closed:** All in-scope acceptance criteria met; tester overall **PASS**; remaining work is product/GitHub follow-up on **#67** if prod confirmation is still required.
- **Closed at (UTC):** 2026-03-24 06:35
---

# Feedback page needs translation

## GitHub

- **Issue:** https://github.com/satisfecho/pos/issues/67

## Problem / goal

Public guest feedback URLs (e.g. `https://satisfecho.de/feedback/1?token=…`) must show **the entire form and UI** in the user’s selected language. The reporter saw untranslated strings on production-style URLs.

Many **CLOSED** archives under `agents/tasks/done/` document repeated implementation and tester **PASS** on local Docker for this theme; **#67** remains **open** on GitHub. Remaining work is typically **product verification** (especially production), any **real i18n gaps** found there, and **GitHub alignment** (verification comment, labels, close when product accepts). See `front/public/i18n/`, `FeedbackPublicComponent`, and `docs/agent-loop.md`.

## High-level instructions for coder

- Re-read **#67** and verify `/feedback/{tenant}` with and without `?token=…` across supported locales (picker + `Accept-Language`); confirm no raw `FEEDBACK.*` keys in visible UI or document title.
- If dev/staging already match acceptance: optional production spot-check on **satisfecho.de**; if product agrees, post a short verification comment on **#67** and support closing the issue.
- If gaps remain, fix i18n JSON, template bindings, or title/update timing; extend automated coverage if a regression path is identified.

## Implementation notes (coder, 2026-03-24 UTC)

- **Code review:** `front/src/app/feedback-public/feedback-public.component.html` uses `translate` for all guest-visible copy; shared `BOOK.*` keys (address / Google Maps) exist in every locale under `front/public/i18n/*.json`.
- **Title:** `feedback-public.component.ts` sets the document title via `translate.get(...)` and subscribes to `onLangChange` / `onTranslationChange` so the tab title does not show raw `FEEDBACK.*` keys (issue #67).
- **Locale parity:** Script check: all `FEEDBACK` keys in `en.json` are present in `de`, `es`, `fr`, `ca`, `zh-CN`, `hi` (37 keys each).
- **No product code changes** were required in this pass; behaviour matches acceptance on local Docker.

---

## Testing instructions

1. **Automated (primary):** With stack up (`docker-compose.yml` + `docker-compose.dev.yml`, HAProxy e.g. `http://127.0.0.1:4202`):
   ```bash
   BASE_URL=http://127.0.0.1:4202 node front/scripts/test-feedback-public-i18n.mjs
   ```
   Expect exit **0** and log lines ending in: browser default **es** stub OK; **en + de + fr + es + ca + zh-CN + hi** no `FEEDBACK.*` in DOM; **token** URL OK; post-submit **thank-you** (de) OK; **invalid** `/feedback/0` error UI i18n OK.

2. **Manual spot-check:** Open `/feedback/1` (and with a real `?token=` if available). Use the language picker: confirm form, errors, thank-you state, and **browser tab title** are localized (no literal `FEEDBACK.` in the page).

3. **Accept-Language:** First visit with cleared `localStorage` (`pos_language`): `LanguageService` maps `navigator.language` to a supported code (see `test-feedback-public-i18n.mjs` es-ES stub). API requests send `Accept-Language` via `accept-language.interceptor.ts`.

4. **Regression:** `BASE_URL=http://127.0.0.1:4202 npm run test:landing-version --prefix front` exits **0**.

5. **Production / GitHub:** Optional: repeat (2) on **satisfecho.de**. If product accepts, add a short verification comment on **#67** and close when appropriate.

---

## Test report (coder self-check, 2026-03-24 UTC)

| Step | Result |
|------|--------|
| `test-feedback-public-i18n.mjs` | **PASS** |
| `test:landing-version` | **PASS** |
| Front Docker logs (recent) | **PASS** (bundle complete, no TS errors) |

**GitHub:** **#67** still needs human/product confirmation and close when satisfied.

---

## Test report (tester, 2026-03-24 UTC)

**Start:** 2026-03-24T06:20:55Z — **End:** 2026-03-24T06:22:30Z (approx.). **Log window cited:** `docker logs pos-front` tail after run (~06:21–06:22Z host).

### Environment

- **Compose:** `docker-compose.yml` + `docker-compose.dev.yml`
- **BASE_URL:** `http://127.0.0.1:4202` (HAProxy → front)
- **Branch / commit:** `development` @ `627d59b`

### What was tested

Per **Testing instructions** §1–4 (automated primary, manual/Accept-Language as exercised by `test-feedback-public-i18n.mjs`, regression landing). §5 production spot-check **not** run (optional).

### Results

| Criterion | Result | Evidence |
|-----------|--------|----------|
| §1 `test-feedback-public-i18n.mjs` exit 0, all RESULT lines | **PASS** | Exit 0; console: es stub OK; en/de/fr/es/ca/zh-CN/hi; token URL; thank-you (de); `/feedback/0` error UI |
| §2 Manual spot-check (form, errors, thank-you, tab title) | **PASS** | Same script asserts `document.title` for de/fr/es/ca/zh/hi, thank-you title, invalid-tenant title; body has no `FEEDBACK.*` leaks |
| §3 Accept-Language / first visit (`es-ES` stub, no `pos_language`) | **PASS** | Script block “Browser default locale (es, navigator stub) on first load OK” |
| §4 `npm run test:landing-version --prefix front` | **PASS** | exit_code: 0, `>>> RESULT: Landing version OK` |
| §5 Production / GitHub | **N/A** | Optional; not executed this run |
| Front build health | **PASS** | `docker logs pos-front`: `Application bundle generation complete` for `feedback-public-component`, no TS error lines in tail |

### Overall

**PASS** — Local Docker verification matches task acceptance; no failed criteria.

### Product owner feedback

Public feedback i18n is covered by the dedicated Puppeteer suite across supported locales, including document titles and post-submit states. Remaining decision is whether production (**satisfecho.de**) matches dev and whether **#67** should be closed after that confirmation; this test run does not replace a live prod check if product still requires it.

### URLs tested (Puppeteer)

1. `http://127.0.0.1:4202/feedback/1` (multiple locale passes via in-page language control)
2. `http://127.0.0.1:4202/feedback/1?token=test-token-00000000-0000-0000-0000-000000000001` (script token path)
3. `http://127.0.0.1:4202/feedback/0` (invalid tenant error UI)
4. `http://127.0.0.1:4202/` and staff routes via `test:landing-version` (regression only; full nav including `/guest-feedback`)

### GitHub

Attempted `gh issue comment 67` for workflow sync: **failed** — `Resource not accessible by personal access token (addComment)`. Labels **`agent:testing`** / **`agent:wip`** were **not** updated via API. Human or token with `issues: write` should comment on **#67** and adjust labels per **`docs/agent-loop.md`** (closer removes **`agent:testing`** after archive).

### Relevant log excerpts

```text
# pos-front (tail)
Application bundle generation complete. [0.254 seconds] - 2026-03-24T04:46:37.705Z
Lazy chunk files    | Names                     | Raw size
chunk-XQUQA5VT.js   | feedback-public-component | 75.06 kB |
```
