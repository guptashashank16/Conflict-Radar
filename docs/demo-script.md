# 4-Minute Judging Demonstration Script — SIH26264

## Overview & Demo Goal
Demonstrate to the judging committee that the **Institution Conflict Radar** is a working, secure, explainable cross-bureau coordination application with real database persistence, backend-enforced permissions, explainable matching logic, and workflow integrity.

---

### Minute 1: Role-Based & Scope-Based Authorization Live Demonstration
1. Open the application at `http://127.0.0.1:5173`.
2. Notice the top navigation bar showing active user **Dr. Ramesh Verma (Oversight Officer, Scope: ALL)**.
3. Use the **Role Switcher** dropdown in the header to switch to **Smt. Sunita Sharma (Bureau Officer RB, Scope: RB)**.
4. Open the **Case Explorer (My Work)**:
   - Notice that the table immediately filters only to **RB (Regulation Bureau)** records.
   - The bureau filter dropdown is locked to `RB`.
   - Show that an attempt to access a PGRC case by direct ID is blocked server-side with `403 Forbidden` ("Record is outside your assigned bureau scope").
5. Switch back to **Dr. Ramesh Verma (Oversight Officer)** to demonstrate cross-bureau coordination authority.

---

### Minute 2: Consolidated Institution 360° Profile
1. Navigate to the **Institutions** destination in the sidebar.
2. Select **Apex Institute of Technology (AICTE ID: 1-10029341)**.
3. Showcase the consolidated profile:
   - Canonical details, state, region, and approval status.
   - **Reviewed Identity Aliases** (e.g., historical intake names like "Apex IT Hinjawadi").
   - **Cases Grouped by Bureau**:
     - Case `RB-2026-0101` in the Regulation Bureau (Faculty Shortage).
     - Case `PGRC-2026-4409` in the Public Grievance Redressal Cell (Mass Student Complaint regarding Faculty).
   - Point out the active **Conflict Radar Alert Banner** indicating potential overlap.

---

### Minute 3: Conflict Radar — Signature Explainable Candidate Review
1. Click **Conflict Radar** in the sidebar.
2. Highlight the top candidate pair:
   - Case A: `RB-2026-0101` (Regulation Bureau) &harr; Case B: `PGRC-2026-4409` (Public Grievance Cell).
   - High Priority Composite Match Score: **85/100**.
3. Expand the **"Why was this flagged?"** explainability card:
   - Signal 1: Exact AICTE Permanent ID match (+45 pts).
   - Signal 2: Name/Address token similarity (+10 pts).
   - Signal 3: Identical category `FACULTY_NORMS` (+15 pts).
   - Signal 4: Narrative description keyword match (+5 pts).
   - Signal 5: Active cross-bureau coordination need (+10 pts).
4. Emphasize: *The algorithm explains why it flagged the pair; it does not automatically merge cases or make legal decisions.*
5. Click **"Link Related"**:
   - Select Relationship Type: `CROSS_BUREAU_COORDINATION`.
   - Enter rationale: *"Confirmed concurrent inspection and student complaints regarding CSE faculty deficiency."*
   - Click **Confirm Decision**.
   - Show that candidate moves to `LINKED` status, and timeline actions are atomically inserted on both cases.

---

### Minute 4: Workflow Integrity, Deadline Engine & Audit Trail
1. Return to **My Work**:
   - Open case `RB-2026-0101`.
   - View the chronological timeline showing the `OVERLAP_LINKED` entry.
   - Click **Transfer Bureau** &rarr; select target bureau `PGRC`, enter reason *"Coordinating with student grievance cell"*, and submit.
   - Observe that the case version increments from `v1` to `v2` and status updates to `TRANSFERRED`.
2. Navigate to **Reports**:
   - Show live SLA compliance rate and ageing distribution.
   - Demonstrate the **CSV Ingestion Workbench**: drag `scripts/demo_cases.csv`, click Ingest, and show idempotent duplicate detection (0 duplicates created).
3. Switch role to **Vikram Sethi (Auditor)**:
   - Click **Security & Audit** tab in the sidebar.
   - Show the immutable audit trail recording every login, transfer, overlap link decision, and authorization check.
4. Conclude: *The system empowers AICTE officials with consolidated visibility, explainable candidate detection, and complete accountability.*
