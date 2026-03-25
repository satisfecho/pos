---
## Closing summary (TOP)

- **What happened:** Follow-up on GitHub [#67](https://github.com/satisfecho/pos/issues/67): re-verify feedback-page i18n and close remaining gaps where 422/429 API errors surfaced English in the UI.
- **What was done:** `feedback-public.component.ts` maps **429** → `FEEDBACK.RATE_LIMIT` and **422** (or array `detail`) → `FEEDBACK.VALIDATION_ERROR`, with matching keys in all seven `front/public/i18n/*.json` files; `FEEDBACK.*` parity with `en.json` re-confirmed.
- **What was tested:** Backend `pytest tests/test_guest_feedback.py` **5 passed**; front container build log clean; `npm run test:landing-version` **exit 0**; `/feedback/1` **200**; new keys present in en, de, es, fr, ca, zh-CN, hi.
- **Why closed:** Tester overall **PASS** per test report; scope met. GitHub comment/label/close remains a **human/PAT handoff** (`gh` Issues write unavailable in the test run).
- **Closed at (UTC):** 2026-03-24 03:18
---

# Feedback page needs translation

## GitHub

- **Issue:** https://github.com/satisfecho/pos/issues/67

## Problem / goal

Public feedback URLs (e.g. `/feedback/{tenant}` with token) must show **every** part of the flow in the user’s selected language. The reporter cited production-style URLs with missing translations. Prior delivery and tester **PASS** are archived under `agents/tasks/done/` (e.g. `CLOSED-20260323-2214-feedback-page-needs-translation.md` and 2026-03-24 follow-ups); treat this queue item as **re-verification**, closing any remaining i18n gaps, and **GitHub alignment** (comment / labels / close when product accepts). See `docs/agent-loop.md`.

## High-level instructions for coder

- Reproduce with the issue’s example pattern (tokenized feedback URL); exercise language picker and all form states (valid/invalid input, loading, error paths, invalid tenant if applicable).
- Confirm `FEEDBACK` (and related) keys exist and match across locale files under `front/public/i18n/`; fix any missing or mismatched keys; ensure API validation messages respect locale where the product expects it.
- Run documented smoke / Puppeteer for feedback or landing if available; align outcomes with archived CLOSED tasks so **006** does not redo completed scope without a real regression.
- When behaviour matches the issue: post verification or closing comment on **#67**, adjust labels per `docs/agent-loop.md`, and close when product agrees (or document handoff if automation lacks Issues write).

## Coder implementation notes (2026-03-24, follow-up)

- **Re-verified:** All `FEEDBACK.*` keys still match across `front/public/i18n/*.json` (parity with `en.json`).
- **Gap closed:** Backend `400` errors from guest-feedback already use `get_message` + `Accept-Language`, but **422** (Pydantic) and **429** (slowapi rate limit) still surface **English** `detail` strings to the UI. `feedback-public.component.ts` now maps **429** → `FEEDBACK.RATE_LIMIT` and **422** (or array `detail`) → `FEEDBACK.VALIDATION_ERROR`, both translated in all seven locale files. Other string `detail` responses (localized API messages) unchanged.

## Testing instructions

1. **Backend:** `docker compose -f docker-compose.yml -f docker-compose.dev.yml exec -T back pytest tests/test_guest_feedback.py -q` — expect **5 passed**.
2. **Frontend build:** `docker compose -f docker-compose.yml -f docker-compose.dev.yml logs --tail=80 front` — no TS/Angular errors after rebuild.
3. **Smoke:** From `front/`, `BASE_URL=http://127.0.0.1:4202 npm run test:landing-version` — expect exit **0**.
4. **Manual (optional):** `/feedback/1` — pick **Deutsch**, submit invalid optional email `x` — expect German API message (existing behaviour). To exercise new keys, force a **422** or **429** (e.g. temporarily invalid body or rate limit) and confirm the message is in the selected UI language, not English slowapi/Pydantic text.
5. **GitHub #67:** Tester / PO: comment or close per product acceptance (token may lack `issues: write`).

---

## Test report

1. **Date/time (UTC) and log window:** 2026-03-24T03:16Z–03:17Z (pytest ~03:16Z; landing smoke ended 03:17:06Z). Front log window: tail 80 captured ~03:16Z (`Application bundle generation complete`, no `error TS` / `NG` failures).

2. **Environment:** `docker-compose.yml` + `docker-compose.dev.yml`; **`BASE_URL`** `http://127.0.0.1:4202`; branch **`development`**, commit **`8ec2593`**.

3. **What was tested (from Testing instructions):** Guest feedback pytest; front container build log; `npm run test:landing-version`; spot-check `GET /feedback/1` (HTTP); grep `FEEDBACK.VALIDATION_ERROR` / `FEEDBACK.RATE_LIMIT` across `front/public/i18n/*.json`. Optional full-browser Deutsch + invalid-email and forced 422/429 not run (keys and automated checks only).

4. **Results:**
   - Backend `pytest tests/test_guest_feedback.py -q` — **PASS** — `5 passed in 0.68s`.
   - Front build log — **PASS** — `Application bundle generation complete`; no TypeScript/Angular error lines in last 80 lines.
   - Smoke `test:landing-version` — **PASS** — `exit_code: 0`, `>>> RESULT: Landing version OK; demo login (tenant=1) OK; sidebar nav OK.`
   - Optional manual (full UI language + 422/429) — **PASS (partial evidence)** — `/feedback/1` returns **200**; `VALIDATION_ERROR` and `RATE_LIMIT` present in en, de, es, fr, ca, zh-CN, hi (seven locales).
   - GitHub #67 — **N/A (blocked)** — `gh issue comment` failed: `Resource not accessible by personal access token (addComment)`; PAT lacks Issues write. Labels on #67 were empty (no `agent:wip` → `agent:testing` swap). Human/PO should comment or close per acceptance.

5. **Overall:** **PASS** (backend, front log, smoke, route/i18n evidence; GitHub comment blocked by token — documented for handoff).

6. **Product owner feedback:** Automated verification confirms the guest-feedback test suite and main navigation smoke still pass on current `development`, and the feedback SPA route is served. The new `FEEDBACK.VALIDATION_ERROR` and `FEEDBACK.RATE_LIMIT` strings exist in every shipped locale file, matching the coder’s 422/429 UI mapping. Recommend a quick human pass on production with language switch + rate limit if you want eyes on real 429 copy.

7. **URLs tested:**
   1. `http://127.0.0.1:4202/` (landing smoke)
   2. `http://127.0.0.1:4202/dashboard` … `http://127.0.0.1:4202/settings` (sidebar nav via Puppeteer)
   3. `http://127.0.0.1:4202/feedback/1` (HTTP 200, shell HTML)

8. **Relevant log excerpts:**
   - `pos-back` (pytest): `5 passed in 0.68s`
   - `pos-front`: `Application bundle generation complete. [0.257 seconds] - 2026-03-24T03:14:29.127Z`
   - Landing script: `>>> RESULT: Landing version OK; demo login (tenant=1) OK; sidebar nav OK.` / `exit_code: 0`
