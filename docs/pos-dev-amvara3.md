# POS development on amvara3

Date: 2026-10-03  
Updated: 2026-11-21

## Browser

Open:

https://pos-dev.157.90.66.148.sslip.io/

The host HAProxy on amvara3 sends that name to the POS dev proxy. HTTP redirects to HTTPS. The certificate is Let's Encrypt.

`pos-dev.amvara.de` is not in DNS. The Joker API key in use cannot write the zone. `sslip.io` resolves to the amvara3 address, so no DNS change was required.

## Where it runs

| Item | Value |
| --- | --- |
| Host | amvara3 |
| Code | `/home/amvara/projects/pos` |
| Branch | `development` |
| Compose | `docker-compose.yml` + `docker-compose.dev.yml` + `docker-compose.amvara3.yml` |
| POS proxy | `127.0.0.1:14202` (not published on the public interface) |
| Host route | HAProxy backend `pos_dev` |

`docker-compose.amvara3.yml` is only on the server. It is listed in `.git/info/exclude`. It publishes the POS HAProxy on `127.0.0.1:14202` and does not bind host ports 80 or 443.

`config.env` and `.secrets` are copies on the server. `API_URL` is `/api`. `WS_URL` is empty, so the browser uses the same host.

## Demo data

Tenant 1 is **Demo Restaurant**. It has tables T01–T10 and the demo products. Register on the site to join that tenant.

## Agent loop

The loop is running on amvara3 with `AGENT_PROMOTE=0`. This host does not merge `development` into `master`.

| Item | Value |
| --- | --- |
| Process | `bash agents2/pos-cursor-loop.sh` (pid file below) |
| Log | `/home/amvara/projects/pos/tmp/pos-cursor-loop.log` |
| Pid file | `/home/amvara/projects/pos/tmp/pos-cursor-loop.pid` |
| Preflight digests | `/tmp/pos-agent-loop/` (e.g. `001-latest-context.txt`) |

**Not on the Mac laptop.** The local `tmp/pos-cursor-loop.log` on a developer notebook can be months stale. Treat amvara3 as the live agent host.

### Incident 2026-11-21 - why GitHub issues were not picked up

Symptom: open issue [#447](https://github.com/satisfecho/pos/issues/447) (`FEAT: trabaja con nosotros`) stayed without `agent:planned` and without `agents2/tasks/FEAT-447-*.md`.

Root cause: the agent worktree on amvara3 had **unresolved git conflict markers** left from a failed `git pull --autostash` / stash apply (files: `docs/agent-loop.md`, `config.env.example`, `agents2/008-enhancement-reviewer/last-scan.json`). Conflict state dated ~2026-11-10.

Effect:

1. Every step that calls `git-sync-development.sh` failed with `Pulling is not possible because you have unmerged files`.
2. **001** (GitHub → `FEAT`) preflight still saw `UNTRACKED_IN_TASKS issue #447`, but the step **skipped invoke** after sync failure.
3. Feature coding / committer / etc. also skipped for the same reason.
4. The shell loop process itself stayed alive (pid ~48 days) and only slept 5 minutes between failed cycles - it was **stuck**, not dead.

Fix applied 2026-11-21: resolve conflicts (keep upstream hunks), drop conflicted/stale stashes, `git pull --rebase` to tip of `origin/development`. After that, sync succeeded again (008 ran). Next healthy **001** cycle (19:10 CET) created `agents2/tasks/FEAT-447-20261121-1811-trabaja-con-nosotros.md`.

Still parked on purpose: `FEAT-388-…` remains **waiting for human** (design gate). That alone does not block 001 from filing new issues.

### Prevention (after 2026-11-21)

| Guard | What it does |
| --- | --- |
| `scripts/git-sync-development.sh` | Drops stamp-only local dirt before pull; on unmerged paths exits 2 and writes `tmp/agent-git-sync-blocked.txt` |
| `scripts/watchdog-pos-cursor-loop.sh` | If the block stamp is older than `AGENT_GIT_SYNC_BLOCK_ALERT_MINUTES` (default 30), logs CRITICAL and opens one GitHub issue (`agent-loop-blocker: git-sync`) |
| Cron / systemd install | Keep the 5-minute watchdog on the agent host so a live pid alone is not "healthy" |

On amvara3 (2026-11-21): root crontab runs the watchdog every 5 minutes:

`*/5 * * * * cd /home/amvara/projects/pos && ./scripts/watchdog-pos-cursor-loop.sh >>/home/amvara/projects/pos/tmp/pos-cursor-loop-watchdog.log 2>&1`

Do not treat "loop pid exists" as proof that issues are being queued. Check `./scripts/watchdog-pos-cursor-loop.sh --status` for `git_sync_block=`.

## Leave these alone

Host HAProxy also serves Redmine. Do not bind POS to ports 80 or 443. Reload HAProxy only after `haproxy -c` succeeds.
