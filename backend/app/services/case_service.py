from typing import Optional, Dict, Any, List
from datetime import datetime, timezone, timedelta
from sqlalchemy.orm import Session
from sqlalchemy import or_, desc
from fastapi import HTTPException, status

from backend.app.models.case import Case, CaseAction, CaseAssignment, CaseLink
from backend.app.models.institution import Institution
from backend.app.models.user import User
from backend.app.models.workflow import CoordinationRequest
from backend.app.core.permissions import enforce_case_scope, is_case_in_scope
from backend.app.core.audit import log_audit_event

VALID_TRANSITIONS = {
    "PENDING": {"UNDER_PROCESS"},
    "UNDER_PROCESS": {"TRANSFERRED", "ESCALATED", "DISPOSED"},
    "TRANSFERRED": {"UNDER_PROCESS"},
    "ESCALATED": {"UNDER_PROCESS"},
    "DISPOSED": {"UNDER_PROCESS"},
}

def list_cases(
    db: Session,
    current_user: User,
    bureau: Optional[str] = None,
    region: Optional[str] = None,
    status_filter: Optional[str] = None,
    priority: Optional[str] = None,
    sla_status: Optional[str] = None,
    category: Optional[str] = None,
    institution_id: Optional[str] = None,
    search: Optional[str] = None,
    skip: int = 0,
    limit: int = 50
) -> Dict[str, Any]:
    q = db.query(Case)

    # 1. Enforce Bureau Scope
    if current_user.bureau_scope != "ALL":
        q = q.filter(Case.bureau == current_user.bureau_scope)
    elif bureau and bureau != "ALL":
        q = q.filter(Case.bureau == bureau)

    # 2. Enforce Regional Scope & Region Filter
    if current_user.region_scope != "ALL":
        q = q.join(Institution, Case.institution_id == Institution.id).filter(
            Institution.region.ilike(current_user.region_scope)
        )
    elif region and region != "ALL":
        q = q.join(Institution, Case.institution_id == Institution.id).filter(
            Institution.region.ilike(region)
        )

    # 3. Apply Filters
    if status_filter and status_filter != "ALL":
        q = q.filter(Case.status == status_filter)
    if priority and priority != "ALL":
        q = q.filter(Case.priority == priority)
    if sla_status and sla_status != "ALL":
        q = q.filter(Case.sla_status == sla_status)
    if category and category != "ALL":
        q = q.filter(Case.category == category)
    if institution_id:
        q = q.filter(Case.institution_id == institution_id)

    # 4. Search Filter
    if search:
        term = f"%{search.strip()}%"
        q = q.filter(
            or_(
                Case.source_case_id.ilike(term),
                Case.subject.ilike(term),
                Case.description.ilike(term),
                Case.category.ilike(term)
            )
        )

    total = q.count()
    items = q.order_by(desc(Case.created_at)).offset(skip).limit(limit).all()

    return {
        "total": total,
        "items": items,
        "skip": skip,
        "limit": limit
    }

def get_case_by_id(db: Session, case_id: str, current_user: User) -> Case:
    case = db.query(Case).filter(Case.id == case_id).first()
    if not case:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Case not found")

    region = case.institution.region if case.institution else None
    enforce_case_scope(current_user, case.bureau, region)
    return case

