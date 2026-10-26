# Automated Testing & Verification Guide — SIH26264

This document describes the automated test architecture, test suites, and end-to-end verification scripts provided with the **AICTE Institution Conflict Radar**.

---

## 1. Test Architecture Overview

The test suite validates security boundaries, workflow transitions, multi-signal radar scoring, deadline evaluation, and idempotent data ingestion. Tests run against an isolated SQLite test database initialized via Pytest fixtures, ensuring zero side-effects on development data.

```
backend/tests/
├── conftest.py                   # Pytest fixtures, isolated test engine, auth client helpers
├── test_auth_and_scope.py        # Authentication & RBAC bureau/regional scope checks
├── test_conflict_radar.py        # 5-signal formula, score weights, link/dismiss actions
├── test_workflow.py              # State machine transitions & Optimistic Concurrency Control
├── test_sla_engine.py            # Deadline scanner, 72h warning, overdue breach & deduplication
└── test_idempotent_import.py     # CSV validation, identity resolution & duplicate rejection
```

---

## 2. Executing Automated Tests

### Running the Full Pytest Suite
From the repository root:
```bash
pytest backend/tests -v
```

Expected output:
```text
============================= test session starts =============================
collected 9 items

backend/tests/test_auth_and_scope.py::test_unauthenticated_request_denied PASSED
backend/tests/test_auth_and_scope.py::test_rb_officer_cannot_access_pgrc_case PASSED
backend/tests/test_auth_and_scope.py::test_rb_officer_can_access_rb_case PASSED
backend/tests/test_auth_and_scope.py::test_auditor_can_access_audit_log_while_bureau_officer_denied PASSED
backend/tests/test_conflict_radar.py::test_conflict_radar_signals_exact_id_and_cross_bureau PASSED
backend/tests/test_conflict_radar.py::test_overlap_decision_linking_and_dismissal PASSED
backend/tests/test_idempotent_import.py::test_csv_import_and_idempotency PASSED
backend/tests/test_sla_engine.py::test_sla_deadline_evaluation_and_deduplication PASSED
backend/tests/test_workflow.py::test_workflow_lifecycle_and_concurrency PASSED

======================== 9 passed in 0.48s =========================
```

---

## 3. Detailed Test Coverage

### 3.1 Authentication & Scope Enforcement (`test_auth_and_scope.py`)
- `test_unauthenticated_request_denied`: Unauthenticated requests to protected endpoints return `401 Unauthorized`.
- `test_rb_officer_cannot_access_pgrc_case`: Verifies server-side scope enforcement (`403 Forbidden` when an RB officer accesses a PGRC case).
- `test_rb_officer_can_access_rb_case`: Verifies authorized access within bureau scope returns `200 OK`.
- `test_auditor_can_access_audit_log_while_bureau_officer_denied`: Verifies that administrative audit routes (`/audit/events`) are restricted to `AUDITOR` and `SECURITY_ADMIN`.

### 3.2 Conflict Radar Scoring & Review (`test_conflict_radar.py`)
- `test_conflict_radar_signals_exact_id_and_cross_bureau`: Validates exact AICTE Permanent ID match (+45 pts) and cross-bureau active workflow (+10 pts) composite score generation.
- `test_overlap_decision_linking_and_dismissal`: Verifies human review decisions, link creation, timeline updates, and dismissal suppression.

### 3.3 Workflow Lifecycle & Concurrency (`test_workflow.py`)
- `test_workflow_lifecycle_and_concurrency`: Validates state machine progression (`PENDING` &rarr; `UNDER_PROCESS` &rarr; `DISPOSED`), validates disposition summary requirement, and verifies that stale concurrent updates are rejected with `409 Conflict`.

### 3.4 SLA & Deadline Scanner (`test_sla_engine.py`)
- `test_sla_deadline_evaluation_and_deduplication`: Verifies deadline status transitions (`NORMAL` &rarr; `WARNING` &rarr; `OVERDUE`) and verifies notification deduplication across multiple scheduler iterations.

### 3.5 Idempotent Data Ingestion (`test_idempotent_import.py`)
- `test_csv_import_and_idempotency`: Verifies that repeat CSV imports reject duplicate `(source_system, source_case_id)` records while accepting new valid entries.

---

## 4. End-to-End Verification Scripts

In addition to unit tests, maintained utility scripts in `scripts/` provide end-to-end runtime verification:

### Full API Verification (`scripts/verify_apis.py`)
Validates live backend authentication, scoped filtering, workload reports, and regional officer restrictions against the active database:
```bash
python scripts/verify_apis.py
```
Expected output:
```text
1. Login SUCCESS: Dr. Ramesh Verma | Role: OVERSIGHT_OFFICER | Bureau: ALL
2. Invalid Login safely rejected with HTTP 401
3. Cases total (All Regions): 181 | Sample case region: National
4. Cases total (Northern Region filter): 71
5. Workload report with region filter returned bureaus: ['RB', 'PGRC', 'APPROVAL', 'VIGILANCE']
6. Ageing report compliance rate: 72.3% across 65 cases
7. Regional Officer Scoped Cases: 71 strictly constrained to Northern jurisdiction
```

### Trends API Verification (`scripts/verify_trends_api.py`)
Validates 6-week historical intake and closure calculation:
```bash
python scripts/verify_trends_api.py
```

---

## 5. Frontend Production Build Verification

Verify frontend TypeScript compilation and Vite production bundle generation:
```bash
npm --prefix frontend run build
```
Expected output:
```text
✓ built in ~7s
```
Zero compilation errors or type warnings.
