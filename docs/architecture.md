# AICTE Institution Conflict Radar — Architectural Specification (SIH26264)

## 1. System Context & Overview

The **Institution Conflict Radar** is a specialized coordination and oversight layer designed to address fragmented case visibility, overlapping actions, and coordination delays across autonomous bureaus within AICTE (such as the Regulation Bureau [RB], Public Grievance Redressal Cell [PGRC], and Approval Bureau [AB]).

It is **not** another grievance submission portal. Instead, it serves as an institutional intelligence hub that:
1. Normalizes and resolves institution identities into a single canonical 360° profile.
2. Evaluates cross-bureau case pairs using a multi-signal explainable scoring engine.
3. Enforces least-privilege role-based and scope-based authorization.
4. Manages transactional case workflows, transfers, coordination requests, and closures with optimistic concurrency control.
5. Monitors deadlines and escalates at-risk cases without duplicate notification spam.
6. Maintains an immutable chronological audit trail separating security events from business actions.

---

## 2. Component Architecture (Modular Monolith)

```
┌────────────────────────────────────────────────────────────────────────┐
│                        PRESENTATION LAYER                              │
│         React 18 + TypeScript + Vite + Tailwind CSS + Recharts         │
│  [Overview]  [My Work]  [Institutions 360]  [Conflict Radar]  [Reports] │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ REST API (Bearer JWT / Session)
┌───────────────────────────────────▼────────────────────────────────────┐
│                      IDENTITY & ACCESS BOUNDARY                        │
│    JWT Authentication • Role & Scope Checks • Request ID & Audit Log   │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
       ┌────────────────────────────┼───────────────────────────┐
       ▼                            ▼                           ▼
┌──────────────┐             ┌──────────────┐            ┌──────────────┐
│ CASE DOMAIN  │             │ CONFLICT     │            │ WORKFLOW &   │
│ & OCC ENGINE │             │ RADAR ENGINE │            │ SLA ENGINE   │
│              │             │              │            │              │
│ - Cases      │             │ - Multi-     │            │ - State      │
│ - Timelines  │             │   Signal     │            │   Machine    │
│ - Versioning │             │   Weights    │            │ - Deadlines  │
│ - Provenance │             │ - Candidate  │            │ - Transfers  │
│              │             │   Review     │            │ - Dedup      │
└──────┬───────┘             └──────┬───────┘            └──────┬───────┘
       │                            │                           │
       └────────────────────────────┼───────────────────────────┘
                                    │ SQLAlchemy ORM
┌───────────────────────────────────▼────────────────────────────────────┐
│                         PERSISTENCE LAYER                              │
│       PostgreSQL (Production) / SQLite (Zero-Setup Demonstration)      │
│    Institutions • Aliases • Cases • Overlaps • Links • Audit Events    │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Conflict Radar: Explainable Multi-Signal Formula

$$S = I + N + C + D + W \quad (\text{Max } 100 \text{ points})$$

1. **Exact AICTE Permanent ID ($I = 45$ pts):** Verified institutional identifier match.
2. **Name / Address Similarity ($N \le 15$ pts):** Normalized token overlap between canonical names, verified aliases, and campus addresses.
3. **Complaint Category Match ($C \le 15$ pts):** Exact match = 15 pts; sibling compliance domain = 8 pts.
4. **Narrative Text Overlap ($D \le 15$ pts):** Token Jaccard similarity across subjects and descriptions.
5. **Cross-Bureau Active Workflow ($W = 10$ pts):** Case A bureau $\neq$ Case B bureau, with both cases in active states (`PENDING`, `UNDER_PROCESS`, `ESCALATED`).

### False-Positive Safeguards
- **Human in the Loop:** The algorithm generates candidates; officers decide whether to link or dismiss.
- **Dismissal Suppression:** Dismissed candidates record the reviewer's reason and are excluded from alerts unless underlying case fields change.
- **No Automatic Merging:** Merging complaint cases autonomously is strictly forbidden.

---

## 4. Workflow State Machine & Concurrency

- **Valid Transitions:**
  - `PENDING` &rarr; `UNDER_PROCESS` (via assignment)
  - `UNDER_PROCESS` &rarr; `TRANSFERRED` (requires destination bureau and reason)
  - `TRANSFERRED` &rarr; `UNDER_PROCESS` (destination bureau accepts handoff)
  - `UNDER_PROCESS` &rarr; `ESCALATED` (SLA trigger or policy reason)
  - `ESCALATED` &rarr; `UNDER_PROCESS` (resolution resumed)
  - `UNDER_PROCESS` &rarr; `DISPOSED` (mandatory disposition summary)
  - `DISPOSED` &rarr; `UNDER_PROCESS` (reopened; restricted to Oversight Officer / Admin)
- **Optimistic Concurrency Control (OCC):**
  - Every update validates `expected_version == case.version`.
  - Stale concurrent updates are rejected with `HTTP 409 Conflict`.
  - Version increments atomically within the transaction upon success.

---

## 5. Domain Model & Relational Specifications

The application uses SQLAlchemy declarative entities mapped to SQLite (WAL mode) or PostgreSQL:

1. **`institutions`**: AICTE Permanent ID (unique, indexed), canonical institution name, region, state, address, approval status (`Approved`, `Under Scrutiny`, `Suspended`, `Withdrawn`), and timestamps.
2. **`institution_aliases`**: Tracks historical and intake name variations linked to canonical institutions with verification status (`PENDING`, `VERIFIED`, `REJECTED`).
3. **`cases`**: Source system, unique `(source_system, source_case_id)` constraint for idempotent ingestion, bureau (`RB`, `PGRC`, `APPROVAL`, `VIGILANCE`), category, subject, description, priority (`LOW`, `MEDIUM`, `HIGH`, `CRITICAL`), status, SLA due date, SLA status (`NORMAL`, `WARNING`, `OVERDUE`), disposition summary, OCC version integer, and timestamps.
4. **`case_assignments`**: Assignee user FK, bureau, start time, end time, and assignment justification.
5. **`case_actions`**: Chronological case history capturing action types (`CREATED`, `ASSIGNED`, `STATUS_CHANGED`, `TRANSFERRED`, `OVERLAP_LINKED`, `COORDINATION_SENT`, `DISPOSED`, `REOPENED`), actor user ID, previous/new status, remarks, and metadata.
6. **`case_links`**: Cross-case relational links (`SAME_INSTITUTION`, `CROSS_BUREAU_COORDINATION`, `DUPLICATE_REPORT`, `PARENT_CHILD`) with linking rationale and reviewer identity.
7. **`overlap_candidates`**: Candidate case pairs with composite score (0-100), decomposed signal weights dictionary, review status (`UNREVIEWED`, `LINKED`, `DISMISSED`, `DEFERRED`), and audit notes.
8. **`coordination_requests`**: Cross-bureau information requests with sender/target bureau, subject, message, and status (`PENDING`, `ACCEPTED`, `DECLINED`).
9. **`sla_policies` & `notifications`**: Configurable SLA deadline rules per priority/bureau and deduplicated in-app alerts.
10. **`users` & `user_scopes`**: User credentials (bcrypt hashed), role, bureau scope, region scope, and active flags.
11. **`audit_events`**: Cryptographically verifiable audit log tracking sensitive security and administrative actions.

---

## 6. Least-Privilege Scoped Authorization (RBAC + Scopes)

Access control combines coarse-grained **roles** with fine-grained **bureau and regional scopes**:

| Role | Bureau Scope | Region Scope | Permitted Actions |
|---|---|---|---|
| `OVERSIGHT_OFFICER` | `ALL` | `ALL` | Full cross-bureau visibility, coordination requests, candidate review/link, case reopening, report generation |
| `BUREAU_OFFICER_RB` | `RB` | `ALL` | Regulation Bureau case updates, assignments, transfers, local overlap view |
| `BUREAU_OFFICER_PGRC` | `PGRC` | `ALL` | Public Grievance case updates, assignments, transfers, local overlap view |
| `REGIONAL_OFFICER` | `ALL` | Specific Region | Cases restricted exclusively to institutions within the officer's regional jurisdiction |
| `CASE_COORDINATOR` | `ALL` | `ALL` | Cross-bureau handoffs, transfer approvals, conflict radar candidate triage |
| `AUDITOR` | `ALL` | `ALL` | Read-only access to audit logs, compliance reports, and system telemetry |
| `SECURITY_ADMIN` | `ALL` | `ALL` | Role management, security event inspection, system configuration |

**Server-Side Scope Enforcement:** Every read or mutation executes `enforce_case_scope(user, case.bureau, case.institution.region)`. Unauthorized attempts are rejected with `HTTP 403 Forbidden`.

---

## 7. SLA & Deadline Engine

- **Warning Threshold:** Triggers when time-to-deadline $\le 72$ hours.
- **Overdue Threshold:** Triggers when current time $> due\_at$.
- **Background Scanner:** `APScheduler` runs `run_deadline_scan()` periodically (every 15 minutes) and at startup.
- **Idempotency & Anti-Spam:** Database checks ensure notification alerts are issued once per status change, preventing duplicate notification clutter.

---

## 8. Frontend Design Architecture

- **Framework:** React 18 with Vite and TypeScript.
- **Styling & Theme:** Vanilla Tailwind CSS with authoritative design system:
  - **Ice Silver (`#DDE3E8`):** Main application background canvas.
  - **Deep Plum (`#3A0F34`):** Authoritative brand color for header, sidebar, cards, and accent boundaries.
  - **Marigold (`#EAAA00`):** Interactive focus, active highlights, badges, and authentic emblem styling.
- **Key Layout Features:**
  - **Stationary Portal Navigation Sidebar:** Fixed layout (`top-16 left-0 bottom-0 w-64 z-30`) with independent vertical scrolling for navigation groups and `ml-64` offset preventing content overlap.
  - **Login-Specific State Emblem Watermark:** Centered behind the Officer Sign-In card with subtle opacity (`0.22`) and high-contrast text readability (`bg-white/92 backdrop-blur-xs`).
  - **Smart Center-Exclusion Donut Tooltip:** Case status distribution donut chart dynamically steers hover tooltips away from the central `Total Cases` number and label.
