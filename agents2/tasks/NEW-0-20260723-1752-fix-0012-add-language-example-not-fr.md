# Fix docs/0012 “add a new language” example (fr already ships)

## GitHub Issues
- **Issue:** (none — enhancement reviewer)
- **0**

## Problem / goal

**`docs/0012-translation-implementation.md`** § “How to Add a New Language” still walks through creating **`front/public/i18n/fr.json`** and registering **`fr`** as if French were not supported. French (and Bulgarian) already ship and appear in §4 Supported Languages. Contributors following the example invent a duplicate language path or think `fr` is unfinished.

## Evidence (008 preflight / review)

- Weekly sweep 2026-07-23T17:52Z: docs SIGNAL basenames owned; i18n leaf-gap NEWs already queued for fr/bg/de/es/ca/zh-CN/hi — **none** retarget the 0012 how-to example
- §4 lists **fr** and **bg**; §6 still says “e.g., French - `fr`” and “Create `front/public/i18n/fr.json`”
- On disk: `front/public/i18n/fr.json` exists; `LanguageService` already includes `fr`
- Out of scope: leaf backfills (**`NEW-0-20260723-1648-backfill-fr-i18n-missing-keys`** and siblings); Urdu RTL section (already current)

## High-level instructions for coder

- In **`docs/0012-translation-implementation.md`** §6 only, replace the French/`fr` walkthrough with a **hypothetical** unused code (e.g. `pt` / Portuguese or `it` / Italian) so the steps stay copy-pasteable without colliding with shipped locales
- Keep §4 Supported Languages list as-is unless a shipped locale is missing (do not remove fr/bg)
- One-line note that `fr` / `bg` already ship is optional
- No product code; no i18n JSON edits in this task
- Pass/fail: `rg -n 'fr\.json|French - \`fr\`' docs/0012-translation-implementation.md` no longer treats fr as the “new language” recipe; example code uses a non-shipped locale