def create_case(
    db: Session,
    current_user: User,
    source_system: str,
    source_case_id: str,
    bureau: str,
    category: str,
    subject: str,
    description: str,
    institution_id: Optional[str] = None,
    priority: str = "MEDIUM",
    target_days: int = 7
) -> Case:
    # Validate bureau creation permission
    if current_user.bureau_scope != "ALL" and current_user.bureau_scope != bureau:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Cannot create cases for bureau '{bureau}' outside assigned scope"
        )

    # Check for duplicate source case id
    existing = db.query(Case).filter(
        Case.source_system == source_system,
        Case.source_case_id == source_case_id
    ).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Case with source system '{source_system}' and ID '{source_case_id}' already exists"
        )

    due_at = datetime.now(timezone.utc) + timedelta(days=target_days)

    case = Case(
        source_system=source_system,
        source_case_id=source_case_id,
        institution_id=institution_id,
        bureau=bureau,
        category=category,
        subject=subject,
        description=description,
        status="PENDING",
        priority=priority,
        due_at=due_at,
        sla_status="NORMAL",
        version=1
    )
    db.add(case)
    db.flush()

    # Timeline action
    action = CaseAction(
        case_id=case.id,
        actor_id=current_user.id,
        action_type="CREATED",
        from_status=None,
        to_status="PENDING",
        remarks=f"Case registered in {bureau} by {current_user.full_name}"
    )
    db.add(action)

    log_audit_event(
        db=db,
        event_category="BUSINESS",
        event_type="CASE_CREATED",
        actor=current_user,
        object_type="case",
        object_id=case.id,
        details={"source_case_id": source_case_id, "bureau": bureau, "category": category}
    )

    db.commit()
    db.refresh(case)
    return case

def update_case_workflow_status(
    db: Session,
    case_id: str,
    current_user: User,
    to_status: str,
    expected_version: int,
    remarks: str,
    disposition_summary: Optional[str] = None
) -> Case:
    case = get_case_by_id(db, case_id, current_user)

    # 1. Optimistic Concurrency Control (OCC) Check
    if case.version != expected_version:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Conflict: Case version mismatch (expected {expected_version}, current {case.version}). The record was modified by another officer."
        )

    # 2. Validate Transition
    from_status = case.status
    allowed = VALID_TRANSITIONS.get(from_status, set())
    if to_status not in allowed:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid state transition from '{from_status}' to '{to_status}'. Allowed: {sorted(list(allowed))}"
        )

    # 3. Role validation for special transitions
    if to_status == "DISPOSED" and not disposition_summary:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Disposition summary is mandatory when disposing a case"
        )
    if from_status == "DISPOSED" and to_status == "UNDER_PROCESS":
        # Reopening requires Oversight Officer or Security Admin
        if current_user.role not in {"OVERSIGHT_OFFICER", "SECURITY_ADMIN"}:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only Oversight Officers and Administrators can reopen a disposed case"
            )

    # 4. Apply status update
    case.status = to_status
    case.version += 1
    if to_status == "DISPOSED":
        case.disposition_summary = disposition_summary
        case.disposed_at = datetime.now(timezone.utc)
    elif from_status == "DISPOSED" and to_status == "UNDER_PROCESS":
        case.disposition_summary = None
        case.disposed_at = None

    # 5. Insert Timeline Action
    action = CaseAction(
        case_id=case.id,
        actor_id=current_user.id,
        action_type="STATUS_CHANGED",
        from_status=from_status,
        to_status=to_status,
        remarks=remarks
    )
    db.add(action)

    log_audit_event(
        db=db,
        event_category="BUSINESS",
        event_type=f"CASE_STATUS_{to_status}",
        actor=current_user,
        object_type="case",
        object_id=case.id,
        details={"from": from_status, "to": to_status, "remarks": remarks}
    )

    db.commit()
    db.refresh(case)
    return case

