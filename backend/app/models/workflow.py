import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Text, Integer, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from backend.app.core.database import Base

def generate_uuid() -> str:
    return str(uuid.uuid4())

def utc_now() -> datetime:
    return datetime.now(timezone.utc)

class CoordinationRequest(Base):
    __tablename__ = "coordination_requests"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    source_case_id = Column(String(36), ForeignKey("cases.id", ondelete="CASCADE"), nullable=False, index=True)
    requesting_bureau = Column(String(32), nullable=False)
    target_bureau = Column(String(32), nullable=False, index=True)
    requested_by_id = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    status = Column(String(32), default="PENDING", nullable=False)  # PENDING, ACCEPTED, DECLINED, RESOLVED
    subject = Column(String(255), nullable=False)
    message = Column(Text, nullable=False)
    response_notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)
    resolved_at = Column(DateTime(timezone=True), nullable=True)

    source_case = relationship("Case", foreign_keys=[source_case_id])
    requested_by = relationship("User", foreign_keys=[requested_by_id])

class SLAPolicy(Base):
    __tablename__ = "sla_policies"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    category = Column(String(64), unique=True, nullable=False, index=True)
    warning_hours = Column(Integer, default=72, nullable=False)
    target_hours = Column(Integer, default=168, nullable=False)  # 7 days
    escalation_policy = Column(String(64), default="AUTO_ESCALATE_TO_OVERSIGHT", nullable=False)

class Notification(Base):
    __tablename__ = "notifications"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    recipient_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    case_id = Column(String(36), ForeignKey("cases.id", ondelete="CASCADE"), nullable=True, index=True)
    type = Column(String(64), nullable=False)  # SLA_WARNING, SLA_OVERDUE, TRANSFER_PENDING, COORDINATION_REQUEST, OVERLAP_DETECTED
    title = Column(String(255), nullable=False)
    message = Column(Text, nullable=False)
    read_at = Column(DateTime(timezone=True), nullable=True)
    dedup_key = Column(String(128), unique=True, index=True, nullable=False)  # Prevents duplicate spam
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)

    recipient = relationship("User", foreign_keys=[recipient_id])
    case = relationship("Case", foreign_keys=[case_id])
