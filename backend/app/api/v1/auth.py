from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from backend.app.core.database import get_db
from backend.app.core.security import verify_password, create_access_token, get_password_hash
from backend.app.core.permissions import get_current_user, ROLE_PERMISSIONS
from backend.app.core.audit import log_audit_event
from backend.app.models.user import User
from backend.app.schemas.auth import Token, LoginRequest, SwitchDemoRoleRequest, UserOut

router = APIRouter(prefix="/auth", tags=["Authentication & Identity"])

DEMO_PERSONAS = [
    {
        "email": "oversight@aicte.gov.in",
        "full_name": "Dr. Ramesh Verma",
        "role": "OVERSIGHT_OFFICER",
        "category": "Competent Authority",
        "designation": "Adviser & Competent Approving Authority",
        "office": "AICTE Headquarters, New Delhi",
        "demo_status": "Fictional Demo Profile",
        "bureau_scope": "ALL",
        "region_scope": "ALL",
        "description": "Cross-bureau institutional oversight, conflict arbitration, and disposition authority."
    },
    {
        "email": "rb.officer@aicte.gov.in",
        "full_name": "Smt. Sunita Sharma",
        "role": "BUREAU_OFFICER_RB",
        "category": "Regional Scrutiny Officer",
        "designation": "Scrutiny Officer - Norms & Compliance",
        "office": "Regulation Bureau, New Delhi",
        "demo_status": "Fictional Demo Profile",
        "bureau_scope": "RB",
        "region_scope": "ALL",
        "description": "Reviews institutional affiliation norms, faculty deficiency cases, and compliance orders."
    },
    {
        "email": "pgrc.officer@aicte.gov.in",
        "full_name": "Shri Arvind Patel",
        "role": "BUREAU_OFFICER_PGRC",
        "category": "Regional Scrutiny Officer",
        "designation": "Public Grievance Redressal Officer",
        "office": "Public Grievance Redressal Cell (PGRC), New Delhi",
        "demo_status": "Fictional Demo Profile",
        "bureau_scope": "PGRC",
        "region_scope": "ALL",
        "description": "Investigates citizen, faculty, and student petitions across affiliated colleges."
    },
    {
        "email": "regional.north@aicte.gov.in",
        "full_name": "Er. Rajesh Kumar",
        "role": "REGIONAL_OFFICER",
        "category": "Regional Supervisor",
        "designation": "Regional Officer & Supervisor (North-West)",
        "office": "North-West Regional Office (NWRO), Chandigarh",
        "demo_status": "Fictional Demo Profile",
        "bureau_scope": "ALL",
        "region_scope": "Northern",
        "description": "Supervises inspections and institution verifications for Northern & North-West jurisdictions."
    },
    {
        "email": "coordinator@aicte.gov.in",
        "full_name": "Pooja Deshmukh",
        "role": "CASE_COORDINATOR",
        "category": "Departmental Clearance Officer",
        "designation": "Case Coordination & Clearance Officer",
        "office": "Central Coordination Unit, AICTE HQ",
        "demo_status": "Fictional Demo Profile",
        "bureau_scope": "ALL",
        "region_scope": "ALL",
        "description": "Facilitates multi-bureau handoffs, evidence linkage, and Conflict Radar verification."
    },
    {
        "email": "auditor@aicte.gov.in",
        "full_name": "Vikram Sethi",
        "role": "AUDITOR",
        "category": "Read-only Auditor",
        "designation": "Independent Compliance & Audit Inspector",
        "office": "Chief Vigilance & Internal Audit Unit",
        "demo_status": "Fictional Demo Profile",
        "bureau_scope": "ALL",
        "region_scope": "ALL",
        "description": "Audits immutability of decision logs, SLA integrity, and administrative compliance."
    },
    {
        "email": "secadmin@aicte.gov.in",
        "full_name": "Admin Control",
        "role": "SECURITY_ADMIN",
        "category": "System Administrator",
        "designation": "System & Security Administrator",
        "office": "E-Governance & IT Cell",
        "demo_status": "Fictional Demo Profile",
        "bureau_scope": "ALL",
        "region_scope": "ALL",
        "description": "System configuration, role provisioning, and cryptographic security auditing."
    }
]

