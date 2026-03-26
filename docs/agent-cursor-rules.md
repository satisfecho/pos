# Cursor rules for agents (POS stack)

This repository uses **`.cursor/rules/*.mdc`** to give agents short, verifiable guidance. **`AGENTS.md`** remains the long-form operator guide; rules focus on **what to do when editing** a given area.

## Categories

| Area | Rule file | When it applies |
|------|-----------|------------------|
| **Git / branches** | `.cursor/rules/git-development-branch-workflow.mdc` | Always (`development` vs `master`, push cadence, **sync before edits**: `scripts/git-sync-development.sh`) |
| **Commits / changelog** | `.cursor/rules/commit-changelog-version.mdc` | User asks to commit or release notes |
| **Docs before code** | `.cursor/rules/lookup-docs-before-new-code.mdc` | Always |
| **Errors / logs** | `.cursor/rules/error-investigation-workflow.mdc` | Debugging incidents |
| **Execution bias** | `.cursor/rules/prefer-do-dont-ask.mdc` | Always |
| **Angular build** | `.cursor/rules/angular-frontend-docker-logs.mdc` | Edits under `front/` |
| **Angular i18n** | `.cursor/rules/angular-ngx-translate.mdc` | Edits under `front/` (UI copy) |
| **Frontend smoke** | `.cursor/rules/front-smoke-test.mdc` | Edits under `front/` |
| **Backend API / DB** | `.cursor/rules/fastapi-sqlmodel-backend.mdc` | Edits under `back/` |
| **Docker / HAProxy** | `.cursor/rules/docker-compose-haproxy.mdc` | Edits to `docker-compose*.yml` |
| **Security / tenants** | `.cursor/rules/security-secrets-tenant.mdc` | Always |
| **Mail in tests** | `.cursor/rules/no-example-com-email.mdc` | Always |

## Adding or changing rules

1. Prefer **new focused `.mdc` files** (one topic) over huge catch-alls.
2. Use YAML frontmatter: **`description`**, and either **`globs`** or **`alwaysApply: true`** — mirror existing files in **`.cursor/rules/`**.
3. Keep bodies **short and imperative**; link **`docs/`** or **`AGENTS.md`** for long procedures.
4. Update **this table** when you add a rule so the catalog stays accurate.

## Related

- **`docs/agent-loop.md`** — multi-agent roles and task filenames.
- **`agents/tasks/README.md`** — task status pipeline (`wip`, `untested`, …).
