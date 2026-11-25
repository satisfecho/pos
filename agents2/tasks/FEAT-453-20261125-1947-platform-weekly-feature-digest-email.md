# Platform weekly feature digest email to signups

## GitHub Issues
- **Issue:** https://github.com/satisfecho/pos/issues/453
- **453**

## Status
- **Blocked - waiting for human:** Audience, consent/unsubscribe, content source, platform SMTP sender, and locale are not decided on #453. Do not invent those unilaterally.
- **Waiting notice posted:** 2026-11-25T19:43:49Z
- **Restored:** Previous FEAT for #453 was missing from `agents2/tasks/` (orphaned `agent:planned` + waiting comment). Recreated so waiting-human preflight and feature coders stay consistent.

## Problem / goal
Send restaurant owners (recent sign-ups and/or opted-in tenants) a once-per-week email with new Satisfecho features to improve activation after signup. Out of scope for v1: per-tenant guest marketing (Settings → Newsletter).

Related docs: `docs/0059-platform-operator-portal.md`, `docs/0092-platform-operator-insights.md`, `docs/0079-newsletter.md` (different audience).

## High-level instructions for coder
- Do **not** build until product answers the open decisions on #453 (audience, consent/unsubscribe, content source, sender, locale).
- When unblocked: implement a minimal platform-owned weekly digest using platform SMTP (not tenant newsletter SMTP), with honor of opt-out, and content from the agreed source (manual or CHANGELOG / closed FEATs).
- Keep tenant scoping and PII out of logs; no `@example.com` recipients; no secrets in commits.
- Work on **`development`**. Add smoke or unit coverage appropriate to the mail path once decisions land.
- Do not paste secrets, tokens, or full `.env` into the task file or commits.
