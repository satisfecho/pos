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

## Coder notes (2026-03-25 UTC)

- Added **`.cursor/rules/angular-ngx-translate.mdc`** (`front/**`) — translation keys + all `public/i18n/*.json` files.
- Added **`.cursor/rules/fastapi-sqlmodel-backend.mdc`** (`back/**`) — migrations, models, API/tenant discipline, pytest in Docker.
- Added **`.cursor/rules/docker-compose-haproxy.mdc`** (`docker-compose*.yml`) — `-f` pairs, HAProxy as browser entry, smoke pointer.
- Added **`.cursor/rules/security-secrets-tenant.mdc`** (always apply) — secrets via `config.env`, tenant boundaries, mail rule cross-ref.
- Added **`docs/agent-cursor-rules.md`** — categorized catalog + how to extend; linked from **`AGENTS.md`** and **`docs/agent-loop.md`**.
- Existing rules (build logs, smoke test, error log order, git workflow, etc.) left as-is to avoid duplication.

## Testing instructions

### What to verify

- New rule files exist under **`.cursor/rules/`** with valid frontmatter and no contradictory guidance vs **`AGENTS.md`**.
- **`docs/agent-cursor-rules.md`** lists every `*.mdc` and matches the repo.
- **`CHANGELOG.md`** `[Unreleased]` mentions the change (GitHub #98).

### How to test

- `ls .cursor/rules/*.mdc` and spot-check contents.
- Optional: `grep -l 'agent-cursor-rules' AGENTS.md docs/agent-loop.md` (both should reference the catalog).

### Pass / fail criteria

- **Pass:** All of the above; filenames and globs are consistent; no broken internal links in the new doc (paths use repo-relative names as elsewhere).
- **Fail:** Missing file, wrong glob, or catalog omitting a current rule.

---

## Test report

1. **Date/time (UTC) and log window:** 2026-03-25 17:49 UTC (approx. 17:42–17:50 UTC for this run).
2. **Environment:** Repo at `development` @ `672fb56`; verification static (no compose up). `BASE_URL`: N/A — no browser. Compose files: N/A for this task.
3. **What was tested:** Per “What to verify” and “How to test” in this file.
4. **Results:**
   - New `.cursor/rules/*.mdc` present with valid YAML frontmatter — **PASS** — `ls` shows 12 files; spot-checked `angular-ngx-translate.mdc`, `fastapi-sqlmodel-backend.mdc`, `docker-compose-haproxy.mdc`, `security-secrets-tenant.mdc` (description/globs/alwaysApply consistent with siblings).
   - No contradictory guidance vs `AGENTS.md` (compose `-f` pair, HAProxy port, Docker pytest, i18n paths) — **PASS** — manual cross-read.
   - `docs/agent-cursor-rules.md` lists every `*.mdc` and matches repo — **PASS** — table enumerates 12 rules; `ls .cursor/rules/*.mdc` count = 12 and names match table one-for-one.
   - `CHANGELOG.md` `[Unreleased]` mentions change (GitHub #98) — **PASS** — line cites Agent Cursor rules and #98.
   - `grep` / optional: `AGENTS.md` and `docs/agent-loop.md` reference `docs/agent-cursor-rules.md` — **PASS** — both contain `agent-cursor-rules`.
   - Internal links in new doc — **PASS** — paths are repo-relative (`AGENTS.md`, `docs/agent-loop.md`, `.cursor/rules/`, etc.) and files exist.
5. **Overall:** **PASS**
6. **Product owner feedback:** The stack-specific Cursor rules and the catalog give agents a single place to see what applies to Angular, backend, Docker, and security without rereading all of `AGENTS.md`. Changelog and cross-links make the addition discoverable for humans; no code paths were exercised because the deliverable is documentation and rule metadata only.
7. **URLs tested:** N/A — no browser.
8. **Relevant log excerpts:** N/A — documentation/rules verification only; no container traffic for this acceptance scope.

**GitHub:** Comment posted on issue #98 (verification started). Label `agent:testing` could not be applied (`gh issue edit` reported label not found in repo); create the label in GitHub settings if the team wants it.
