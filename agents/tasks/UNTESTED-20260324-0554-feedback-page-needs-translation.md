# Feedback page needs translation

## GitHub

- **Issue:** https://github.com/satisfecho/pos/issues/67

## Problem / goal

Public guest feedback URLs (e.g. `/feedback/{tenant}` with optional `?token=…`) must show **every part of the form** in the user’s selected language. The reporter still sees untranslated strings on production-style URLs. Prior implementation and tester archives live under `agents/tasks/done/` (multiple **CLOSED** entries for this theme); align remaining work with `front/public/i18n/`, `FeedbackPublicComponent`, and `docs/agent-loop.md`.

## High-level instructions for coder

- Re-read **#67** and verify `/feedback/{tenant}` with and without `?token=…` across supported locales (picker + `Accept-Language`); confirm no raw `FEEDBACK.*` keys in UI or document title.
- If dev/staging already match acceptance, optional production spot-check on **satisfecho.de**; if product agrees, support closing **#67** with a short verification comment (human may post if automation lacks Issues write).
- Run or extend automated coverage for public feedback i18n if present under `front/scripts/`; keep landing/staff smoke passing per `AGENTS.md`.
- Do not open a **NEW-** task for this issue—GitHub-driven work stays in **FEAT-** queue.

## Implementation note (feature coder, 2026-03-24)

- Reviewed `FeedbackPublicComponent` (template + `Title` / `translate.get` for tab title), `LanguageService` / language picker, and **FEEDBACK** keys in `front/public/i18n/*.json` (all locales aligned with `en.json`).
- No application code changes were required: acceptance criteria for **#67** (no raw `FEEDBACK.*` in visible UI or document title; locales en/de/fr/es/ca/zh-CN/hi; `?token=` path; thank-you after submit; invalid `/feedback/0`) are already covered.
- Automated check: `BASE_URL=http://127.0.0.1:4202 node front/scripts/test-feedback-public-i18n.mjs` — **exit 0** on local Docker (HAProxy 4202). Documented in `docs/testing.md` as `npm run test:feedback-public-i18n --prefix front`.
- **Production (#67):** If satisfecho.de still showed old behaviour, likely stale assets or pre-fix deploy; human can confirm live and comment on the issue to close.

---

## Testing instructions (for tester)

1. **What to verify**  
   - `/feedback/{tenant}` (e.g. tenant `1`) and same URL with `?token=…` render fully translated copy for each language in the picker; no literal `FEEDBACK.` keys in page text or browser tab title.  
   - After submitting a valid rating, thank-you state and title stay localized.  
   - `/feedback/0` shows translated error copy and title for at least **en** and **de**.

2. **How to test**  
   - Stack up (e.g. `./run.sh` or Docker dev compose on HAProxy port **4202**).  
   - From repo root:  
     `BASE_URL=http://127.0.0.1:4202 npm run test:feedback-public-i18n --prefix front`  
     or:  
     `BASE_URL=http://127.0.0.1:4202 node front/scripts/test-feedback-public-i18n.mjs`

3. **Pass / fail**  
   - **Pass:** Script completes with all `>>> RESULT:` lines and **exit code 0**.  
   - **Fail:** Any assertion error, timeout, or raw `FEEDBACK.` substring in body or title checks.
