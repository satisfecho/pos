#!/usr/bin/env bash
# Deploy script for amvara9. Run from repo root on the server (e.g. /development/pos).
# Usage: cd /development/pos && bash deploy-amvara9.sh
# Or from CI: ssh server "cd /development/pos && bash -s" < scripts/deploy-amvara9.sh
#
# This script does NOT run remove_extra_tenants. That seed deletes all tenants except
# Cobalto and their users (including demo account ralf@roeber.de). Run it only if you
# intentionally want a single-tenant (Cobalto-only) server.
#
# Before any deploy steps, a full DB backup is taken (pg_dump) to BACKUP_DIR (default
# ./backups). Only the last BACKUP_RETAIN backups are kept (default 10). Set these
# env vars on the server to override.

set -e
# Expect to be run from repo root on server, e.g. cd /development/pos && bash -s
echo "Deploy path: $(pwd)"
if [ ! -f config.env ]; then
  echo "Creating config.env from config.env.example (virgin deploy)..."
  cp config.env.example config.env
  SK=$(openssl rand -hex 32)
  RK=$(openssl rand -hex 32)
  sed -i.bak "s/SECRET_KEY=CHANGE_THIS_TO_A_RANDOM_SECRET_KEY_IN_PRODUCTION/SECRET_KEY=$SK/" config.env
  sed -i.bak "s/REFRESH_SECRET_KEY=CHANGE_THIS_TO_ANOTHER_RANDOM_SECRET_IN_PRODUCTION/REFRESH_SECRET_KEY=$RK/" config.env
  rm -f config.env.bak
  echo "Generated SECRET_KEY and REFRESH_SECRET_KEY."
fi

# Backup database before any deployment steps so we never lose data
BACKUP_DIR="${BACKUP_DIR:-./backups}"
BACKUP_RETAIN="${BACKUP_RETAIN:-10}"
mkdir -p "$BACKUP_DIR"
if docker compose --env-file config.env -f docker-compose.yml -f docker-compose.prod.yml ps -q db 2>/dev/null | head -1 | grep -q .; then
  BACKUP_FILE="${BACKUP_DIR}/pos_backup_$(date -u +%Y%m%d_%H%M%S).sql"
  echo "Creating database backup: ${BACKUP_FILE}"
  if docker compose --env-file config.env -f docker-compose.yml -f docker-compose.prod.yml exec -T db sh -c 'pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB"' > "$BACKUP_FILE"; then
    echo "Backup created ($(wc -c < "$BACKUP_FILE") bytes)."
    # Retain only the last BACKUP_RETAIN backups
    (cd "$BACKUP_DIR" && ls -t pos_backup_*.sql 2>/dev/null | tail -n +$((BACKUP_RETAIN + 1)) | while read -r f; do rm -f "$f"; done)
  else
    echo "::error::Database backup failed. Aborting deploy to avoid data loss."
    exit 1
  fi
else
  echo "Database container not running; skipping backup (virgin or first deploy)."
fi

echo "Stopping existing containers..."
docker compose --env-file config.env -f docker-compose.yml -f docker-compose.prod.yml down --remove-orphans || true
echo "Force-remove haproxy container if present (avoids port 4202 already in use)..."
docker rm -f pos-haproxy 2>/dev/null || true
echo "Waiting for ports to be released..."
sleep 10

echo "Building back image first..."
docker compose --env-file config.env -f docker-compose.yml -f docker-compose.prod.yml build back

echo "Building front image (no cache) so deployed assets match current code..."
docker compose --env-file config.env -f docker-compose.yml -f docker-compose.prod.yml build --no-cache front

echo "Starting all services (force-recreate so front uses new image)..."
if ! docker compose --env-file config.env -f docker-compose.yml -f docker-compose.prod.yml up -d --force-recreate; then
  echo "First up failed (possible port race); waiting 10s and retrying..."
  sleep 10
  docker compose --env-file config.env -f docker-compose.yml -f docker-compose.prod.yml up -d --force-recreate
fi

echo "Waiting for back to be ready..."
sleep 15

echo "Verifying front serves version in landing page..."
docker compose --env-file config.env -f docker-compose.yml -f docker-compose.prod.yml exec -T front grep -oE 'name="app-version"[^>]*content="[^"]*"' /usr/share/nginx/html/index.html 2>/dev/null || true

# Back container runs as uid 1000; catalog imports need to write to back/uploads
mkdir -p back/uploads back/uploads/providers
chown -R 1000:1000 back/uploads 2>/dev/null || sudo chown -R 1000:1000 back/uploads 2>/dev/null || true

echo "Running migrations..."
docker compose --env-file config.env exec -T back python -m app.migrate || true

echo "Bootstrap demo (virgin: create tenant 1 + tables + products; no-op if tenants exist)..."
docker compose --env-file config.env exec -T back python -m app.seeds.bootstrap_demo || true

echo "Seeding demo tables for any tenant missing tables (T01–T10)..."
docker compose --env-file config.env exec -T back python -m app.seeds.seed_demo_tables || true

echo "Seeding demo products for any tenant missing products..."
docker compose --env-file config.env exec -T back python -m app.seeds.seed_demo_products || true

echo "Seeding demo orders for tenant 1 (Reports; idempotent)..."
docker compose --env-file config.env exec -T back python -m app.seeds.seed_demo_orders || true

echo "Seeding demo reservations for tenant 1 (Reports; idempotent)..."
docker compose --env-file config.env exec -T back python -m app.seeds.seed_demo_reservations || true

echo "Seeding catalog (beer, pizza, wine) so Catalog matches development..."
docker compose --env-file config.env exec -T back python -m app.seeds.beer_import || true
docker compose --env-file config.env exec -T back python -m app.seeds.pizza_import || true
docker compose --env-file config.env exec -T back python -m app.seeds.wine_import || true

echo "Linking demo products to catalog so /products page has images..."
docker compose --env-file config.env exec -T back python -m app.seeds.link_demo_products_to_catalog || true

echo "Deploy done."
