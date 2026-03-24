# Feedback page needs translation — verification & GitHub close loop

## GitHub
- **Issue:** https://github.com/satisfecho/pos/issues/67

## Problem / goal
Issue **#67** is still **open** on GitHub, but implementation and tester **PASS** are already archived in `agents/tasks/done/2026/03/23/CLOSED-20260323-2214-feedback-page-needs-translation.md` (public feedback URL i18n). Goal: confirm the fix still holds, align GitHub state with delivery (comment / close when product agrees), and only implement further i18n if QA finds real gaps.

## High-level instructions for coder
- Read the **CLOSED-20260323-2214-…** archive for acceptance criteria and test notes; do not redo work that already passed unless you find a regression or missing string.
- On the dev stack (e.g. HAProxy `http://127.0.0.1:4202`), spot-check `/feedback/1` (or valid tenant) with the language picker — same locales as in the CLOSED task if possible.
- If everything matches the issue: add a short GitHub comment on **#67** summarizing verification and ask to close (or close if you have permission). If **`gh`** is unavailable from the environment, note that for the human operator per `docs/agent-loop.md`.
- If any copy is still untranslated or wrong: fix using existing Angular i18n patterns; extend tests only if the CLOSED task’s automated checks need updating.
- Optional: compare behaviour on production URL from the issue body if credentials / policy allow; treat prod-only gaps as follow-up only if they differ from dev.
