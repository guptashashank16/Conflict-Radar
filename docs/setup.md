# Installation & Setup Guide — SIH26264

This document outlines local environment setup, configuration options, database initialization, and containerized deployment for the **AICTE Institution Conflict Radar**.

---

## 1. System Prerequisites

- **Operating System:** Windows 10/11, macOS, or Linux.
- **Python:** Version 3.10 or higher (Tested and validated on Python 3.13).
- **Node.js:** Version 18.0 or higher with `npm`.
- **Docker & Docker Compose** (Optional, for containerized PostgreSQL deployment).

---

## 2. Environment Configuration (`.env`)

The application reads configuration settings from environment variables or a `.env` file located at the repository root. A template is provided in [`.env.example`](file:///c:/chaljabhaii/.env.example).

To configure your local environment:
```bash
cp .env.example .env
```

### Key Configuration Variables

| Variable | Default Value | Description |
|---|---|---|
| `PROJECT_NAME` | `"SIH26264 Institution Conflict Radar"` | Human-readable service title |
| `ENVIRONMENT` | `development` | Runtime environment mode (`development` or `production`) |
| `ORGANIZATION_TIMEZONE` | `Asia/Kolkata` | Standard operational timezone |
| `DATABASE_URL` | `sqlite:///./radar.db` | Database connection URI (SQLite WAL or PostgreSQL) |
| `SECRET_KEY` | *(Pre-set dev secret)* | Master key for signing HS256 JWT tokens |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | `1440` | JWT token validity window in minutes (24 hours) |
| `RADAR_WEIGHT_EXACT_ID` | `45` | Score weight for exact AICTE Permanent ID match |
| `RADAR_WEIGHT_NAME_ADDR` | `15` | Score weight for normalized name & address overlap |
| `RADAR_WEIGHT_CATEGORY` | `15` | Score weight for complaint category match |
| `RADAR_WEIGHT_DESCRIPTION` | `15` | Score weight for narrative text similarity |
| `RADAR_WEIGHT_CROSS_BUREAU` | `10` | Score weight for active cross-bureau status |
| `RADAR_CANDIDATE_THRESHOLD` | `40` | Minimum score threshold to flag a conflict candidate |

---

## 3. Local Development Setup (Zero-Setup SQLite Mode)

By default, the application is configured to run locally against a pre-seeded SQLite database in WAL (Write-Ahead Logging) mode, enabling instant evaluation without requiring external database installation.

### Step 3.1: Backend Setup
```bash
# 1. Install required Python packages
pip install -r backend/requirements.txt

# 2. (Optional) Re-seed synthetic data if radar.db is absent
python scripts/seed_demo.py

# 3. Start the FastAPI backend server
python -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000
```
- FastAPI server starts at `http://127.0.0.1:8000`.
- Interactive Swagger documentation is accessible at `http://127.0.0.1:8000/docs`.

### Step 3.2: Frontend Setup
```bash
# 1. Navigate to the frontend directory
cd frontend

# 2. Install Node dependencies
npm install

# 3. Start the Vite development server
npm run dev
```
- The web application opens at `http://localhost:5173`.
- Demo accounts can be authenticated immediately using any pre-configured profile (default password: `demo123`).

---

## 4. Production Setup with PostgreSQL

To run against a production-grade PostgreSQL database:

1. In `.env`, update `DATABASE_URL`:
   ```env
   DATABASE_URL=postgresql://radar_admin:your_secure_password@localhost:5432/aicte_radar
   ```
2. Run database initialization and seeding:
   ```bash
   python scripts/seed_demo.py
   ```
3. Start the backend:
   ```bash
   python -m uvicorn backend.app.main:app --host 0.0.0.0 --port 8000
   ```

---

## 5. Containerized Deployment (Docker Compose)

The repository provides a complete, multi-container Docker configuration:

```bash
docker-compose up --build
```

This starts three orchestrated containers:
1. `aicte_radar_postgres`: PostgreSQL 16 Alpine container with persistent data volume.
2. `aicte_radar_backend`: FastAPI backend running via Uvicorn on port 8000.
3. `aicte_radar_frontend`: Nginx-hosted production React build on port 5173.

To stop the containers:
```bash
docker-compose down
```
