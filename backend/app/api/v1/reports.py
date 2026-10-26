from typing import Dict, Any, List, Optional
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func

from backend.app.core.database import get_db
from backend.app.core.permissions import get_current_user, require_permission
from backend.app.models.user import User
from backend.app.models.case import Case
from backend.app.models.institution import Institution

router = APIRouter(prefix="/reports", tags=["Reports & Workload Analytics"])

@router.get("/workload")
def get_workload_report(
    region: Optional[str] = Query(None),
    current_user: User = Depends(require_permission("report.view")),
    db: Session = Depends(get_db)
):
    q = db.query(Case)
    if current_user.bureau_scope != "ALL":
        q = q.filter(Case.bureau == current_user.bureau_scope)
    if current_user.region_scope != "ALL":
        q = q.join(Institution, Case.institution_id == Institution.id).filter(
            func.lower(Institution.region) == current_user.region_scope.lower()
        )
    elif region and region != "ALL":
        q = q.join(Institution, Case.institution_id == Institution.id).filter(
            func.lower(Institution.region) == region.lower()
        )

    # Active workload by bureau
    bureau_stats = {}
    for bureau_name in ["RB", "PGRC", "APPROVAL", "VIGILANCE"]:
        b_q = q.filter(Case.bureau == bureau_name)
        bureau_stats[bureau_name] = {
            "total": b_q.count(),
            "pending": b_q.filter(Case.status == "PENDING").count(),
            "under_process": b_q.filter(Case.status == "UNDER_PROCESS").count(),
            "transferred": b_q.filter(Case.status == "TRANSFERRED").count(),
            "escalated": b_q.filter(Case.status == "ESCALATED").count(),
            "disposed": b_q.filter(Case.status == "DISPOSED").count(),
            "overdue": b_q.filter(Case.sla_status == "OVERDUE", Case.status != "DISPOSED").count(),
            "at_risk": b_q.filter(Case.sla_status == "WARNING", Case.status != "DISPOSED").count()
        }

    # By category
    cat_raw = q.with_entities(Case.category, func.count(Case.id)).group_by(Case.category).all()
    cat_stats = {cat: count for cat, count in cat_raw}

    # 6-week Case Activity Trends from real timestamps
    now = datetime.now(timezone.utc)
    activity_trends = []
    for w in reversed(range(6)):
        start = now - timedelta(days=(w + 1) * 7)
        end = now - timedelta(days=w * 7)
        inflow = q.filter(Case.created_at >= start, Case.created_at < end).count()
        disposed = q.filter(Case.status == "DISPOSED", Case.updated_at >= start, Case.updated_at < end).count()
        activity_trends.append({
            "period": start.strftime("%d %b"),
            "inflow": inflow,
            "disposed": disposed,
        })

    return {
        "bureau_workload": bureau_stats,
        "category_distribution": cat_stats,
        "activity_trends": activity_trends,
        "generated_at": datetime.now(timezone.utc)
    }

@router.get("/ageing")
def get_ageing_report(
    region: Optional[str] = Query(None),
    current_user: User = Depends(require_permission("report.view")),
    db: Session = Depends(get_db)
):
    now = datetime.now(timezone.utc)
    q = db.query(Case).filter(Case.status != "DISPOSED")
    if current_user.bureau_scope != "ALL":
        q = q.filter(Case.bureau == current_user.bureau_scope)
    if current_user.region_scope != "ALL":
        q = q.join(Institution, Case.institution_id == Institution.id).filter(
            func.lower(Institution.region) == current_user.region_scope.lower()
        )
    elif region and region != "ALL":
        q = q.join(Institution, Case.institution_id == Institution.id).filter(
            func.lower(Institution.region) == region.lower()
        )

    all_cases = q.all()

    buckets = {
        "less_than_7_days": 0,
        "7_to_14_days": 0,
        "15_to_30_days": 0,
        "greater_than_30_days": 0
    }

    sla_counts = {"NORMAL": 0, "WARNING": 0, "OVERDUE": 0}

    for c in all_cases:
        created = c.created_at
        if created.tzinfo is None:
            created = created.replace(tzinfo=timezone.utc)
        age_days = (now - created).days

        if age_days < 7:
            buckets["less_than_7_days"] += 1
        elif age_days <= 14:
            buckets["7_to_14_days"] += 1
        elif age_days <= 30:
            buckets["15_to_30_days"] += 1
        else:
            buckets["greater_than_30_days"] += 1

        if c.sla_status in sla_counts:
            sla_counts[c.sla_status] += 1

    total = len(all_cases)
    compliance_rate = round((sla_counts["NORMAL"] / total * 100), 1) if total > 0 else 100.0

    return {
        "total_active_cases": total,
        "compliance_rate_percent": compliance_rate,
        "ageing_buckets": buckets,
        "sla_distribution": sla_counts,
        "generated_at": now
    }
