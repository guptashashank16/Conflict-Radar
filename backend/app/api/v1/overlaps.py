from typing import Optional, Dict, Any
from fastapi import APIRouter, Depends, Query, HTTPException, status
from sqlalchemy.orm import Session

from backend.app.core.database import get_db
from backend.app.core.permissions import get_current_user, require_permission
from backend.app.models.user import User
from backend.app.services.overlap_service import (
    list_overlap_candidates,
    process_overlap_decision,
    scan_all_cases_for_overlaps
)
from backend.app.schemas.overlap import OverlapDecisionRequest

router = APIRouter(prefix="/overlaps", tags=["Conflict Radar & Overlap Review"])

@router.get("")
def get_overlaps_queue(
    review_status: Optional[str] = Query("UNREVIEWED", description="Filter by status: UNREVIEWED, LINKED, DISMISSED, DEFERRED, or ALL"),
    min_score: int = Query(0, ge=0, le=100),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return list_overlap_candidates(
        db=db,
        current_user=current_user,
        review_status=review_status,
        min_score=min_score,
        skip=skip,
        limit=limit
    )

@router.post("/{candidate_id}/decision")
def submit_decision(
    candidate_id: str,
    req: OverlapDecisionRequest,
    current_user: User = Depends(require_permission("overlap.review")),
    db: Session = Depends(get_db)
):
    candidate = process_overlap_decision(
        db=db,
        candidate_id=candidate_id,
        current_user=current_user,
        decision=req.decision,
        reason=req.reason,
        relationship_type=req.relationship_type
    )
    return {
        "id": candidate.id,
        "review_status": candidate.review_status,
        "review_reason": candidate.review_reason,
        "reviewed_at": candidate.reviewed_at,
        "reviewed_by": current_user.full_name
    }

@router.post("/scan")
def trigger_scan(
    current_user: User = Depends(require_permission("overlap.review")),
    db: Session = Depends(get_db)
):
    count = scan_all_cases_for_overlaps(db)
    return {
        "status": "success",
        "message": f"Conflict Radar scan completed. Evaluated candidate pairs and identified {count} matches above threshold."
    }
