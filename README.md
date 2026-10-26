# AICTE Institution Conflict Radar (SIH26264)
**Integrated Dashboard for Institution-Related Complaint Cases Across AICTE Bureaus and Cells**

[![FastAPI](https://img.shields.io/badge/FastAPI-0.115+-009688.svg?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-18.2+-61DAFB.svg?logo=react&logoColor=black)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.2+-3178C6.svg?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4+-38B2AC.svg?logo=tailwind-css&logoColor=white)](https://tailwindcss.com)
[![Tests](https://img.shields.io/badge/Tests-Pytest%20100%25%20Passing-success.svg)](backend/tests)

---

## 1. Project Context & Problem Statement

**Problem Statement SIH26264:** Autonomous bureaus within AICTE—including the Regulation Bureau (RB), Public Grievance Redressal Cell (PGRC), Approval Bureau (AB), and Vigilance Cell—often receive related, overlapping, or concurrent complaints regarding the same technical institution.

Without cross-bureau visibility:
- Autonomous bureaus may duplicate investigative efforts or issue conflicting directives.
- Inconsistent institutional naming/aliases fragment case oversight.
- Coordination handoffs are delayed without clear audit trails or deadline tracking.

### Solution Overview
The **Institution Conflict Radar** is an institutional intelligence and coordination layer. It resolves institutional identities into a canonical 360° profile, evaluates cross-bureau case pairs with an **explainable 5-signal matching formula**, enforces **least-privilege role/scope authorization**, validates case workflows with optimistic concurrency control, monitors deadlines without spamming notifications, and preserves an immutable audit trail.

---

## 2. Key Capabilities & Engineering Highlights

| Capability | Technical Implementation |
|---|---|
| **Consolidated Institution 360° Profile** | Resolves canonical AICTE Permanent IDs, tracks reviewed historical aliases, groups active cases by bureau, and redacts cases outside the caller's authorization scope. |
| **Explainable Conflict Radar** | Multi-signal formula ($S = I + N + C + D + W$) scoring candidate pairs (0-100). Provides transparent "Why was this flagged?" breakdown cards and human-in-the-loop review actions (Link, Dismiss with Reason, Defer). |
| **Workflow State Machine & OCC** | Enforces valid transitions (`PENDING` &rarr; `UNDER_PROCESS` &rarr; `TRANSFERRED` &rarr; `ESCALATED` &rarr; `DISPOSED`). Optimistic Concurrency Control rejects concurrent conflicting edits with `409 Conflict`. |
| **SLA & Deadline Engine** | Calculates warning (&le; 72h) and overdue thresholds. Deduplicates in-app notifications so repeated scheduler scans never spam users. |
| **Least-Privilege Scoped RBAC** | Combines user roles (`OVERSIGHT_OFFICER`, `BUREAU_OFFICER_RB`, `BUREAU_OFFICER_PGRC`, `REGIONAL_OFFICER`, `AUDITOR`, `SECURITY_ADMIN`) with strict bureau and regional scoping enforced server-side. |
| **Idempotent CSV Ingestion** | Bulk ingestion workbench with column validation, identity resolution, and duplicate detection ensuring repeat imports never duplicate cases. |

---

## 3. Technology Stack

- **Backend:** Python 3.10+ (Tested on Python 3.13), FastAPI, Pydantic v2, SQLAlchemy 2.0, APScheduler, Pytest, HTTPX, Native Bcrypt, Python-JOSE.
- **Frontend:** React 18, TypeScript, Vite, Tailwind CSS, Lucide React, Recharts.
- **Database:** PostgreSQL (Production) / SQLite WAL mode (Zero-setup Demonstration Mode).
- **Security:** Signed JWT bearer tokens, role-based & scope-based dependency checks, sanitized audit telemetry.

---

## 4. Repository Structure

```text
aicte-institution-conflict-radar/
├── README.md                      # Primary project overview, architecture & quickstart
├── .gitignore                     # Repository hygiene & exclusion configuration
├── .env.example                   # Environment configuration template
├── docker-compose.yml             # Orchestrated multi-container stack (Postgres + Backend + Frontend)
├── radar.db                       # Pre-seeded SQLite demo database (30 institutions, 120+ cases)
│
├── backend/                       # FastAPI application & automated test suite
│   ├── Dockerfile                 # Backend container definition
│   ├── requirements.txt           # Python package dependencies
│   ├── app/
│   │   ├── main.py                # FastAPI entry point, CORS, request IDs, error handlers
│   │   ├── api/v1/                # Versioned REST endpoints (auth, cases, overlaps, reports, etc.)
│   │   ├── core/                  # Configuration, database engine, permissions, audit
│   │   ├── integrations/          # Source adapters interface
│   │   ├── jobs/                  # Background tasks (SLA deadline scanner)
│   │   ├── models/                # SQLAlchemy declarative entities
│   │   ├── schemas/               # Pydantic request & response schemas
│   │   └── services/              # Domain logic (case, institution, overlap, SLA, import)
│   └── tests/                     # Pytest automated test suite (9 test modules)
│
├── frontend/                      # React 18 + TypeScript + Vite + Tailwind CSS web application
│   ├── Dockerfile                 # Multi-stage Nginx production container
│   ├── package.json               # Node.js dependencies and scripts
│   ├── vite.config.ts             # Vite build & development proxy configuration
│   └── src/                       # Application components, pages, API clients, branding assets
│
├── docs/                          # In-depth architectural & operational documentation
│   ├── architecture.md            # Detailed system design, OCC, and multi-signal formulas
│   ├── setup.md                   # Installation, configuration, and startup instructions
│   ├── api.md                     # Complete REST API specifications & contracts
│   ├── testing.md                 # Test suite guide, Pytest execution, and verification scripts
│   ├── demo-script.md             # 4-minute structured judging & demonstration guide
│   └── threat-model.md            # Security architecture & OWASP API Top 10 mitigation
│
└── scripts/                       # Maintained management & verification utilities
    ├── seed_demo.py               # Generates synthetic institutions, cases, and personas
    ├── demo_cases.csv             # Sample CSV for upload verification
    ├── verify_apis.py             # E2E API verification script (7 checks)
    └── verify_trends_api.py       # Activity trends calculation verification
```

---

## 5. Quickstart & Installation Guide

For comprehensive installation and configuration options, see [Setup Guide](docs/setup.md).

### Prerequisites
- Python 3.10+ (Tested on Python 3.13)
- Node.js 18+ & npm

### Step 1: Backend Setup
```bash
# 1. Install backend dependencies
pip install -r backend/requirements.txt

# 2. Run automated tests (All 9 tests pass)
pytest backend/tests -v

# 3. Start FastAPI server (Runs on port 8000)
python -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000
```
Interactive API Documentation will be available at `http://127.0.0.1:8000/docs`.

### Step 2: Frontend Setup
```bash
# 1. Navigate to frontend directory
cd frontend

# 2. Install dependencies
npm install

# 3. Start development server
npm run dev
```
Open `http://localhost:5173` in your browser.

---

## 6. Demonstration Personas & Scope Matrix

Use the **Role Switcher** in the top navigation bar to test role-based scope enforcement on the fly:

| Persona | Role | Scope | Key Capabilities |
|---|---|---|---|
| **Dr. Ramesh Verma** | `OVERSIGHT_OFFICER` | `ALL` Bureaus, `ALL` Regions | Full cross-bureau visibility, coordination management, candidate linking |
| **Smt. Sunita Sharma** | `BUREAU_OFFICER_RB` | `RB` Scope | Regulation Bureau cases only; access to PGRC cases is blocked (`403 Forbidden`) |
| **Shri Arvind Patel** | `BUREAU_OFFICER_PGRC` | `PGRC` Scope | Public Grievance cases only; access to RB cases is blocked (`403 Forbidden`) |
| **Er. Rajesh Kumar** | `REGIONAL_OFFICER` | `Northern` Region | Scoped exclusively to institutions in the Northern Region |
| **Pooja Deshmukh** | `CASE_COORDINATOR` | `ALL` Bureaus | Case transfer and Conflict Radar candidate review |
| **Vikram Sethi** | `AUDITOR` | `ALL` Bureaus | Read-only access to audit logs and compliance metrics |
| **Admin Control** | `SECURITY_ADMIN` | `ALL` Bureaus | System configuration, security event audit, and account controls |

*(Default password for all demo personas is `demo123`)*

---

## 7. Docker Deployment

To run using Docker Compose with PostgreSQL:
```bash
docker-compose up --build
```
- Backend API: `http://localhost:8000`
- Frontend App: `http://localhost:5173`
- PostgreSQL: `localhost:5432`

---

## 8. Verification & Test Suite

The automated test suite (`backend/tests/`) verifies security boundaries, workflow transitions, multi-signal radar scoring, deadline evaluation, and idempotent data ingestion.

Execute anytime with:
```bash
pytest backend/tests -v
```

Additional end-to-end verification scripts:
```bash
python scripts/verify_apis.py
python scripts/verify_trends_api.py
```

For full details, see [Testing Guide](docs/testing.md).

---

## 9. Documentation Index

Detailed engineering documentation is organized under [`docs/`](docs/):
- **[Architecture Specification](docs/architecture.md):** Modular monolith components, domain models, OCC state machine, and 5-signal formula.
- **[Installation & Setup](docs/setup.md):** Local setup, environment settings, SQLite WAL mode, PostgreSQL, and Docker.
- **[API Reference](docs/api.md):** Complete REST endpoints, request/response schemas, and error contracts.
- **[Testing & Verification](docs/testing.md):** Test suite organization, pytest execution, and verification scripts.
- **[Demonstration Script](docs/demo-script.md):** 4-minute structured walkthrough for evaluation and judging.
- **[Threat Model & Security](docs/threat-model.md):** OWASP API Top 10 mitigation and least-privilege security analysis.

---

## 10. Disclaimers & Scope Transparency
- All case records, institution names, and complaints in this repository are **strictly synthetic** fictional demonstrations created for Smart India Hackathon problem statement SIH26264.
- This application does not claim live integration with production AICTE servers, nor does it replace official regulatory decision-making by authorized government officers.
