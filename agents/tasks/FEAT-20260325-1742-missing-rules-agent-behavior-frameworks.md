# Missing rules to improve agent behavior across frameworks and technologies

## GitHub

- **Issue:** https://github.com/satisfecho/pos/issues/98

## Problem / goal

There is no structured, repo-wide guidance for agents on framework-specific best practices beyond what already exists in `AGENTS.md` and `.cursor/rules/`. That can lead to inconsistent patterns when touching Angular (front), FastAPI/SQLModel (back), Docker/Compose, and operational docs.

The issue asks for a **curated, organized, extensible** rule set (with optional inspiration from public Cursor-rules collections) covering common stacks, with clear acceptance criteria: actionable docs, categories (e.g. frontend, backend, testing, performance), and easy maintenance.

**In this repository**, prioritize rules that match the **actual stack** (Angular, Python/FastAPI, PostgreSQL, Docker, HAProxy, Puppeteer smoke tests) rather than copying unrelated frameworks wholesale.

## High-level instructions for coder

- Audit existing agent guidance: `AGENTS.md`, `.cursor/rules/*.mdc`, `docs/agent-loop.md`, and `agents/tasks/README.md`; identify gaps vs. the issue’s acceptance criteria without duplicating verbose content.
- Propose and add **focused** Cursor rules (or expand existing ones) for: Angular/front (build checks, i18n, patterns), FastAPI/back (migrations, API contracts, SQLModel), Docker/testing (smoke tests, log order), and security/ops where agents often drift.
- Keep rules **short, imperative, and verifiable**; link to deeper `docs/` pages instead of inlining long policy in every rule file.
- Optionally cite or summarize patterns from trusted external lists (issue body) only where they clearly apply to this repo; avoid boilerplate rules for stacks we do not use.
- Update `AGENTS.md` or `docs/` only if needed so humans know where rules live and how to extend them; follow the repo’s branching/changelog conventions if user-facing docs change materially.
