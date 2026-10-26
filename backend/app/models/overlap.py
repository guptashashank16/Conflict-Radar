import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Text, Integer, DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship
from backend.app.core.database import Base

def generate_uuid() -> str:
    return str(uuid.uuid4())

def utc_now() -> datetime:
    return datetime.now(timezone.utc)

class OverlapCandidate(Base):
    __tablename__ = "overlap_candidates"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    case_a_id = Column(String(36), ForeignKey("cases.id", ondelete="CASCADE"), nullable=False, index=True)
    case_b_id = Column(String(36), ForeignKey("cases.id", ondelete="CASCADE"), nullable=False, index=True)
    
    composite_score = Column(Integer, nullable=False, index=True)  # 0 to 100
    signals_json = Column(Text, nullable=False)  # JSON-encoded signals dictionary
    explanation = Column(Text, nullable=False)   # Human-readable rationale
    algorithm_version = Column(String(16), default="v1.0", nullable=False)
    
    review_status = Column(String(32), default="UNREVIEWED", nullable=False, index=True)  # UNREVIEWED, LINKED, DISMISSED, DEFERRED
    review_reason = Column(Text, nullable=True)
    reviewed_by_id = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    reviewed_at = Column(DateTime(timezone=True), nullable=True)
    
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now, nullable=False)

    __table_args__ = (
        UniqueConstraint("case_a_id", "case_b_id", name="uq_overlap_candidate_pair"),
    )

    case_a = relationship("Case", foreign_keys=[case_a_id])
    case_b = relationship("Case", foreign_keys=[case_b_id])
    reviewed_by = relationship("User", foreign_keys=[reviewed_by_id])
