# Feedback page needs translation

## GitHub

- **Issue:** https://github.com/satisfecho/pos/issues/67

## Problem / goal

Public feedback (`/feedback/{tenant}`) should be fully localized. Implementation and tester verification are already archived under `agents/tasks/done/2026/03/23/CLOSED-20260323-2214-feedback-page-needs-translation.md` and follow-ups in `agents/tasks/done/2026/03/24/` (close-loop and housekeeping). Issue **#67** remains **open** on GitHub; remaining work is mainly **alignment**: confirm behaviour still matches the issue, then **comment**, **labels**, and **close** on GitHub when product accepts (per `docs/agent-loop.md`). Re-open or extend scope only if QA finds untranslated strings or regressions.

## High-level instructions for coder

- Re-smoke public feedback for tenant 1 (or a test tenant): language picker, `FEEDBACK` strings, and invalid-tenant path; spot-check `front/public/i18n/*.json` for syntax if locales fail to load.
- If anything is broken, fix in `front/` only; otherwise document **PASS** with short test notes for the tester handoff.
- **GitHub:** Post a short verification or closing comment on **#67**, add label **`agent-planned`** if appropriate (repo uses hyphen; prompt’s `agent:planned` may not exist), and **close** when product agrees. If `gh issue comment` / `gh issue edit` fails with `Resource not accessible by personal access token`, hand off to a human with **Issues: write** (known automation limit in prior runs).

## Coder notes (2026-03-24 UTC)

- **Product code:** No changes required; public `FeedbackPublicComponent` already uses `FEEDBACK.*` / `BOOK.*` keys only (see `front/src/app/feedback-public/`).
- **i18n:** All `front/public/i18n/*.json` files parse as JSON. Every locale’s `FEEDBACK` object has the same keys as `en.json` (scripted diff).
- **Smoke:** `curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:4202/feedback/1` → **200**. `BASE_URL=http://127.0.0.1:4202 npm run test:landing-version --prefix front` → **exit 0** (~43s). `docker compose -f docker-compose.yml -f docker-compose.dev.yml logs --tail=80 front` → **Application bundle generation complete**, no `error TS` / `NG` / bundle-failure lines in the sampled window.
- **GitHub #67:** `gh issue comment 67` failed: `GraphQL: Resource not accessible by personal access token (addComment)`. Issue remains **OPEN**. **Human handoff:** someone with **Issues: write** should post a short verification comment, adjust labels as per `docs/agent-loop.md`, and **close #67** when product accepts (suggested closing text in tester section below).

## Testing instructions

### What to verify

1. Public feedback `/feedback/1` (or valid tenant) loads; language picker works; form, thank-you, and invalid-tenant copy match the selected locale (not English for non-English locales).
2. Optional regression: `FEEDBACK.INVALID_TENANT` / `FEEDBACK.TENANT_NOT_FOUND` on `/feedback/0` or missing tenant after switching language on `/feedback/1` first (same tab).
3. No Angular/TS build errors in the front container after any edits.

### How to test

- Stack: `docker compose -f docker-compose.yml -f docker-compose.dev.yml` (HAProxy e.g. `http://127.0.0.1:4202`).
- Manual: open `/feedback/1`, use header language picker (e.g. Français, Català, 中文（简体）, हिन्दी), confirm `FEEDBACK` strings and shared `BOOK` strings (address label, Google Maps button) localize.
- Automated quick smoke: `BASE_URL=http://127.0.0.1:4202 npm run test:landing-version --prefix front`.
- Front build log: `docker compose -f docker-compose.yml -f docker-compose.dev.yml logs --tail=80 front`.

### Pass / fail criteria

- **PASS:** Locales show translated public feedback UI as in archived tester report for **CLOSED-20260323-2214**; landing-version **exit 0**; front logs show successful bundle generation without TS/NG errors tied to this change.
- **FAIL:** Any visible English (or wrong locale) on the feedback flow where a translation exists; broken JSON in `front/public/i18n/*.json`; build failures.

### Suggested GitHub comment (human with token)

> Re-verified on dev (2026-03-24): `/feedback/1` OK; i18n JSON valid; `FEEDBACK` keys aligned across locales; landing smoke passes. Matches archived QA PASS for #67. Closing as completed unless new gaps are reported.
