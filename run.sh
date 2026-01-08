#!/bin/bash

# Simple setup script for POS application

set -e

# Function to cleanup background processes
cleanup() {
    echo ""
    echo "🛑 Shutting down services..."
    kill 0
    exit 0
}

# Set trap to cleanup on script exit
trap cleanup SIGINT SIGTERM

echo "🚀 Starting POS Application..."

# Check if config.env exists
if [ ! -f "config.env" ]; then
    echo "❌ config.env not found! Copy config.env.example to config.env and edit if needed."
    exit 1
fi

# Start Postgres container
echo "🐘 Starting Postgres..."
docker compose --env-file config.env up -d

# Load env vars to get DB port (needed for checking availability)
export $(grep -v '^#' config.env | xargs)

# Wait for Postgres to be ready
echo "⏳ Waiting for Postgres to be ready on port ${POSTGRES_PORT:-5433}..."
while ! nc -z localhost ${POSTGRES_PORT:-5433}; do
  sleep 1
done

# Start Angular frontend (client-side only for development)
echo "🎨 Starting Angular frontend..."
cd front

npx ng serve --host 0.0.0.0 --port 4200 --configuration development-no-ssr &
FRONTEND_PID=$!
cd ..

# Wait a moment for frontend to start
sleep 2

# Start FastAPI server
echo "⚡ Starting FastAPI server..."
cd back
source venv/bin/activate

# Export environment variables from config.env
export $(grep -v '^#' ../config.env | xargs)

# Run the server in background
uvicorn app.main:app --host 0.0.0.0 --port 8020 --reload &
BACKEND_PID=$!
cd ..

echo ""
echo "✅ POS Application started!"
echo "🌐 Frontend: http://localhost:4200"
echo "⚡ Backend API: http://localhost:8020"
echo "📊 Health check: http://localhost:8020/health"
echo "🗄️  DB Health check: http://localhost:8020/health/db"
echo "📚 API Docs: http://localhost:8020/docs"
echo ""
echo "Press Ctrl+C to stop all services"

# Wait for background processes
wait