#!/bin/bash

# POS Application Runner
# Runs all services in Docker containers

set -e

# Function to show help
show_help() {
    cat << EOF
POS Application Runner

Usage: ./run.sh [OPTIONS]

Options:
    -h, --help          Show this help message
    -dev, --dev         Start in development mode (ng serve with hot reload)
                        Default: production mode (build and serve static files)
    -c, --clean         Remove all containers, volumes, and data
    --remove-all        Same as --clean
    --fix-perm          Fix file permissions in back/uploads
    --migrate           Run database migrations only (services must be running)
    --no-migrate        Skip automatic migration on startup

Examples:
    ./run.sh            Start in production mode (build and serve)
    ./run.sh -dev       Start in development mode (hot reload)
    ./run.sh --clean    Remove all containers and volumes
    ./run.sh --migrate  Run pending database migrations

Development Mode:
    - Frontend runs with 'ng serve' (hot reload enabled)
    - Backend runs with auto-reload
    - All services run in Docker containers
    - Migrations run automatically on startup

Production Mode:
    - Frontend is built and served as static files via nginx
    - Backend runs in container
    - Optimized for performance
    - Migrations run automatically on startup

EOF
    exit 0
}

# Function to cleanup background processes
cleanup() {
    echo ""
    echo "Shutting down services..."
    if [ "$DEV_MODE" = true ]; then
        docker compose $ENV_FILE down
    else
        docker compose $ENV_FILE -f docker-compose.yml -f docker-compose.prod.yml down
    fi
    exit 0
}

# Function to remove everything including volumes
remove_all() {
    echo "Removing all POS containers, volumes, and data..."
    
    # Check if config.env exists
    if [ ! -f "config.env" ]; then
        echo "WARNING: config.env not found, using defaults..."
        ENV_FILE=""
    else
        ENV_FILE="--env-file config.env"
    fi
    
    # Stop and remove containers with volumes
    echo "Stopping and removing containers..."
    docker compose $ENV_FILE down -v 2>/dev/null || true
    docker compose $ENV_FILE -f docker-compose.prod.yml down -v 2>/dev/null || true
    
    # Remove all POS-related volumes (more robust)
    echo "Removing volumes..."
    VOLUMES=$(docker volume ls --format "{{.Name}}" | grep -E "^pos_" || true)
    if [ -n "$VOLUMES" ]; then
        echo "$VOLUMES" | xargs docker volume rm 2>/dev/null || true
    fi
    
    # Remove any orphaned containers
    echo "Cleaning up orphaned containers..."
    CONTAINERS=$(docker ps -a --filter "name=pos-" --format "{{.ID}}" || true)
    if [ -n "$CONTAINERS" ]; then
        echo "$CONTAINERS" | xargs docker rm -f 2>/dev/null || true
    fi
    
    echo ""
    echo "All POS containers and volumes removed."
    echo "All data has been deleted. You'll need to recreate your database on next start."
    exit 0
}

# Function to fix upload permissions
fix_permissions() {
    echo "Fixing permissions for back/uploads..."
    if [ -d "back/uploads" ]; then
        # Check for any files owned by root (UID 0) recursively
        ROOT_OWNED=$(find back/uploads -user 0 2>/dev/null | head -1)
        if [ -n "$ROOT_OWNED" ]; then
            echo "Found files owned by root. Fixing ownership (may prompt for sudo password)..."
            sudo chown -R "$USER:$USER" back/uploads || {
                echo "ERROR: Failed to change ownership. Please run: sudo chown -R \$USER:\$USER back/uploads"
                exit 1
            }
            echo "Permissions fixed."
        else
            echo "back/uploads is already owned by $USER"
            echo "No permission issues found."
        fi
    else
        echo "Creating back/uploads/providers with correct ownership..."
        mkdir -p back/uploads/providers
        echo "Directories created."
    fi
    exit 0
}

# Function to run database migrations
run_migrations() {
    echo "Running database migrations..."
    
    # Check if config.env exists
    if [ ! -f "config.env" ]; then
        echo "WARNING: config.env not found, using defaults..."
        ENV_FILE=""
    else
        ENV_FILE="--env-file config.env"
    fi
    
    # Check if backend container is running
    if ! docker compose $ENV_FILE ps --status=running --services 2>/dev/null | grep -q "^back$"; then
        echo "ERROR: Backend container (pos-back) is not running."
        echo "Start the services first with: ./run.sh or ./run.sh -dev"
        exit 1
    fi
    
    # Run migrations inside the backend container
    docker compose $ENV_FILE exec back python -m app.migrate
    
    echo "Migrations complete."
}

# Function to run migrations only (standalone command)
run_migrations_only() {
    run_migrations
    exit 0
}

