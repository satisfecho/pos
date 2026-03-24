# Feedback page needs translation

## GitHub

- **Issue:** https://github.com/satisfecho/pos/issues/67

## Problem / goal

Public feedback URLs (e.g. `/feedback/{tenant}` with token) must show the full form in the user’s selected language. Reporter noted untranslated strings when opening the page with a language selected.

Delivery and tester **PASS** are already archived:

- `agents/tasks/done/2026/03/23/CLOSED-20260323-2214-feedback-page-needs-translation.md`
- `agents/tasks/done/2026/03/24/CLOSED-20260324-0133-feedback-page-needs-translation-close-loop.md`
- `agents/tasks/done/2026/03/24/CLOSED-20260324-0145-feedback-page-needs-translation-github-housekeeping.md` (includes `de.json` fix)

Issue **#67** is still **OPEN** on GitHub; primary remaining work is **process/GitHub alignment** (comment, labels, close when product agrees). Only implement further i18n if QA finds real gaps.

## High-level instructions for coder

- Re-read the three **CLOSED** archives above; treat them as the baseline unless new regressions appear.
- Optional quick smoke: public feedback route with language picker (locales already exercised in archives); confirm no missing keys or invalid locale JSON.
- Use **`gh`** (or a human with **Issues** write) on **#67**: post a short verification / closing comment, adjust labels per `docs/agent-loop.md`, and **close** the issue when product accepts. If automation token cannot comment (known `addComment` / `addLabelsToLabelable` restriction), document the handoff and stop after code/QA is confirmed.
- Do not duplicate large i18n implementation unless the issue scope is explicitly expanded on GitHub.
