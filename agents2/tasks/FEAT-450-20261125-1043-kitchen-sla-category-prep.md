# Kitchen SLA: category / product expected prep (#450 slice 3)

## GitHub Issues
- **Issue:** https://github.com/satisfecho/pos/issues/450
- **450**
- Related: https://github.com/satisfecho/pos/issues/53

## Problem / goal
Slices 1-2 of Kitchen SLAs shipped and closed (placed HH:MM, Fresh/At risk/Overdue badges, urgent toggle; see archived `CLOSED-450-20261125-0917-roadmap-kitchen-slas.md`). Remaining roadmap work: **category / product expected prep times** so tickets can use starter-vs-main (or per-product) SLA clocks instead of only flat tenant timer thresholds. Documented as still open in `docs/0015-kitchen-display.md`.

## High-level instructions for coder
- Read `docs/0015-kitchen-display.md` (Still open / follow-up), `docs/0032-github-issues-roadmap.md` (#53), and the archived CLOSED-450 task for what already shipped. Reuse existing kitchen/bar display and `/tenant/kitchen-display-settings`; do not rebuild stations.
- Before coding, confirm product decisions on #450 (post **one** waiting-for-human comment if unanswered): absolute expected minutes vs % of expected; how multi-item tickets pick an SLA (max line, sum, primary category). Do not invent unilaterally.
- When design is clear: add owner/admin-scoped expected prep config (category and/or product), wire kitchen age/SLA to that config with safe fallback to current 5/10/15 defaults, update i18n, and extend kitchen timer / display smoke or unit coverage.
- Keep multi-tenant scoping; work on **`development`**.

## Status
- Follow-up to CLOSED-450 slices 1-2.
- **Blocked - waiting for human:** Need product decisions on #450 for kitchen SLA slice 3 (absolute expected minutes vs % of expected; multi-item ticket SLA = max line, sum, or primary category). Do not invent unilaterally.
- **Waiting notice posted:** 2026-11-25T10:45:16Z
