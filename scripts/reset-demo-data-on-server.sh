#!/usr/bin/env bash
# Reset tenant 1 demo data (remove existing orders and reservations) and re-seed.
# Safe while the stack is up; scoped to DEMO_TENANT_ID=1 only (idempotent).
#
# Manual (from repo root on the server, e.g. amvara9):
#   cd /development/pos && ./scripts/reset-demo-data-on-server.sh
# Or via SSH:
#   ssh amvara9 "cd /development/pos && ./scripts/reset-demo-data-on-server.sh"
#
# Daily cron (UTC) — see docs/0001-ci-cd-amvara9.md:
#   0 4 * * * cd /development/pos && ./scripts/reset-demo-data-on-server.sh >>/var/log/pos-demo-reset.log 2>&1
#
# Requires: config.env and running containers (docker compose up -d).

set -e
cd "$(dirname "$0")/.."
echo "Resetting demo data for tenant 1 and re-seeding orders + reservations..."
docker compose --env-file config.env -f docker-compose.yml -f docker-compose.prod.yml exec -T back python -m app.seeds.reset_demo_data
echo "Done."
