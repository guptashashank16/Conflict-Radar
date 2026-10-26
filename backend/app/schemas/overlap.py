from typing import Optional, Dict, Any, List
from datetime import datetime
from pydantic import BaseModel

class OverlapCandidateCaseBrief(BaseModel):
    id: str
    source_case_id: str
    bureau: str
    category: str
    subject: str
    status: str
    institution_name: str
    aicte_id: Optional[str] = None

class OverlapCandidateOut(BaseModel):
    id: str
    case_a: OverlapCandidateCaseBrief
    case_b: OverlapCandidateCaseBrief
    composite_score: int
    signals: Dict[str, Any]
    explanation: str
    review_status: str
    review_reason: Optional[str] = None
    created_at: datetime

class OverlapDecisionRequest(BaseModel):
    decision: str  # LINK, DISMISS, DEFER
    reason: str
    relationship_type: Optional[str] = "CROSS_BUREAU_COORDINATION"
