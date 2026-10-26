import os
import sys
import random
from datetime import datetime, timezone, timedelta

# Add workspace to sys.path so backend imports succeed
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from backend.app.core.database import SessionLocal, Base, engine
from backend.app.models.institution import Institution, InstitutionAlias
from backend.app.models.case import Case, CaseAction, CaseAssignment, CaseLink
from backend.app.models.workflow import CoordinationRequest, SLAPolicy, Notification
from backend.app.models.user import User
from backend.app.core.security import get_password_hash
from backend.app.services.overlap_service import scan_all_cases_for_overlaps
from backend.app.services.sla_service import evaluate_deadlines_and_slas
from backend.app.api.v1.auth import DEMO_PERSONAS

REGIONS = ["Northern", "Western", "Southern", "Central", "Eastern"]
STATES = {
    "Northern": ["Delhi", "Punjab", "Haryana", "Uttar Pradesh"],
    "Western": ["Maharashtra", "Gujarat", "Rajasthan"],
    "Southern": ["Karnataka", "Tamil Nadu", "Telangana", "Kerala"],
    "Central": ["Madhya Pradesh", "Chhattisgarh"],
    "Eastern": ["West Bengal", "Odisha", "Bihar"]
}

CATEGORIES = [
    "FACULTY_NORMS",
    "INFRASTRUCTURE_DEFICIT",
    "ADMISSION_FRAUD",
    "CAPITATION_FEE",
    "GOVERNANCE",
    "LAB_EQUIPMENT",
    "RAGGING",
    "SALARY_IRREGULARITY"
]

BUREAUS = ["RB", "PGRC", "APPROVAL", "VIGILANCE"]

