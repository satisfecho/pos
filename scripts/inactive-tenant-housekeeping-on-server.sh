#!/usr/bin/env bash
# Inactive tenant housekeeping (#442): warn after 30d, soft-delete after +7d, hard-delete after +60d.
# Skips demo tenant id 1 unless --include-demo is passed.
#
# Manual (from repo root on the server, e.g. amvara9):
#   cd /development/pos && ./scripts/inactive-tenant-housekeeping-on-server.sh
# Dry-run:
#   cd /development/pos && ./scripts/inactive-tenant-housekeeping-on-server.sh --dry-run
#
# Suggested host cron (UTC daily):
#   25 4 * * * cd /development/pos && ./scripts/inactive-tenant-housekeeping-on-server.sh >>/var/log/pos-inactive-tenant-housekeeping.log 2>&1
#
# Requires: config.env and running containers. Extra args are passed through to the Python module.

set -e
cd "$(dirname "$0")/.."
echo "Running inactive tenant housekeeping..."
docker compose --env-file config.env -f docker-compose.yml -f docker-compose.prod.yml exec -T back \
  python -m app.seeds.inactive_tenant_housekeeping "$@"
echo "Done."
