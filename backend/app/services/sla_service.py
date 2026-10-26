from typing import Dict, Any, List
from datetime import datetime, timezone, timedelta
from sqlalchemy.orm import Session
from sqlalchemy import or_

from backend.app.models.case import Case
from backend.app.models.workflow import SLAPolicy, Notification
from backend.app.models.user import User

DEFAULT_WARNING_HOURS = 72

def evaluate_deadlines_and_slas(db: Session) -> Dict[str, int]:
    """
    Evaluates all non-disposed cases against deadlines.
    Updates `sla_status` to 'NORMAL', 'WARNING', or 'OVERDUE'.
    Emits deduplicated notifications.
    """
    now = datetime.now(timezone.utc)
    warning_horizon = now + timedelta(hours=DEFAULT_WARNING_HOURS)

    active_cases = db.query(Case).filter(
        Case.status.in_(["PENDING", "UNDER_PROCESS", "TRANSFERRED", "ESCALATED"]),
        Case.due_at != None
    ).all()

    warning_count = 0
    overdue_count = 0
    normal_count = 0

    for case in active_cases:
        old_sla = case.sla_status
        due_at = case.due_at
        if due_at.tzinfo is None:
            due_at = due_at.replace(tzinfo=timezone.utc)

        if due_at < now:
            case.sla_status = "OVERDUE"
            overdue_count += 1
            # Check deduplicated notification
            if case.current_assignee_id:
                dedup_key = f"OVERDUE_{case.id}_{due_at.strftime('%Y%m%d')}"
                existing_notif = db.query(Notification).filter(Notification.dedup_key == dedup_key).first()
                if not existing_notif:
                    notif = Notification(
                        recipient_id=case.current_assignee_id,
                        case_id=case.id,
                        type="SLA_OVERDUE",
                        title=f"URGENT: Case {case.source_case_id} is Overdue",
                        message=f"The deadline for case '{case.subject}' ({case.bureau}) expired on {due_at.strftime('%d %b %Y %H:%M UTC')}.",
                        dedup_key=dedup_key
                    )
                    db.add(notif)
        elif due_at <= warning_horizon:
            case.sla_status = "WARNING"
            warning_count += 1
            if case.current_assignee_id:
                dedup_key = f"WARNING_{case.id}_{due_at.strftime('%Y%m%d')}"
                existing_notif = db.query(Notification).filter(Notification.dedup_key == dedup_key).first()
                if not existing_notif:
                    remaining_hours = int((due_at - now).total_seconds() / 3600)
                    notif = Notification(
                        recipient_id=case.current_assignee_id,
                        case_id=case.id,
                        type="SLA_WARNING",
                        title=f"SLA Warning: Case {case.source_case_id} approaching deadline",
                        message=f"Case '{case.subject}' has {remaining_hours} hours remaining before SLA target expires.",
                        dedup_key=dedup_key
                    )
                    db.add(notif)
        else:
            case.sla_status = "NORMAL"
            normal_count += 1

    db.commit()
    return {
        "overdue": overdue_count,
        "warning": warning_count,
        "normal": normal_count,
        "total_active_evaluated": len(active_cases)
    }