def assign_case(
    db: Session,
    case_id: str,
    current_user: User,
    assignee_id: str,
    expected_version: int,
    reason: str
) -> Case:
    case = get_case_by_id(db, case_id, current_user)

    if case.version != expected_version:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Conflict: Case version mismatch (expected {expected_version}, current {case.version})."
        )

    assignee = db.query(User).filter(User.id == assignee_id).first()
    if not assignee:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Assignee user not found")

    # If case was pending, transition to UNDER_PROCESS
    from_status = case.status
    if case.status == "PENDING":
        case.status = "UNDER_PROCESS"

    # End previous assignment if any
    now = datetime.now(timezone.utc)
    prev_assignment = db.query(CaseAssignment).filter(
        CaseAssignment.case_id == case.id,
        CaseAssignment.ended_at == None
    ).first()
    if prev_assignment:
        prev_assignment.ended_at = now

    # Create new assignment
    new_assignment = CaseAssignment(
        case_id=case.id,
        assigned_to_id=assignee.id,
        bureau=case.bureau,
        assigned_at=now,
        reason=reason
    )
    db.add(new_assignment)

    case.current_assignee_id = assignee.id
    case.version += 1

    action = CaseAction(
        case_id=case.id,
        actor_id=current_user.id,
        action_type="ASSIGNED",
        from_status=from_status,
        to_status=case.status,
        remarks=f"Assigned to {assignee.full_name} ({assignee.role}). Reason: {reason}"
    )
    db.add(action)

    log_audit_event(
        db=db,
        event_category="BUSINESS",
        event_type="CASE_ASSIGNED",
        actor=current_user,
        object_type="case",
        object_id=case.id,
        details={"assignee": assignee.email, "reason": reason}
    )

    db.commit()
    db.refresh(case)
    return case

def transfer_case(
    db: Session,
    case_id: str,
    current_user: User,
    target_bureau: str,
    expected_version: int,
    reason: str
) -> Case:
    case = get_case_by_id(db, case_id, current_user)

    if case.version != expected_version:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Conflict: Case version mismatch (expected {expected_version}, current {case.version})."
        )

    if case.bureau == target_bureau:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot transfer case to its current bureau ('{target_bureau}')"
        )

    from_bureau = case.bureau
    from_status = case.status
    
    # Update status to TRANSFERRED
    case.status = "TRANSFERRED"
    case.bureau = target_bureau
    case.current_assignee_id = None  # Reset assignee for receiving bureau
    case.version += 1

    # End current assignment
    now = datetime.now(timezone.utc)
    prev = db.query(CaseAssignment).filter(
        CaseAssignment.case_id == case.id,
        CaseAssignment.ended_at == None
    ).first()
    if prev:
        prev.ended_at = now

    action = CaseAction(
        case_id=case.id,
        actor_id=current_user.id,
        action_type="TRANSFERRED",
        from_status=from_status,
        to_status="TRANSFERRED",
        remarks=f"Transferred from {from_bureau} to {target_bureau}. Reason: {reason}"
    )
    db.add(action)

    log_audit_event(
        db=db,
        event_category="BUSINESS",
        event_type="CASE_TRANSFERRED",
        actor=current_user,
        object_type="case",
        object_id=case.id,
        details={"from_bureau": from_bureau, "target_bureau": target_bureau, "reason": reason}
    )

    db.commit()
    db.refresh(case)
    return case

def request_coordination(
    db: Session,
    case_id: str,
    current_user: User,
    target_bureau: str,
    subject: str,
    message: str
) -> CoordinationRequest:
    case = get_case_by_id(db, case_id, current_user)

    req = CoordinationRequest(
        source_case_id=case.id,
        requesting_bureau=case.bureau,
        target_bureau=target_bureau,
        requested_by_id=current_user.id,
        status="PENDING",
        subject=subject,
        message=message
    )
    db.add(req)

    # Timeline entry
    action = CaseAction(
        case_id=case.id,
        actor_id=current_user.id,
        action_type="COORDINATION_REQUESTED",
        from_status=case.status,
        to_status=case.status,
        remarks=f"Cross-bureau coordination requested with {target_bureau}: {subject}"
    )
    db.add(action)

    log_audit_event(
        db=db,
        event_category="BUSINESS",
        event_type="COORDINATION_REQUESTED",
        actor=current_user,
        object_type="case",
        object_id=case.id,
        details={"target_bureau": target_bureau, "subject": subject}
    )

    db.commit()
    db.refresh(req)
    return req
