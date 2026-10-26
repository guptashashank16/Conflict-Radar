from typing import List, Dict, Any
from fastapi import APIRouter, Depends, UploadFile, File, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import desc

from backend.app.core.database import get_db
from backend.app.core.permissions import get_current_user, require_permission
from backend.app.models.user import User
from backend.app.models.audit import ImportJob
from backend.app.services.import_service import process_csv_import

router = APIRouter(prefix="/imports", tags=["CSV Ingestion & Integration Jobs"])

@router.post("/csv")
async def upload_csv_file(
    file: UploadFile = File(...),
    current_user: User = Depends(require_permission("case.create")),
    db: Session = Depends(get_db)
):
    if not file.filename.endswith(".csv"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only CSV files (.csv) are accepted for data ingestion"
        )

    content = await file.read()
    if len(content) > 10 * 1024 * 1024:  # 10MB limit
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="File size exceeds maximum permitted limit (10MB)"
        )

    return process_csv_import(
        db=db,
        file_bytes=content,
        file_name=file.filename,
        current_user=current_user
    )

@router.get("")
def list_import_jobs(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    jobs = db.query(ImportJob).order_by(desc(ImportJob.created_at)).limit(20).all()
    return [{
        "id": j.id,
        "file_name": j.file_name,
        "source_checksum": j.source_checksum[:12] + "...",
        "total_rows": j.total_rows,
        "created_count": j.created_count,
        "skipped_count": j.skipped_count,
        "failed_count": j.failed_count,
        "status": j.status,
        "created_at": j.created_at
    } for j in jobs]
