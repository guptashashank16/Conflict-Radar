from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import or_, func
from fastapi import HTTPException, status
from backend.app.models.institution import Institution, InstitutionAlias
from backend.app.models.case import Case, CaseLink
from backend.app.models.overlap import OverlapCandidate
from backend.app.models.user import User
from backend.app.core.permissions import is_case_in_scope

def search_institutions(
    db: Session,
    query: Optional[str] = None,
    region: Optional[str] = None,
    approval_status: Optional[str] = None,
    skip: int = 0,
    limit: int = 50
) -> Dict[str, Any]:
    q = db.query(Institution)
    
    if query:
        search_term = f"%{query.strip()}%"
        # Search canonical name, permanent id, or alias
        alias_subquery = db.query(InstitutionAlias.institution_id).filter(
            InstitutionAlias.alias_name.ilike(search_term)
        ).subquery()

        q = q.filter(
            or_(
                Institution.canonical_name.ilike(search_term),
                Institution.aicte_permanent_id.ilike(search_term),
                Institution.address.ilike(search_term),
                Institution.id.in_(alias_subquery)
            )
        )
        
    if region and region != "ALL":
        q = q.filter(func.lower(Institution.region) == region.lower())
        
    if approval_status and approval_status != "ALL":
        q = q.filter(Institution.approval_status == approval_status)
        
    total = q.count()
    items = q.order_by(Institution.canonical_name.asc()).offset(skip).limit(limit).all()
    
    return {
        "total": total,
        "items": items,
        "skip": skip,
        "limit": limit
    }

def get_institution_360(db: Session, institution_id: str, current_user: User) -> Dict[str, Any]:
    inst = db.query(Institution).filter(Institution.id == institution_id).first()
    if not inst:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Institution not found")
        
    # Retrieve all cases for this institution
    all_cases = db.query(Case).filter(Case.institution_id == institution_id).order_by(Case.created_at.desc()).all()
    
    # Filter cases according to user's bureau/region scope
    scoped_cases = []
    redacted_cases_count = 0
    
    for c in all_cases:
        if is_case_in_scope(current_user, c.bureau, inst.region):
            scoped_cases.append(c)
        else:
            redacted_cases_count += 1
            
    # Group cases by bureau
    bureau_cases: Dict[str, List[Any]] = {}
    status_counts = {"PENDING": 0, "UNDER_PROCESS": 0, "TRANSFERRED": 0, "ESCALATED": 0, "DISPOSED": 0}
    overdue_count = 0
    at_risk_count = 0
    
    for c in scoped_cases:
        bureau_cases.setdefault(c.bureau, []).append({
            "id": c.id,
            "source_system": c.source_system,
            "source_case_id": c.source_case_id,
            "bureau": c.bureau,
            "category": c.category,
            "subject": c.subject,
            "status": c.status,
            "priority": c.priority,
            "due_at": c.due_at,
            "sla_status": c.sla_status,
            "created_at": c.created_at
        })
        if c.status in status_counts:
            status_counts[c.status] += 1
        if c.sla_status == "OVERDUE":
            overdue_count += 1
        elif c.sla_status == "WARNING":
            at_risk_count += 1

    # Overlaps involving this institution's cases
    case_ids = [c.id for c in scoped_cases]
    overlaps = []
    if case_ids:
        raw_overlaps = db.query(OverlapCandidate).filter(
            or_(
                OverlapCandidate.case_a_id.in_(case_ids),
                OverlapCandidate.case_b_id.in_(case_ids)
            )
        ).all()
        for o in raw_overlaps:
            overlaps.append({
                "id": o.id,
                "case_a_id": o.case_a_id,
                "case_b_id": o.case_b_id,
                "composite_score": o.composite_score,
                "review_status": o.review_status,
                "explanation": o.explanation
            })

    # Reviewed Aliases
    aliases = [{
        "id": a.id,
        "alias_name": a.alias_name,
        "source": a.source,
        "review_status": a.review_status
    } for a in inst.aliases]

    return {
        "institution": {
            "id": inst.id,
            "aicte_permanent_id": inst.aicte_permanent_id,
            "canonical_name": inst.canonical_name,
            "region": inst.region,
            "state": inst.state,
            "address": inst.address,
            "approval_status": inst.approval_status,
            "created_at": inst.created_at,
            "updated_at": inst.updated_at
        },
        "aliases": aliases,
        "cases_by_bureau": bureau_cases,
        "total_accessible_cases": len(scoped_cases),
        "redacted_cases_count": redacted_cases_count,
        "status_summary": status_counts,
        "sla_summary": {
            "overdue": overdue_count,
            "at_risk": at_risk_count,
            "normal": len(scoped_cases) - overdue_count - at_risk_count
        },
        "active_overlaps": overlaps
    }
