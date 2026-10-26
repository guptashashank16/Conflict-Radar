# REST API Specification & Reference — SIH26264

All application endpoints are versioned under the prefix `/api/v1`. Interactive Swagger UI documentation is available at `http://127.0.0.1:8000/docs` and ReDoc at `http://127.0.0.1:8000/redoc`.

---

## 1. Authentication & Session Management

### `POST /api/v1/auth/login`
Authenticates user credentials and issues a signed JWT bearer token.
- **Request Body (JSON):**
  ```json
  {
    "email": "oversight@aicte.gov.in",
    "password": "demo123"
  }
  ```
- **Response (200 OK):**
  ```json
  {
    "access_token": "eyJhbGciOi...",
    "token_type": "bearer",
    "user_id": "11111111-1111-1111-1111-111111111111",
    "email": "oversight@aicte.gov.in",
    "full_name": "Dr. Ramesh Verma",
    "role": "OVERSIGHT_OFFICER",
    "bureau_scope": "ALL",
    "region_scope": "ALL"
  }
  ```

### `GET /api/v1/auth/me`
Retrieves the profile and authorization scope of the currently authenticated officer.
- **Headers:** `Authorization: Bearer <token>`
- **Response (200 OK):** `UserOut` object with user identifiers, full name, role, bureau scope, and region scope.

### `GET /api/v1/auth/demo-personas`
Returns pre-configured demonstration personas representing various organizational tiers and bureaus.

### `POST /api/v1/auth/switch-demo-role`
Facilitates seamless evaluation of role-based scope enforcement during judging and testing.
- **Request Body (JSON):**
  ```json
  {
    "role": "BUREAU_OFFICER_RB"
  }
  ```
- **Response (200 OK):** Fresh JWT token and profile for the selected persona.

---

## 2. Executive Dashboard

### `GET /api/v1/dashboard/summary`
Returns aggregated case metrics, SLA status counters, and workload indicators scoped to the requesting officer's bureau and region.
- **Query Parameters:**
  - `region` (optional, default `ALL`): Filter by geographic region.
  - `days` (optional, default `30`): Filter by recency window in days.
- **Response (200 OK):**
  ```json
  {
    "total_cases": 181,
    "active_cases": 138,
    "cases_at_risk_warning": 22,
    "cases_overdue": 14,
    "unreviewed_overlap_candidates": 28,
    "pending_coordination_requests": 6,
    "status_distribution": {
      "UNDER_PROCESS": 72,
      "PENDING": 42,
      "DISPOSED": 43,
      "TRANSFERRED": 14,
      "ESCALATED": 10
    },
    "bureau_workload": {
      "RB": { "total": 65, "under_process": 32, "pending": 18, "transferred": 5, "escalated": 4, "disposed": 6 },
      "PGRC": { "total": 58, "under_process": 24, "pending": 14, "transferred": 6, "escalated": 3, "disposed": 11 }
    }
  }
  ```

### `GET /api/v1/dashboard/trends`
Provides 6-week historical intake and closure volume trends for executive activity sparklines.

---

## 3. Institution Registry & 360° Profile

### `GET /api/v1/institutions`
Returns a paginated list of canonical technical institutions.
- **Query Parameters:** `query` (search name or AICTE ID), `region`, `approval_status`, `skip`, `limit`.

### `GET /api/v1/institutions/{id}`
Returns a consolidated 360° profile for a specific institution, including:
- Canonical identity, permanent ID, state, region, and approval status.
- Reviewed historical aliases.
- Cases grouped by bureau (cases outside user's scope are redacted with aggregate counters).
- Active Conflict Radar overlap alerts involving the institution.

### `POST /api/v1/institutions`
Registers a new canonical institution record.
- **Required Permission:** `institution.create`

---

## 4. Case Management & Workflow Engine

### `GET /api/v1/cases`
Returns server-side filtered, paginated cases respecting caller's bureau and regional scope.
- **Query Parameters:** `bureau`, `status`, `priority`, `sla_status`, `category`, `search`, `skip`, `limit`.

### `GET /api/v1/cases/{id}`
Retrieves complete case details. Enforces `enforce_case_scope` server-side (returns `403 Forbidden` if outside scope).

### `POST /api/v1/cases`
Creates a new case record.
- **Request Body (JSON):**
  ```json
  {
    "source_system": "RB_PORTAL",
    "source_case_id": "RB-2026-9921",
    "institution_id": "uuid-here",
    "bureau": "RB",
    "category": "FACULTY_NORMS",
    "subject": "Faculty Deficit Investigation",
    "description": "Shortfall of required PhD faculty in Department of Computer Science.",
    "priority": "HIGH",
    "target_days": 15
  }
  ```

### `PATCH /api/v1/cases/{id}/status`
Transitions a case to a new lifecycle state with Optimistic Concurrency Control.
- **Request Body (JSON):**
  ```json
  {
    "to_status": "UNDER_PROCESS",
    "expected_version": 1,
    "remarks": "Investigation assigned to senior inspector.",
    "disposition_summary": null
  }
  ```
- **Error Responses:**
  - `400 Bad Request`: Invalid transition attempted according to state machine.
  - `409 Conflict`: Version mismatch (`expected_version != case.version`).

### `POST /api/v1/cases/{id}/assign`
Assigns a case to an authorized officer. Requires `expected_version`.

### `POST /api/v1/cases/{id}/transfer`
Transfers a case to another autonomous bureau with required justification reason.

### `POST /api/v1/cases/{id}/coordination`
Sends a formal cross-bureau coordination inquiry regarding a case.

### `GET /api/v1/cases/{id}/timeline`
Returns the chronological audit trail of all actions performed on the case.

---

## 5. Conflict Radar (Overlap Detection)

### `GET /api/v1/overlaps`
Retrieves candidate overlap pairs.
- **Query Parameters:** `review_status` (`UNREVIEWED`, `LINKED`, `DISMISSED`, `DEFERRED`), `min_score` (default `0`), `skip`, `limit`.
- **Response Structure:** Includes composite match score (0-100), decomposed signal weights (`exact_id`, `name_addr`, `category`, `description`, `cross_bureau`), side-by-side case details, and human-readable explanation.

### `POST /api/v1/overlaps/{id}/decision`
Records an authorized human reviewer's decision on a candidate pair.
- **Request Body (JSON):**
  ```json
  {
    "decision": "LINK",
    "reason": "Confirmed concurrent inspection and student complaint regarding faculty.",
    "relationship_type": "CROSS_BUREAU_COORDINATION"
  }
  ```

### `POST /api/v1/overlaps/scan`
Triggers an on-demand re-evaluation of conflict signals across all active cases.

---

## 6. Reports & Data Ingestion

### `GET /api/v1/reports/workload`
Returns caseload metrics broken down by bureau and status.

### `GET /api/v1/reports/ageing`
Returns case ageing distributions (< 7 days, 7-30 days, 30-60 days, > 60 days) and SLA compliance percentage.

### `POST /api/v1/imports/csv`
Multipart form upload of CSV complaint cases. Performs column validation, identity resolution, duplicate detection, and idempotent ingestion.

---

## 7. Security & Audit Trail

### `GET /api/v1/audit/events`
Restricted endpoint (`require_permission("audit.read")`). Returns immutable chronological security and business audit records.
