#!/bin/bash

# Seed Automation Script for POS System Backend
# Automates execution of data seeding scripts with proper environment setup.

# Exit on error
set -e

# Get the directory where the script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

warn() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# --- Environment Setup ---

setup_env() {
    log "Setting up environment..."
    
    # Source virtual environment. The project keeps the environment at the repo root,
    # not inside /back, so check both locations before falling back to the system Python.
    if [ -d "venv" ]; then
        log "Activating virtual environment from back/venv..."
        source venv/bin/activate
    elif [ -d "../.venv" ]; then
        log "Activating virtual environment from repo root .venv..."
        source ../.venv/bin/activate
    else
        warn "Virtual environment not found in ./venv or ../.venv. Trying global python..."
    fi

    # Load environment variables
    if [ -f "../config.env" ]; then
        log "Loading environment variables from ../config.env..."
        export $(grep -v '^#' ../config.env | xargs)

        # Detect if we should use localhost instead of 'db' host (Docker default)
        # If DB_HOST is 'db' and we are running on host, we need to use localhost:POSTGRES_PORT.
        # Guard against missing POSTGRES_PORT so the script still works in a Dockerized run.
        if [ "${DB_HOST:-}" = "db" ] && ! ping -c 1 -W 1 db > /dev/null 2>&1; then
            warn "Host 'db' not reachable. Assuming host execution."
            export DB_HOST="localhost"
            if [ -n "${POSTGRES_PORT:-}" ]; then
                log "Switching DB_HOST to localhost and DB_PORT to $POSTGRES_PORT"
                export DB_PORT="$POSTGRES_PORT"
            else
                log "DB_HOST set to localhost without POSTGRES_PORT override; keep DB_PORT as configured."
            fi
        fi
    else
        error "../config.env not found. Please ensure it exists."
        exit 1
    fi
    
    # Set PYTHONPATH to root directory to allow 'app.' imports
    export PYTHONPATH="$SCRIPT_DIR"
}

# --- Execution Helper ---

run_seed() {
    local module=$1
    local name=$2
    local extra_args=$3

    echo -e "\n${YELLOW}=== Seeding $name ===${NC}"
    log "Running: python -m $module $extra_args"
    
    local py_cmd="${PYTHON:-python3}"
    if command -v python >/dev/null 2>&1 && [ -n "${VIRTUAL_ENV:-}" ]; then
        py_cmd="python"
    elif command -v python3 >/dev/null 2>&1; then
        py_cmd="python3"
    fi

    if "$py_cmd" -m "$module" $extra_args; then
        success "$name seeding completed."
    else
        error "$name seeding failed."
        return 1
    fi
}

# --- Command Handlers ---

show_help() {
    echo "Usage: ./run_seeds.sh [options]"
    echo ""
    echo "Options:"
    echo "  --all           Run all seeds in the recommended order"
    echo "  --categories    Seed standard restaurant categories only"
    echo "  --wines         Import wines from Tusumiller API"
    echo "  --beers         Import popular beers collection"
    echo "  --pizzas        Import award-winning Spanish pizzas"
    echo "  --products      Seed basic tenant products"
    echo "  --demo-orders   Seed demo orders for tenant 1 (Reports/Informes; idempotent)"
    echo "  --demo-reservations  Seed demo reservations for tenant 1 (Reports; idempotent)"
    echo "  --clear         Pass --clear flag to the seed scripts (resets data)"
    echo "  --delete-all    GLOBAL CLEANUP: Deletes all seeded data and images"
    echo "  --help          Show this help message"
    echo ""
    echo "Recommended order: --categories -> --wines -> --beers -> --pizzas -> --products"
}

# Parse arguments
RUN_ALL=false
RUN_CATEGORIES=false
RUN_WINES=false
RUN_BEERS=false
RUN_PIZZAS=false
RUN_PRODUCTS=false
RUN_DEMO_ORDERS=false
RUN_DEMO_RESERVATIONS=false
DELETE_ALL=false
CLEAR_FLAG=""

if [ $# -eq 0 ]; then
    show_help
    exit 0
fi

while [[ $# -gt 0 ]]; do
    case "$1" in
        --all) RUN_ALL=true; shift ;;
        --categories) RUN_CATEGORIES=true; shift ;;
        --wines) RUN_WINES=true; shift ;;
        --beers) RUN_BEERS=true; shift ;;
        --pizzas) RUN_PIZZAS=true; shift ;;
        --products) RUN_PRODUCTS=true; shift ;;
        --demo-orders) RUN_DEMO_ORDERS=true; shift ;;
        --demo-reservations) RUN_DEMO_RESERVATIONS=true; shift ;;
        --clear) CLEAR_FLAG="--clear"; shift ;;
        --delete-all) DELETE_ALL=true; shift ;;
        --help) show_help; exit 0 ;;
        *) error "Unknown option: $1"; show_help; exit 1 ;;
    esac
done

# Initialize
setup_env

# Global Cleanup
if [ "$DELETE_ALL" = true ]; then
    run_seed "app.seeds.clear_data" "Global Cleanup" ""
fi

# Execution
if [ "$RUN_ALL" = true ] || [ "$RUN_CATEGORIES" = true ]; then
    run_seed "app.seeds.categories" "Categories" ""
fi

if [ "$RUN_ALL" = true ] || [ "$RUN_WINES" = true ]; then
    run_seed "app.seeds.wine_import" "Wines" "$CLEAR_FLAG"
fi

if [ "$RUN_ALL" = true ] || [ "$RUN_BEERS" = true ]; then
    run_seed "app.seeds.beer_import" "Beers" "$CLEAR_FLAG"
fi

if [ "$RUN_ALL" = true ] || [ "$RUN_PIZZAS" = true ]; then
    run_seed "app.seeds.pizza_import" "Pizzas" "$CLEAR_FLAG"
fi

if [ "$RUN_ALL" = true ] || [ "$RUN_PRODUCTS" = true ]; then
    run_seed "app.seeds.products" "Basic Products" "$CLEAR_FLAG"
fi

if [ "$RUN_DEMO_ORDERS" = true ]; then
    run_seed "app.seeds.seed_demo_orders" "Demo Orders (tenant 1)" ""
fi

if [ "$RUN_DEMO_RESERVATIONS" = true ]; then
    run_seed "app.seeds.seed_demo_reservations" "Demo Reservations (tenant 1)" ""
fi

success "Seed automation process finished."