def seed_database():
    print("Initializing database tables...")
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    try:
        # 1. Seed Demo Users
        print("Seeding demonstration user accounts...")
        users = []
        for persona in DEMO_PERSONAS:
            existing = db.query(User).filter(User.email == persona["email"]).first()
            if not existing:
                u = User(
                    email=persona["email"],
                    full_name=persona["full_name"],
                    role=persona["role"],
                    bureau_scope=persona["bureau_scope"],
                    region_scope=persona["region_scope"],
                    is_active=True,
                    hashed_password=get_password_hash("demo123")
                )
                db.add(u)
                users.append(u)
            else:
                users.append(existing)
        db.commit()

        # 2. Seed 30 Synthetic Institutions
        print("Seeding 30 synthetic institutions with verified aliases...")
        institution_templates = [
            ("Apex Institute of Technology", "1-10029341", "Western", "Maharashtra", "Survey No 45, Hinjawadi Phase 2, Pune"),
            ("Bharatiya College of Engineering & Research", "1-10029342", "Northern", "Uttar Pradesh", "Plot 12, Knowledge Park III, Greater Noida"),
            ("Chaitanya Institute of Pharmaceutical Sciences", "1-10029343", "Southern", "Telangana", "NH-65, Kishanpura, Hanamkonda, Warangal"),
            ("Dr. APJ Abdul Kalam Technical Campus", "1-10029344", "Northern", "Delhi", "Sec-14 Dwarka, New Delhi"),
            ("Evergreen Polytechnic & Vocational Studies", "1-10029345", "Central", "Madhya Pradesh", "Industrial Area, Govindpura, Bhopal"),
            ("Future Horizon University of Applied Sciences", "1-10029346", "Western", "Gujarat", "Near SG Highway, Gota, Ahmedabad"),
            ("Grand Valley Engineering College", "1-10029347", "Southern", "Karnataka", "Bannerghatta Main Road, Bangalore"),
            ("Himalayan Institute of Technology & Management", "1-10029348", "Northern", "Punjab", "GT Road, Phagwara, Jalandhar"),
            ("Indus Valley School of Architecture", "1-10029349", "Western", "Rajasthan", "Sitapura Industrial Area, Jaipur"),
            ("Jawahar National Institute of Technology", "1-10029350", "Central", "Chhattisgarh", "G.E. Road, Raipur"),
            ("Konkan Maritime Academy", "1-10029351", "Western", "Maharashtra", "Old Mumbai-Pune Highway, Panvel"),
            ("Laxmi Devi Memorial College of Management", "1-10029352", "Northern", "Haryana", "Sohna Road, Gurugram"),
            ("Malabar Institute of Engineering Studies", "1-10029353", "Southern", "Kerala", "Vatakara, Kozhikode"),
            ("Nalanda Global Institute of Technology", "1-10029354", "Eastern", "Bihar", "Boring Road, Patna"),
            ("Oriental Institute of Science & Technology", "1-10029355", "Central", "Madhya Pradesh", "Raisen Road, Bhopal"),
            ("Pragati College of Engineering & Technology", "1-10029356", "Southern", "Tamil Nadu", "Kancheepuram Road, Chennai"),
            ("Quantum Valley Institute of Advanced Computing", "1-10029357", "Southern", "Karnataka", "Electronic City Phase 1, Bangalore"),
            ("Rajdhani Institute of Polytechnic Studies", "1-10029358", "Northern", "Delhi", "Rohini Sector 22, New Delhi"),
            ("Saraswati Institute of Technology & Design", "1-10029359", "Western", "Maharashtra", "Wakad Bypass, Pune"),
            ("Trident College of Aviation & Engineering", "1-10029360", "Eastern", "Odisha", "Chandaka Industrial Estate, Bhubaneswar"),
            ("Utkal Institute of Technology & Research", "1-10029361", "Eastern", "Odisha", "Infocity, Patia, Bhubaneswar"),
            ("Vidyapeeth College of Applied Technology", "1-10029362", "Western", "Gujarat", "Kalawad Road, Rajkot"),
            ("Western Ghats Institute of Polytechnic", "1-10029363", "Southern", "Karnataka", "Kuntikana, Mangalore"),
            ("Xavier Technical Institute of Eastern India", "1-10029364", "Eastern", "West Bengal", "Action Area II, New Town, Kolkata"),
            ("Yaduvanshi College of Engineering", "1-10029365", "Northern", "Haryana", "Narnaul Road, Mahendragarh"),
            ("Zenith National Institute of Computing", "1-10029366", "Central", "Madhya Pradesh", "AB Road, Indore"),
            ("Surya Global Academy of Technology", "1-10029367", "Northern", "Uttar Pradesh", "Sultanpur Road, Lucknow"),
            ("Deccan Plateau Engineering College", "1-10029368", "Southern", "Telangana", "Gachibowli, Hyderabad"),
            ("Thakur Institute of Technical Training", "1-10029369", "Western", "Maharashtra", "Kandivali East, Mumbai"),
            ("Coastal Karnataka Institute of Management", "1-10029370", "Southern", "Karnataka", "Surathkal, Mangalore")
        ]

        institutions = []
        for name, perm_id, region, state, address in institution_templates:
            existing = db.query(Institution).filter(Institution.aicte_permanent_id == perm_id).first()
            if not existing:
                inst = Institution(
                    aicte_permanent_id=perm_id,
                    canonical_name=f"[SYNTHETIC] {name}",
                    region=region,
                    state=state,
                    address=address,
                    approval_status=random.choice(["Approved", "Approved", "Approved", "Under Scrutiny"])
                )
                db.add(inst)
                db.flush()
                # Add aliases
                alias = InstitutionAlias(
                    institution_id=inst.id,
                    alias_name=name.replace("Institute of Technology", "IT").replace("Engineering College", "EC"),
                    source="PGRC_HISTORICAL_INTAKE",
                    review_status="VERIFIED"
                )
                db.add(alias)
                institutions.append(inst)
            else:
                institutions.append(existing)
        db.commit()

        # 3. Seed 120 Synthetic Cases with deliberate conflict and coordination scenarios
        print("Seeding 120 synthetic cases across bureaus (RB, PGRC, Approval, Vigilance)...")
        now = datetime.now(timezone.utc)
        cases = []

        # Specific Scenario 1: High Priority Cross-Bureau Overlap (Apex Institute of Technology)
        # Case A in RB, Case B in PGRC on same faculty shortage problem
        inst_apex = institutions[0]
        case_rb_1 = Case(
            source_system="RB_PORTAL",
            source_case_id="RB-2026-0101",
            institution_id=inst_apex.id,
            bureau="RB",
            category="FACULTY_NORMS",
            subject="[SYNTHETIC] Severe Faculty Shortage in CSE & AI Departments",
            description="Surprise regulatory inspection revealed 42% regular cadre vacancy and unapproved adjunct arrangements.",
            status="UNDER_PROCESS",
            priority="CRITICAL",
            due_at=now + timedelta(hours=36),  # Warning state
            sla_status="WARNING",
            version=1,
            created_at=now - timedelta(days=12)
        )
        case_pgrc_1 = Case(
            source_system="PGRC_INTAKE",
            source_case_id="PGRC-2026-4409",
            institution_id=inst_apex.id,
            bureau="PGRC",
            category="FACULTY_NORMS",
            subject="[SYNTHETIC] Mass Student Complaint: No Professors Assigned for Core CSE Subjects",
            description="Second and third year computer engineering students filed joint grievance regarding vacant faculty posts and cancelled labs.",
            status="UNDER_PROCESS",
            priority="HIGH",
            due_at=now + timedelta(hours=48),
            sla_status="WARNING",
            version=1,
            created_at=now - timedelta(days=8)
        )
        db.add_all([case_rb_1, case_pgrc_1])
        cases.extend([case_rb_1, case_pgrc_1])

        # Specific Scenario 2: Overdue Case with Coordination Request (Bharatiya College)
        inst_bharat = institutions[1]
        case_overdue = Case(
            source_system="RB_PORTAL",
            source_case_id="RB-2026-0102",
            institution_id=inst_bharat.id,
            bureau="RB",
            category="INFRASTRUCTURE_DEFICIT",
            subject="[SYNTHETIC] Non-functional Chemistry & Fluid Mechanics Labs",
            description="Inspection report noted severe deficiency in lab equipment, fire safety compliance, and emergency exits.",
            status="ESCALATED",
            priority="CRITICAL",
            due_at=now - timedelta(days=3),  # Overdue
            sla_status="OVERDUE",
            version=2,
            created_at=now - timedelta(days=25)
        )
        db.add(case_overdue)
        cases.append(case_overdue)

        # Specific Scenario 3: Transferred Case (Chaitanya Institute)
        inst_chaitanya = institutions[2]
        case_transferred = Case(
            source_system="PGRC_INTAKE",
            source_case_id="PGRC-2026-5512",
            institution_id=inst_chaitanya.id,
            bureau="RB",  # Transferred from PGRC to RB
            category="ADMISSION_FRAUD",
            subject="[SYNTHETIC] Admission Capitation Fee Allegation",
            description="Grievance regarding unreceipted development fees during NRI quota admissions transferred to Regulation Bureau for scrutiny.",
            status="TRANSFERRED",
            priority="HIGH",
            due_at=now + timedelta(days=4),
            sla_status="NORMAL",
            version=2,
            created_at=now - timedelta(days=6)
        )
        db.add(case_transferred)
        cases.append(case_transferred)

        # Generate Remaining Cases up to 120
        complaint_narratives = [
            ("FACULTY_NORMS", "Non-payment of 7th Pay Commission scale arrears to assistant professors", "Faculty association submitted documented salary ledger evidence of 8 months delay."),
            ("INFRASTRUCTURE_DEFICIT", "Inadequate classroom carpet area and missing disabled access ramps", "Campus architectural audit highlighted violations of AICTE approval handbook norms."),
            ("ADMISSION_FRAUD", "Offering unapproved specialized diploma courses under AICTE banner", "Advertisements in local dailies promoting unauthorized dual-degree credentials."),
            ("CAPITATION_FEE", "Demanding mandatory infrastructure development bond from first-year students", "Parents union complaint with bank transaction receipts."),
            ("GOVERNANCE", "Failure to convene statutory Governing Body meetings for two academic cycles", "Nominated member alert regarding lack of academic audit approvals."),
            ("LAB_EQUIPMENT", "Deficient computing facility: only 60 terminals against mandatory 180 requirement", "Inspection report during renewal of approval cycle."),
            ("RAGGING", "Anti-ragging committee non-compliance and hostel surveillance deficiency", "Student welfare complaint regarding lack of mandatory 24x7 warden presence."),
            ("SALARY_IRREGULARITY", "Unauthorized salary deductions and cash kickback demands", "Teaching staff grievance submitted through online portal.")
        ]

        bureau_cycle = ["RB", "PGRC", "APPROVAL", "VIGILANCE"]
        status_cycle = ["PENDING", "UNDER_PROCESS", "UNDER_PROCESS", "ESCALATED", "DISPOSED"]

        for idx in range(len(cases), 120):
            inst = random.choice(institutions)
            cat, subj_tmpl, desc_tmpl = random.choice(complaint_narratives)
            bureau = random.choice(bureau_cycle)
            status = random.choice(status_cycle)
            priority = random.choice(["LOW", "MEDIUM", "HIGH", "CRITICAL"])
            
            # Days offset
            days_ago = random.randint(1, 45)
            created_date = now - timedelta(days=days_ago)
            
            if status == "DISPOSED":
                due_date = created_date + timedelta(days=14)
                sla_val = "NORMAL"
                disp_sum = "[SYNTHETIC] Compliance report verified by zonal committee. Rectification completed."
                disp_at = created_date + timedelta(days=10)
            else:
                due_delta = random.choice([-4, -1, 1, 3, 6, 12])
                due_date = now + timedelta(days=due_delta)
                sla_val = "OVERDUE" if due_delta < 0 else ("WARNING" if due_delta <= 3 else "NORMAL")
                disp_sum = None
                disp_at = None

            c = Case(
                source_system=f"{bureau}_PORTAL",
                source_case_id=f"{bureau}-2026-{2000 + idx}",
                institution_id=inst.id,
                bureau=bureau,
                category=cat,
                subject=f"[SYNTHETIC] {subj_tmpl}",
                description=desc_tmpl,
                status=status,
                priority=priority,
                due_at=due_date,
                sla_status=sla_val,
                disposition_summary=disp_sum,
                disposed_at=disp_at,
                version=1,
                created_at=created_date
            )
            db.add(c)
            cases.append(c)

        db.commit()

        # 4. Add Initial Actions & Assignments to cases
        print("Seeding chronological action timelines...")
        for c in cases[:30]:
            action_created = CaseAction(
                case_id=c.id,
                actor_id=users[0].id if users else None,
                action_type="CREATED",
                from_status=None,
                to_status="PENDING",
                remarks=f"Initial registration in {c.bureau} repository",
                created_at=c.created_at
            )
            db.add(action_created)

            if c.status in ["UNDER_PROCESS", "ESCALATED", "DISPOSED", "TRANSFERRED"]:
                action_assigned = CaseAction(
                    case_id=c.id,
                    actor_id=users[0].id if users else None,
                    action_type="ASSIGNED",
                    from_status="PENDING",
                    to_status="UNDER_PROCESS",
                    remarks="Assigned to primary desk officer for initial verification and document check",
                    created_at=c.created_at + timedelta(days=1)
                )
                db.add(action_assigned)

            if c.status == "ESCALATED":
                action_esc = CaseAction(
                    case_id=c.id,
                    actor_id=users[0].id if users else None,
                    action_type="STATUS_CHANGED",
                    from_status="UNDER_PROCESS",
                    to_status="ESCALATED",
                    remarks="SLA breach: Automatically escalated to Regional Oversight Committee",
                    created_at=c.created_at + timedelta(days=8)
                )
                db.add(action_esc)
            elif c.status == "DISPOSED":
                action_disp = CaseAction(
                    case_id=c.id,
                    actor_id=users[0].id if users else None,
                    action_type="DISPOSED",
                    from_status="UNDER_PROCESS",
                    to_status="DISPOSED",
                    remarks=c.disposition_summary or "Disposed after inspection closure",
                    created_at=c.disposed_at or (c.created_at + timedelta(days=12))
                )
                db.add(action_disp)

        db.commit()

        # 5. Execute Conflict Radar Scan to raise explainable candidate overlaps
        print("Running initial Conflict Radar matching scan...")
        scan_count = scan_all_cases_for_overlaps(db)
        print(f"Conflict Radar generated {scan_count} explainable candidate pairs.")

        # 6. Execute SLA and Deadline scan
        print("Evaluating SLA warning and overdue thresholds...")
        sla_results = evaluate_deadlines_and_slas(db)
        print(f"SLA Scan Results: {sla_results}")

        print("=== SYNTHETIC DATA SEEDING COMPLETE ===")
        print(f"Institutions: {len(institutions)}")
        print(f"Cases: {len(cases)}")
        print(f"Demo Users: {len(users)}")

    except Exception as e:
        print(f"Error seeding database: {e}")
        db.rollback()
        raise
    finally:
        db.close()

if __name__ == "__main__":
    seed_database()