@router.post("/login", response_model=Token)
def login(req: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == req.email.strip().lower()).first()
    if not user:
        # Check if demo persona email
        matched_persona = next((p for p in DEMO_PERSONAS if p["email"].lower() == req.email.strip().lower()), None)
        if matched_persona:
            # Auto-provision demo persona
            user = User(
                email=matched_persona["email"],
                full_name=matched_persona["full_name"],
                role=matched_persona["role"],
                bureau_scope=matched_persona["bureau_scope"],
                region_scope=matched_persona["region_scope"],
                is_active=True,
                hashed_password=get_password_hash("demo123")
            )
            db.add(user)
            db.commit()
            db.refresh(user)
        else:
            log_audit_event(
                db=db,
                event_category="SECURITY",
                event_type="LOGIN_FAILED",
                details={"attempted_email": req.email, "reason": "User not found"}
            )
            db.commit()
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")

    # In demo mode, accept "demo123" or verified hash
    valid = req.password == "demo123" or verify_password(req.password, user.hashed_password)
    if not valid:
        log_audit_event(
            db=db,
            event_category="SECURITY",
            event_type="LOGIN_FAILED",
            details={"attempted_email": req.email, "reason": "Password mismatch"}
        )
        db.commit()
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")

    token = create_access_token(
        subject=user.id,
        extra_claims={
            "email": user.email,
            "role": user.role,
            "bureau_scope": user.bureau_scope,
            "region_scope": user.region_scope
        }
    )

    log_audit_event(
        db=db,
        event_category="SECURITY",
        event_type="LOGIN_SUCCESS",
        actor=user,
        object_type="user",
        object_id=user.id
    )
    db.commit()

    return Token(
        access_token=token,
        token_type="bearer",
        user_id=user.id,
        email=user.email,
        full_name=user.full_name,
        role=user.role,
        bureau_scope=user.bureau_scope,
        region_scope=user.region_scope
    )

@router.get("/me", response_model=UserOut)
def get_me(current_user: User = Depends(get_current_user)):
    return current_user

@router.get("/demo-personas")
def get_demo_personas():
    """Provides a list of available personas for easy hackathon demonstration."""
    return DEMO_PERSONAS

@router.post("/switch-demo-role", response_model=Token)
def switch_demo_role(req: SwitchDemoRoleRequest, db: Session = Depends(get_db)):
    """
    Demo switcher allows the evaluation committee to instantly switch perspectives
    (e.g., test how RB Officer is blocked from viewing PGRC cases, or how Auditor sees audit logs).
    """
    matched = next((p for p in DEMO_PERSONAS if p["role"] == req.role), None)
    if not matched:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Unknown role '{req.role}'")

    user = db.query(User).filter(User.email == matched["email"]).first()
    if not user:
        user = User(
            email=matched["email"],
            full_name=matched["full_name"],
            role=matched["role"],
            bureau_scope=matched["bureau_scope"],
            region_scope=matched["region_scope"],
            is_active=True,
            hashed_password=get_password_hash("demo123")
        )
        db.add(user)
        db.commit()
        db.refresh(user)

    token = create_access_token(
        subject=user.id,
        extra_claims={
            "email": user.email,
            "role": user.role,
            "bureau_scope": user.bureau_scope,
            "region_scope": user.region_scope
        }
    )

    return Token(
        access_token=token,
        token_type="bearer",
        user_id=user.id,
        email=user.email,
        full_name=user.full_name,
        role=user.role,
        bureau_scope=user.bureau_scope,
        region_scope=user.region_scope
    )
