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
   - Start Angular frontend on port 4200
   - Start FastAPI backend on port 8020
   - Enable hot reload for both frontend and backend development

### Access Points

- **Frontend**: http://localhost:4200
- **API**: http://localhost:8020
- **Health Check**: http://localhost:8020/health
- **DB Health Check**: http://localhost:8020/health/db
- **API Docs**: http://localhost:8020/docs

### Manual Setup (Alternative)

If you prefer to run components separately:

```bash
# 1. Start database
docker compose --env-file config.env up -d

# 2. Start backend
cd back
source venv/bin/activate
export $(grep -v '^#' ../config.env | xargs)
uvicorn app.main:app --host 0.0.0.0 --port 8020 --reload
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