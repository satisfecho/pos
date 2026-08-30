#!/bin/bash

# Exit on error
set -e

# Get the directory of the script
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$DIR"

# Activate virtual environment if present. This repo keeps the env at the project root,
# not inside /back, so check both locations before falling back to system Python.
PYTHON_BIN="python3"
if [ -d "venv" ]; then
    source venv/bin/activate
    PYTHON_BIN="python"
elif [ -d "../.venv" ]; then
    source ../.venv/bin/activate
    PYTHON_BIN="python"
else
    echo "Warning: Python environment not found in ./venv or ../.venv. Assuming packages are installed globally or in another environment."
    if command -v python3 >/dev/null 2>&1; then
        PYTHON_BIN="python3"
    elif command -v python >/dev/null 2>&1; then
        PYTHON_BIN="python"
    fi
fi

# Load environment variables
if [ -f "../config.env" ]; then
    export $(grep -v '^#' ../config.env | xargs)

    # When running the seed script on the host machine, Docker's internal service name
    # 'db' is not resolvable and must be replaced with the published host port.
    if [ "${DB_HOST:-}" = "db" ] && ! ping -c 1 -W 1 db >/dev/null 2>&1; then
        echo "Warning: Host 'db' not reachable. Assuming host execution."
        export DB_HOST="localhost"
        if [ -n "${POSTGRES_PORT:-}" ]; then
            export DB_PORT="${POSTGRES_PORT}"
        fi
    fi
else
    echo "Warning: '../config.env' not found. Ensure environment variables are set."
fi

echo "========================================"
echo "Starting Database Seeding"
echo "========================================"

echo "[1/4] Seeding Categories..."
"$PYTHON_BIN" -m app.seeds.categories

echo "[2/4] Seeding Pizzas..."
# Pass arguments (like --clear) to the importers
"$PYTHON_BIN" -m app.seeds.pizza_import "$@"

echo "[3/4] Seeding Beers..."
"$PYTHON_BIN" -m app.seeds.beer_import "$@"

echo "[4/4] Seeding Wines..."
"$PYTHON_BIN" -m app.seeds.wine_import "$@"

echo "========================================"
echo "Seeding Complete!"
echo "========================================"
