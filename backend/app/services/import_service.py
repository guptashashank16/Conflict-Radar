import csv
import io
import hashlib
import json
from typing import Dict, Any, List, Optional
from datetime import datetime, timezone, timedelta
from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from backend.app.models.case import Case, CaseAction
from backend.app.models.institution import Institution, InstitutionAlias
from backend.app.models.audit import ImportJob
from backend.app.models.user import User
from backend.app.core.audit import log_audit_event
from backend.app.services.overlap_service import evaluate_case_pair

REQUIRED_CSV_FIELDS = {"source_system", "source_case_id", "bureau", "category", "subject", "description"}

def compute_checksum(content: bytes) -> str:
    return hashlib.sha256(content).hexdigest()

def process_csv_import(
    db: Session,
    file_bytes: bytes,
    file_name: str,
    current_user: User
) -> Dict[str, Any]:
    checksum = compute_checksum(file_bytes)
    text_content = file_bytes.decode("utf-8-sig", errors="replace")
    reader = csv.DictReader(io.StringIO(text_content))

    if not reader.fieldnames:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Uploaded CSV file is empty or malformed")

    headers = {f.strip().lower() for f in reader.fieldnames}
    missing_fields = REQUIRED_CSV_FIELDS - headers
    if missing_fields:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Missing required CSV column headers: {list(missing_fields)}"
        )

    job = ImportJob(
        file_name=file_name,
        source_checksum=checksum,
        total_rows=0,
        created_count=0,
        updated_count=0,
        skipped_count=0,
        failed_count=0,
        status="PROCESSING",
        created_by_id=current_user.id
    )
    db.add(job)
    db.flush()

    row_errors = []
    created_cases = []
    total_rows = 0

    for row_idx, raw_row in enumerate(reader, start=1):
        total_rows += 1
        # Normalize keys
        row = {k.strip().lower(): (v.strip() if v else "") for k, v in raw_row.items() if k}

        source_system = row.get("source_system")
        source_case_id = row.get("source_case_id")
        bureau = row.get("bureau", "RB").upper()
        category = row.get("category", "GENERAL").upper()
        subject = row.get("subject", "")
        description = row.get("description", "")
        aicte_id = row.get("aicte_permanent_id") or row.get("aicte_id")
        inst_name = row.get("institution_name") or row.get("institution", "Unknown Institution")
        region = row.get("region", "Northern")
        priority = row.get("priority", "MEDIUM").upper()

        if not source_system or not source_case_id or not subject:
            row_errors.append(f"Row {row_idx}: Missing source_system, source_case_id, or subject")
            job.failed_count += 1
            continue

        # 1. Idempotency Check: (source_system, source_case_id)
        existing_case = db.query(Case).filter(
            Case.source_system == source_system,
            Case.source_case_id == source_case_id
        ).first()

        if existing_case:
            # Case already ingested; idempotent skip
            job.skipped_count += 1
            continue

        # 2. Institution Resolution
        inst = None
        if aicte_id:
            inst = db.query(Institution).filter(Institution.aicte_permanent_id == aicte_id).first()
        if not inst and inst_name:
            inst = db.query(Institution).filter(Institution.canonical_name.ilike(inst_name)).first()
        if not inst:
            # Create new canonical institution
            inst = Institution(
                aicte_permanent_id=aicte_id if aicte_id else None,
                canonical_name=inst_name,
                region=region,
                approval_status="Approved"
            )
            db.add(inst)
            db.flush()

        # 3. Create Case
        target_days = 7
        try:
            if row.get("target_days"):
                target_days = int(row.get("target_days"))
        except ValueError:
            pass

        due_at = datetime.now(timezone.utc) + timedelta(days=target_days)

        new_case = Case(
            source_system=source_system,
            source_case_id=source_case_id,
            institution_id=inst.id if inst else None,
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
        db.add(new_case)
        db.flush()

        action = CaseAction(
            case_id=new_case.id,
            actor_id=current_user.id,
            action_type="CREATED",
            from_status=None,
            to_status="PENDING",
            remarks=f"Imported via CSV file '{file_name}'"
        )
        db.add(action)

        created_cases.append(new_case)
        job.created_count += 1

    job.total_rows = total_rows
    job.status = "COMPLETED" if job.failed_count == 0 else "PARTIAL"
    job.errors_log = json.dumps(row_errors) if row_errors else None

    # Evaluate overlap candidates for newly created cases against existing cases
    for nc in created_cases:
        other_cases = db.query(Case).filter(
            Case.id != nc.id,
            Case.status != "DISPOSED"
        ).order_by(Case.created_at.desc()).limit(50).all()
        for oc in other_cases:
            if nc.institution_id == oc.institution_id or nc.bureau != oc.bureau:
                evaluate_case_pair(db, nc, oc)

    log_audit_event(
        db=db,
        event_category="BUSINESS",
        event_type="CSV_IMPORT_COMPLETED",
        actor=current_user,
        object_type="import_job",
        object_id=job.id,
        details={
            "file_name": file_name,
            "created": job.created_count,
            "skipped": job.skipped_count,
            "failed": job.failed_count
        }
    )

    db.commit()
    db.refresh(job)

    return {
        "job_id": job.id,
        "file_name": file_name,
        "total_rows": job.total_rows,
        "created_count": job.created_count,
        "skipped_count": job.skipped_count,
        "failed_count": job.failed_count,
        "status": job.status,
        "errors": row_errors
    }
