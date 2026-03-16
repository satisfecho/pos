#!/usr/bin/env bash
# Reset tenant 1 demo data (remove existing orders and reservations) and re-seed.
# Run from repo root on the server, e.g. amvara9:
#   cd /development/pos && bash scripts/reset-demo-data-on-server.sh
# Or via SSH:
#   ssh user@amvara9 "cd /development/pos && bash scripts/reset-demo-data-on-server.sh"
#
# Requires: config.env and running containers (docker compose up -d).

set -e
cd "$(dirname "$0")/.."
echo "Resetting demo data for tenant 1 and re-seeding orders + reservations..."
docker compose --env-file config.env -f docker-compose.yml -f docker-compose.prod.yml exec -T back python -m app.seeds.reset_demo_data
echo "Done."
