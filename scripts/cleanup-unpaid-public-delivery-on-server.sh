#!/usr/bin/env bash
# Cancel abandoned unpaid public Satisfecho Delivery checkouts past the TTL (all tenants).
# Idempotent; does not touch staff-created delivery orders or re-notify kitchen.
#
# Manual (from repo root on the server, e.g. amvara9):
#   cd /development/pos && ./scripts/cleanup-unpaid-public-delivery-on-server.sh
# Dry-run:
#   cd /development/pos && ./scripts/cleanup-unpaid-public-delivery-on-server.sh --dry-run
# Or via SSH:
#   ssh amvara9 "cd /development/pos && ./scripts/cleanup-unpaid-public-delivery-on-server.sh"
#
# Host cron (UTC) — see docs/0001-ci-cd-amvara9.md (separate from tenant-1 demo reset):
#   15 * * * * cd /development/pos && ./scripts/cleanup-unpaid-public-delivery-on-server.sh >>/var/log/pos-unpaid-public-delivery-cleanup.log 2>&1
#
# Requires: config.env and running containers (docker compose up -d).
# Extra args (e.g. --dry-run, --ttl-hours 4) are passed through to the Python module.

set -e
cd "$(dirname "$0")/.."
echo "Cleaning up unpaid public Satisfecho Delivery orders past TTL..."
docker compose --env-file config.env -f docker-compose.yml -f docker-compose.prod.yml exec -T back \
  python -m app.seeds.cleanup_unpaid_public_delivery "$@"
echo "Done."
