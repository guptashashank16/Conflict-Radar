from typing import Optional, Dict, Any, List
from fastapi import APIRouter, Depends, Query, HTTPException, status
from sqlalchemy.orm import Session

from backend.app.core.database import get_db
from backend.app.core.permissions import get_current_user, require_permission
from backend.app.models.user import User
from backend.app.models.case import Case, CaseAction
from backend.app.services.case_service import (
    list_cases,
    get_case_by_id,
    create_case,
    update_case_workflow_status,
    assign_case,
    transfer_case,
    request_coordination
)
from backend.app.schemas.case import (
    CaseOut,
    CaseCreate,
    CaseStatusUpdate,
    CaseAssign,
    CaseTransfer,
    CaseCoordinationRequest,
    CaseActionOut
)

router = APIRouter(prefix="/cases", tags=["Case Management & Workflow"])

def serialize_case(c: Case) -> Dict[str, Any]:
    return {
        "id": c.id,
        "source_system": c.source_system,
        "source_case_id": c.source_case_id,
        "institution_id": c.institution_id,
        "institution_name": c.institution.canonical_name if c.institution else "Unknown",
        "institution_region": c.institution.region if c.institution else "National",
        "aicte_permanent_id": c.institution.aicte_permanent_id if c.institution else None,
        "bureau": c.bureau,
        "category": c.category,
        "subject": c.subject,
        "description": c.description,
        "status": c.status,
        "priority": c.priority,
        "current_assignee_id": c.current_assignee_id,
        "current_assignee_name": c.current_assignee.full_name if c.current_assignee else None,
        "due_at": c.due_at,
        "sla_status": c.sla_status,
        "disposition_summary": c.disposition_summary,
        "disposed_at": c.disposed_at,
        "version": c.version,
        "created_at": c.created_at,
        "updated_at": c.updated_at
    }

@router.get("")
def get_cases_list(
    bureau: Optional[str] = Query(None),
    region: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    priority: Optional[str] = Query(None),
    sla_status: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    institution_id: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    result = list_cases(
        db=db,
        current_user=current_user,
        bureau=bureau,
        region=region,
        status_filter=status,
        priority=priority,
        sla_status=sla_status,
        category=category,
        institution_id=institution_id,
        search=search,
        skip=skip,
        limit=limit
    )
    return {
        "total": result["total"],
        "items": [serialize_case(c) for c in result["items"]],
        "skip": result["skip"],
        "limit": result["limit"]
    }

@router.post("", status_code=status.HTTP_201_CREATED)
def create_new_case(
    req: CaseCreate,
    current_user: User = Depends(require_permission("case.create")),
    db: Session = Depends(get_db)
):
    case = create_case(
        db=db,
        current_user=current_user,
        source_system=req.source_system,
        source_case_id=req.source_case_id,
        bureau=req.bureau,
        category=req.category,
        subject=req.subject,
        description=req.description,
        institution_id=req.institution_id,
        priority=req.priority or "MEDIUM",
        target_days=req.target_days or 7
    )
    return serialize_case(case)

@router.get("/{case_id}")
def get_case_details(
    case_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    case = get_case_by_id(db, case_id, current_user)
    return serialize_case(case)

@router.patch("/{case_id}/status")
def update_status(
    case_id: str,
    req: CaseStatusUpdate,
    current_user: User = Depends(require_permission("case.update")),
    db: Session = Depends(get_db)
):
    case = update_case_workflow_status(
        db=db,
        case_id=case_id,
        current_user=current_user,
        to_status=req.to_status,
        expected_version=req.expected_version,
        remarks=req.remarks,
        disposition_summary=req.disposition_summary
    )
    return serialize_case(case)

@router.post("/{case_id}/assign")
def assign_case_to_user(
    case_id: str,
    req: CaseAssign,
    current_user: User = Depends(require_permission("case.assign")),
    db: Session = Depends(get_db)
):
    case = assign_case(
        db=db,
        case_id=case_id,
        current_user=current_user,
        assignee_id=req.assignee_id,
        expected_version=req.expected_version,
        reason=req.reason
    )
    return serialize_case(case)

@router.post("/{case_id}/transfer")
def transfer_case_to_bureau(
    case_id: str,
    req: CaseTransfer,
    current_user: User = Depends(require_permission("case.transfer")),
    db: Session = Depends(get_db)
):
    case = transfer_case(
        db=db,
        case_id=case_id,
        current_user=current_user,
        target_bureau=req.target_bureau,
        expected_version=req.expected_version,
        reason=req.reason
    )
    return serialize_case(case)

@router.post("/{case_id}/coordination")
def request_case_coordination(
    case_id: str,
    req: CaseCoordinationRequest,
    current_user: User = Depends(require_permission("coordination.manage")),
    db: Session = Depends(get_db)
):
    coord = request_coordination(
        db=db,
        case_id=case_id,
        current_user=current_user,
        target_bureau=req.target_bureau,
        subject=req.subject,
        message=req.message
    )
    return {
        "id": coord.id,
        "source_case_id": coord.source_case_id,
        "requesting_bureau": coord.requesting_bureau,
        "target_bureau": coord.target_bureau,
        "status": coord.status,
        "subject": coord.subject,
        "message": coord.message,
        "created_at": coord.created_at
    }

@router.get("/{case_id}/timeline")
def get_timeline(
    case_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    case = get_case_by_id(db, case_id, current_user)
    actions = db.query(CaseAction).filter(CaseAction.case_id == case.id).order_by(CaseAction.created_at.desc()).all()
    return [{
        "id": a.id,
        "action_type": a.action_type,
        "from_status": a.from_status,
        "to_status": a.to_status,
        "remarks": a.remarks,
        "actor_name": a.actor.full_name if a.actor else "System",
        "created_at": a.created_at
    } for a in actions]
