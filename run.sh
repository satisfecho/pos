#!/bin/bash

# Simple setup script for POS application

set -e

echo "🚀 Starting POS Application..."

# Check if config.env exists
if [ ! -f "config.env" ]; then
    echo "❌ config.env not found! Copy config.env.example to config.env and edit if needed."
    exit 1
fi

# Start Postgres container
echo "🐘 Starting Postgres..."
docker compose --env-file config.env up -d

# Wait for Postgres to be ready
echo "⏳ Waiting for Postgres to be ready..."
sleep 3

# Start FastAPI server
echo "⚡ Starting FastAPI server on port 8011..."
cd back
source venv/bin/activate

# Export environment variables from config.env
export $(grep -v '^#' ../config.env | xargs)

# Run the server
uvicorn app.main:app --host 0.0.0.0 --port 8011 --reload

echo "✅ POS Application started!"
echo "🌐 API available at: http://localhost:8011"
echo "📊 Health check: http://localhost:8011/health"
echo "🗄️  DB Health check: http://localhost:8011/health/db"