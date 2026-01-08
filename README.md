# POS System

A Point of Sale system with Angular frontend and FastAPI backend using PostgreSQL.

## Quick Start

### Prerequisites
- Docker and Docker Compose
- Python 3.12+
- Node.js 18+ (for frontend development)

### Setup

1. **Clone and setup environment:**
   ```bash
   # Copy environment config
   cp config.env.example config.env
   ```

2. **Run everything:**
   ```bash
   ./run.sh
   ```

   This will:
   - Start PostgreSQL 18 (Alpine 3.23) in Docker on port 5433
   - Start FastAPI backend on port 8011
   - Enable hot reload for development

### Access Points

- **API**: http://localhost:8011
- **Health Check**: http://localhost:8011/health
- **DB Health Check**: http://localhost:8011/health/db
- **API Docs**: http://localhost:8011/docs

### Manual Setup (Alternative)

If you prefer to run components separately:

```bash
# 1. Start database
docker compose --env-file config.env up -d

# 2. Start backend
cd back
source venv/bin/activate
export $(grep -v '^#' ../config.env | xargs)
uvicorn app.main:app --host 0.0.0.0 --port 8011 --reload
```

### Frontend Development

```bash
cd front
npm install
npm start  # Runs on http://localhost:4200
```

## Architecture

- **Frontend**: Angular 20+ (SPA)
- **Backend**: FastAPI with SQLModel ORM
- **Database**: PostgreSQL 18 (Alpine 3.23)
- **Container**: Docker Compose for database isolation

## Environment Variables

See `config.env.example` for all available configuration options.