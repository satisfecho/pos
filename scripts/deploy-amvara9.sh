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
COMPOSE_OPTS="--env-file config.env -f docker-compose.yml -f docker-compose.prod.yml"
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
if docker compose $COMPOSE_OPTS ps -q db 2>/dev/null | head -1 | grep -q .; then
  BACKUP_FILE="${BACKUP_DIR}/pos_backup_$(date -u +%Y%m%d_%H%M%S).sql"
  echo "Creating database backup: ${BACKUP_FILE}"
  if docker compose $COMPOSE_OPTS exec -T db sh -c 'pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB"' > "$BACKUP_FILE"; then
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

# Build while current stack is still running so downtime is only for the switch (down → migrate → up).
echo "Building back image first..."
docker compose $COMPOSE_OPTS build back

echo "Remove existing front image so build is not skipped..."
docker compose $COMPOSE_OPTS images -q front 2>/dev/null | while read -r id; do docker rmi -f "$id" 2>/dev/null || true; done
# Pass git commit hash so UI shows real hash (build context has no .git)
export COMMIT_HASH=$(git rev-parse --short HEAD 2>/dev/null || echo '')
echo "Building front image (no cache) with COMMIT_HASH=$COMMIT_HASH..."
docker compose $COMPOSE_OPTS build --no-cache front

echo "Ensure certbot dirs exist (webroot for certbot, haproxy-certs for combined PEM; see certbot/README.md)..."
mkdir -p certbot/www certbot/haproxy-certs

echo "Stopping existing containers (downtime starts here)..."
docker compose $COMPOSE_OPTS down --remove-orphans || true
echo "Force-remove haproxy container if present (avoids port 4202 already in use)..."
docker rm -f pos-haproxy 2>/dev/null || true
echo "Waiting for ports to be released..."
sleep 10

echo "Starting db and redis only for migrations..."
docker compose $COMPOSE_OPTS up -d db redis
echo "Waiting for db to be healthy..."
for i in 1 2 3 4 5 6 7 8 9 10; do
  if docker compose $COMPOSE_OPTS exec -T db pg_isready -U pos -d pos 2>/dev/null; then break; fi
  [ "$i" -eq 10 ] && (echo "DB not ready in time"; exit 1)
  sleep 2
done

echo "Running migrations (before app serves traffic)..."
docker compose $COMPOSE_OPTS run --rm back python -m app.migrate || true
echo "Running migration sync (repair if schema_version was wrong)..."
docker compose $COMPOSE_OPTS run --rm back python -m app.migrate --sync-idempotent || true

echo "Starting all services (force-recreate so front uses new image)..."
if ! docker compose $COMPOSE_OPTS up -d --force-recreate; then
  echo "First up failed (possible port race); waiting 10s and retrying..."
  sleep 10
  docker compose $COMPOSE_OPTS up -d --force-recreate
fi

echo "Waiting for back to be ready..."
sleep 15

# Verify back serves upload routes (explicit routes fix menu/catalog/product images; see docs/0027-amvara9-menu-images-troubleshooting.md)
echo "Verifying back has upload image routes..."
if docker compose $COMPOSE_OPTS exec -T back python3 -c "
import sys, urllib.request
try:
    urllib.request.urlopen(urllib.request.Request('http://localhost:8020/uploads/1/products/__deploy_check__.jpg', method='GET'), timeout=5)
except urllib.error.HTTPError as e:
    body = e.read().decode()
    if e.code == 404 and ('Image not found' in body or 'Invalid filename' in body):
        sys.exit(0)  # Route is present
    sys.exit(1)
except Exception:
    sys.exit(2)
" 2>/dev/null; then
  echo "Back upload routes OK (menu/product images will be served)."
else
  echo "Warning: Back may be missing explicit upload routes; menu/catalog images could 404. See docs/0027-amvara9-menu-images-troubleshooting.md"
fi

echo "Verifying front serves version in landing page..."
docker compose $COMPOSE_OPTS exec -T front grep -oE 'name="app-version"[^>]*content="[^"]*"' /usr/share/nginx/html/index.html 2>/dev/null || true

# Back container runs as uid 1000; catalog imports need to write to back/uploads
mkdir -p back/uploads back/uploads/providers
chown -R 1000:1000 back/uploads 2>/dev/null || sudo chown -R 1000:1000 back/uploads 2>/dev/null || true

echo "Bootstrap demo (virgin: create tenant 1 + tables + products; no-op if tenants exist)..."
docker compose $COMPOSE_OPTS exec -T back python -m app.seeds.bootstrap_demo || true

echo "Seeding demo tables for any tenant missing tables (T01–T10)..."
docker compose $COMPOSE_OPTS exec -T back python -m app.seeds.seed_demo_tables || true

echo "Seeding demo products for any tenant missing products..."
docker compose $COMPOSE_OPTS exec -T back python -m app.seeds.seed_demo_products || true

echo "Seeding demo orders for tenant 1 (Reports; idempotent)..."
docker compose $COMPOSE_OPTS exec -T back python -m app.seeds.seed_demo_orders || true

echo "Seeding demo reservations for tenant 1 (Reports; idempotent)..."
docker compose $COMPOSE_OPTS exec -T back python -m app.seeds.seed_demo_reservations || true

echo "Seeding catalog (beer, pizza, wine) so Catalog matches development..."
docker compose $COMPOSE_OPTS exec -T back python -m app.seeds.beer_import || true
docker compose $COMPOSE_OPTS exec -T back python -m app.seeds.pizza_import || true
docker compose $COMPOSE_OPTS exec -T back python -m app.seeds.wine_import || true

echo "Linking demo products to catalog so /products page has images..."
docker compose $COMPOSE_OPTS exec -T back python -m app.seeds.link_demo_products_to_catalog || true

echo "Deploy done."
