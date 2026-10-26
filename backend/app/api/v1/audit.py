from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc

from backend.app.core.database import get_db
from backend.app.core.permissions import require_permission
from backend.app.models.user import User
from backend.app.models.audit import AuditEvent

router = APIRouter(prefix="/audit", tags=["Security & Compliance Audit"])

@router.get("/events")
def list_audit_events(
    category: Optional[str] = Query(None, description="SECURITY, BUSINESS, AUTHORIZATION_FAILURE"),
    event_type: Optional[str] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    current_user: User = Depends(require_permission("audit.read")),
    db: Session = Depends(get_db)
):
    q = db.query(AuditEvent)

    if category and category != "ALL":
        q = q.filter(AuditEvent.event_category == category)
    if event_type and event_type != "ALL":
        q = q.filter(AuditEvent.event_type == event_type)

    total = q.count()
    items = q.order_by(desc(AuditEvent.created_at)).offset(skip).limit(limit).all()

    return {
        "total": total,
        "items": [{
            "id": a.id,
            "actor_email": a.actor_email,
            "event_category": a.event_category,
            "event_type": a.event_type,
            "object_type": a.object_type,
            "object_id": a.object_id,
            "details": a.details,
            "ip_address": a.ip_address,
            "request_id": a.request_id,
            "created_at": a.created_at
        } for a in items],
        "skip": skip,
        "limit": limit
    }
