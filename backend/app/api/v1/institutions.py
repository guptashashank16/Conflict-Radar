from typing import Optional, Dict, Any
from fastapi import APIRouter, Depends, Query, HTTPException, status
from sqlalchemy.orm import Session
from backend.app.core.database import get_db
from backend.app.core.permissions import get_current_user, require_permission
from backend.app.models.user import User
from backend.app.models.institution import Institution
from backend.app.services.institution_service import search_institutions, get_institution_360
from backend.app.schemas.institution import InstitutionCreate, InstitutionOut

router = APIRouter(prefix="/institutions", tags=["Institutions & 360 Profiles"])

@router.get("")
def list_all_institutions(
    query: Optional[str] = Query(None, description="Search by name, AICTE ID, address, or alias"),
    region: Optional[str] = Query(None, description="Filter by region (Northern, Western, Southern, Central)"),
    approval_status: Optional[str] = Query(None, description="Filter by approval status"),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # If regional officer, restrict search to their region
    if current_user.region_scope != "ALL":
        region = current_user.region_scope

    return search_institutions(
        db=db,
        query=query,
        region=region,
        approval_status=approval_status,
        skip=skip,
        limit=limit
    )

@router.get("/{institution_id}")
def get_institution_profile(
    institution_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return get_institution_360(db=db, institution_id=institution_id, current_user=current_user)

@router.post("", response_model=InstitutionOut, status_code=status.HTTP_201_CREATED)
def create_institution(
    req: InstitutionCreate,
    current_user: User = Depends(require_permission("case.create")),
    db: Session = Depends(get_db)
):
    if req.aicte_permanent_id:
        existing = db.query(Institution).filter(Institution.aicte_permanent_id == req.aicte_permanent_id).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Institution with AICTE Permanent ID '{req.aicte_permanent_id}' already exists"
            )

    inst = Institution(
        aicte_permanent_id=req.aicte_permanent_id,
        canonical_name=req.canonical_name,
        region=req.region,
        state=req.state,
        address=req.address,
        approval_status=req.approval_status or "Approved"
    )
    db.add(inst)
    db.commit()
    db.refresh(inst)
    return inst
