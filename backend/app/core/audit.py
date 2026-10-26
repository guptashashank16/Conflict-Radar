import json
import logging
from typing import Optional, Any, Dict
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from backend.app.models.audit import AuditEvent
from backend.app.models.user import User

logger = logging.getLogger("audit")
logger.setLevel(logging.INFO)

# Sanitize sensitive fields from log payloads
SENSITIVE_KEYS = {"password", "token", "hashed_password", "secret", "authorization"}

def sanitize_payload(payload: Any) -> Any:
    if isinstance(payload, dict):
        sanitized = {}
        for k, v in payload.items():
            if any(s in k.lower() for s in SENSITIVE_KEYS):
                sanitized[k] = "[REDACTED]"
            else:
                sanitized[k] = sanitize_payload(v)
        return sanitized
    elif isinstance(payload, list):
        return [sanitize_payload(item) for item in payload]
    return payload

def log_audit_event(
    db: Session,
    event_category: str,  # SECURITY, BUSINESS, AUTHORIZATION_FAILURE
    event_type: str,      # LOGIN_SUCCESS, CASE_TRANSFER, OVERLAP_REVIEW, etc.
    actor: Optional[User] = None,
    object_type: Optional[str] = None,
    object_id: Optional[str] = None,
    details: Optional[Dict[str, Any]] = None,
    ip_address: Optional[str] = None,
    request_id: Optional[str] = None
) -> AuditEvent:
    clean_details = sanitize_payload(details or {})
    details_str = json.dumps(clean_details) if clean_details else None

    audit_entry = AuditEvent(
        actor_id=actor.id if actor else None,
        actor_email=actor.email if actor else "SYSTEM/ANONYMOUS",
        event_category=event_category,
        event_type=event_type,
        object_type=object_type,
        object_id=str(object_id) if object_id else None,
        details=details_str,
        ip_address=ip_address,
        request_id=request_id,
        created_at=datetime.now(timezone.utc)
    )

    db.add(audit_entry)
    # Structured console logging
    logger.info(
        f"[AUDIT] [{event_category}] type={event_type} actor={audit_entry.actor_email} "
        f"obj={object_type}:{object_id} req={request_id}"
    )
    return audit_entry
