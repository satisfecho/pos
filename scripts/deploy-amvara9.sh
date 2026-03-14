#!/usr/bin/env bash
# Deploy script for amvara9. Run from repo root on the server (e.g. /development/pos2).
# Usage: cd /development/pos2 && bash deploy-amvara9.sh
# Or from CI: ssh server "cd /development/pos2 && bash -s" < scripts/deploy-amvara9.sh

set -e
# Expect to be run from repo root on server, e.g. cd /development/pos2 && bash -s
echo "Deploy path: $(pwd)"
if [ ! -f config.env ]; then
  echo "Error: config.env not found. Create it from config.env.example on the server."
  exit 1
fi

echo "Stopping existing containers..."
docker compose --env-file config.env -f docker-compose.yml -f docker-compose.prod.yml down || true
echo "Waiting for ports to be released..."
sleep 10

echo "Building back image first..."
docker compose --env-file config.env -f docker-compose.yml -f docker-compose.prod.yml build back

echo "Starting all services..."
if ! docker compose --env-file config.env -f docker-compose.yml -f docker-compose.prod.yml up --build -d; then
  echo "First up failed (possible port race); waiting 10s and retrying..."
  sleep 10
  docker compose --env-file config.env -f docker-compose.yml -f docker-compose.prod.yml up -d
fi

echo "Waiting for back to be ready..."
sleep 15

echo "Running migrations..."
docker compose --env-file config.env exec -T back python -m app.migrate || true

echo "Deploy done."
