from typing import Dict, Any, List, Optional
from pydantic import BaseModel

class DashboardSummaryOut(BaseModel):
    total_institutions: int = 0
    total_cases: int = 0
    total_active_cases: int
    cases_at_risk_warning: int
    cases_overdue: int
    pending_coordination_requests: int
    unreviewed_overlap_candidates: int
    bureau_distribution: Dict[str, int]
    status_distribution: Dict[str, int]
    category_distribution: Dict[str, int]
    bureau_workload: Optional[Dict[str, Dict[str, int]]] = None
    trend_sparklines: Optional[Dict[str, List[int]]] = None
    recent_actions: List[Dict[str, Any]]