# Function to wait for database and run migrations in background
run_migrations_background() {
    local ENV_FILE="$1"
    
    echo "Waiting for database to be ready..."
    
    # Wait for backend to be healthy (max 60 seconds)
    local max_attempts=30
    local attempt=0
    local wait_seconds=2
    local max_wait=$((max_attempts * wait_seconds))
    local elapsed=0
    
    while [ $attempt -lt $max_attempts ]; do
        # Check if backend container exists and is running
        if docker compose $ENV_FILE ps --status=running --services 2>/dev/null | grep -q "^back$"; then
            # Try to run a simple health check
            if docker compose $ENV_FILE exec -T back python -c "from app.db import engine; engine.connect()" 2>/dev/null; then
                echo "Database is ready."
                break
            fi
        else
            echo "Waiting for backend container to start..."
        fi

        attempt=$((attempt + 1))
        elapsed=$((attempt * wait_seconds))
        echo "Still waiting for database... ${elapsed}s elapsed of ${max_wait}s"
        sleep "$wait_seconds"
    done
    
    if [ $attempt -eq $max_attempts ]; then
        echo "WARNING: Timeout waiting for database. Migrations may need to be run manually."
        echo "Run: ./run.sh --migrate"
        return 1
    fi
    
    # Run migrations
    echo "Running database migrations..."
    if docker compose $ENV_FILE exec -T back python -m app.migrate; then
        echo "Migrations applied successfully."
    else
        echo "WARNING: Migration failed. Check the logs and run manually if needed."
        echo "Run: ./run.sh --migrate"
    fi
}

# Parse command line arguments
DEV_MODE=false
ENV_FILE=""
SKIP_MIGRATE=false

while [[ $# -gt 0 ]]; do
    case $1 in
        -h|--help)
            show_help
            ;;
        -dev|--dev)
            DEV_MODE=true
            shift
            ;;
        -c|--clean|--remove-all)
            remove_all
            ;;
        --fix-perm|--fix-permissions)
            fix_permissions
            ;;
        --migrate)
            run_migrations_only
            ;;
        --no-migrate)
            SKIP_MIGRATE=true
            shift
            ;;
        *)
    echo "ERROR: Unknown option: $1"
            echo "Use -h or --help for usage information"
            exit 1
            ;;
    esac
done

# Set trap to cleanup on script exit
trap cleanup SIGINT SIGTERM

# Check if config.env exists
if [ ! -f "config.env" ]; then
    echo "ERROR: config.env not found. Copy config.env.example to config.env and edit if needed."
    exit 1
fi

ENV_FILE="--env-file config.env"

# Export UID and GID for Docker Compose (using different names because UID is readonly in bash)
# This ensures the backend container runs as the host user
export DOCKER_UID=$(id -u)
export DOCKER_GID=$(id -g)

# Pre-create upload directories with correct ownership
# This prevents Docker from creating them as root
if [ ! -d "back/uploads/providers" ]; then
    echo "Pre-creating back/uploads/providers directory..."
    mkdir -p back/uploads/providers
fi

# Determine which compose file to use
if [ "$DEV_MODE" = true ]; then
    echo "Starting POS Application in DEVELOPMENT mode..."
    COMPOSE_FILE=""
    MODE_DESC="Development (hot reload enabled)"
else
    echo "Starting POS Application in PRODUCTION mode..."
    COMPOSE_FILE="-f docker-compose.yml -f docker-compose.prod.yml"
    MODE_DESC="Production (optimized build)"
fi

# Start all services with Docker Compose
echo "Starting all services in containers..."
echo "📋 Mode: $MODE_DESC"
if [ "$SKIP_MIGRATE" = true ]; then
    echo "Migrations: Skipped (--no-migrate)"
else
    echo "Migrations: Auto-run on startup"
fi
echo ""

# Start services in detached mode first, run migrations, then attach to logs
docker compose $ENV_FILE $COMPOSE_FILE up --build -d

# Run migrations automatically unless skipped
if [ "$SKIP_MIGRATE" = false ]; then
    run_migrations_background "$ENV_FILE"
fi

echo ""
if [ "$DEV_MODE" = true ]; then
    echo "POS Application started."
    echo "Frontend: http://localhost:4202"
    echo "Backend API: http://localhost:4202/api"
    echo "Health check: http://localhost:4202/api/health"
    echo "DB Health check: http://localhost:4202/api/health/db"
    echo "API Docs: http://localhost:4202/api/docs"
else
    echo "POS Application started."
    echo "Frontend: http://localhost:4200"
    echo "Backend API: http://localhost:4200/api"
    echo "Health check: http://localhost:4200/api/health"
    echo "DB Health check: http://localhost:4200/api/health/db"
    echo "API Docs: http://localhost:4200/api/docs"
fi
echo ""
echo "Press Ctrl+C to stop all services"
echo ""
echo "Tips:"
echo "   ./run.sh --clean     Remove all containers and volumes"
echo "   ./run.sh --migrate   Run database migrations manually"
echo ""

# Now attach to logs (this will run in foreground)
docker compose $ENV_FILE $COMPOSE_FILE logs -f
