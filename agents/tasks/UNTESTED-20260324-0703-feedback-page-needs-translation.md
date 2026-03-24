# Feedback page needs translation

## GitHub

- **Issue:** https://github.com/satisfecho/pos/issues/67

## Problem / goal

Public guest feedback (e.g. `https://satisfecho.de/feedback/1?token=…`) must not show untranslated UI: the full form and related states should follow the selected language. Multiple **CLOSED** archives under `agents/tasks/done/` document dev/test **PASS**; **#67** stays open until product signs off (optional production check on **satisfecho.de**). See `front/public/i18n/`, `FeedbackPublicComponent`, and `docs/agent-loop.md`.

## High-level instructions for coder

- Re-read **#67** and verify `/feedback/{tenant}` with and without `?token=…` across supported locales (picker + `Accept-Language`); confirm no raw `FEEDBACK.*` keys in visible UI or document title.
- If dev already matches acceptance, capture evidence for GitHub; optional prod spot-check; support closing **#67** when product agrees.
- If any gap remains, extend `front/public/i18n/` and `feedback-public` templates until all guest-visible copy is translated.
- Keep or extend automated checks (e.g. `npm run test:feedback-public-i18n` from `front/`) so regressions are caught.

## Coder verification (2026-03-24 UTC, feature-coder)

- **WIP:** `FEAT-20260324-0702-…` → `WIP-20260324-0703-…` on start.
- **Code review:** `FeedbackPublicComponent` uses `TranslateModule` / pipes for all guest-visible strings; document title uses `translate.get(...)` with subscriptions on lang/translation change so tab titles stay localized (issue **#67**). `front/public/i18n/{en,de,fr,es,ca,zh-CN,hi}.json` each define a full `FEEDBACK` object.
- **No product code changes** required in this pass; behaviour matches acceptance in dev.

### Evidence for GitHub (#67)

Automated run (Docker dev stack, HAProxy **4202**):

- `BASE_URL=http://127.0.0.1:4202 npm run test:feedback-public-i18n --prefix front` — **PASS** (es auto-detect via navigator stub, en/de/fr/es/ca/zh-CN/hi picker, `?token=` path, post-submit thank-you DE, invalid `/feedback/0` en+de, no `FEEDBACK.*` in body text or document title).
- `BASE_URL=http://127.0.0.1:4202 npm run test:landing-version --prefix front` — **PASS** (regression smoke).

**Product:** Optional manual spot-check on **https://satisfecho.de/feedback/1** (and with a real reservation token if available); close **#67** when product agrees.

---

## Testing instructions

1. **Primary:** With app reachable (e.g. Docker dev on **4202**), from repo root:
   `BASE_URL=http://127.0.0.1:4202 npm run test:feedback-public-i18n --prefix front`  
   Expect exit **0** and log lines ending with “no FEEDBACK.* leaks” / “Invalid tenant … OK”.
2. **Regression:** `BASE_URL=http://127.0.0.1:4202 npm run test:landing-version --prefix front` — exit **0**.
3. **Manual (optional):** Open `/feedback/1`, cycle language picker; repeat with `?token=…`; open `/feedback/0` and confirm error strings are translated, not raw keys.
4. **Production (optional):** Same checks on **satisfecho.de** if verifying before closing **#67**.
