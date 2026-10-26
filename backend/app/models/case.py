import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Text, Integer, DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship
from backend.app.core.database import Base

def generate_uuid() -> str:
    return str(uuid.uuid4())

def utc_now() -> datetime:
    return datetime.now(timezone.utc)

class Case(Base):
    __tablename__ = "cases"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    source_system = Column(String(64), nullable=False)  # RB_PORTAL, PGRC_INTAKE, MANUAL_CSV, etc.
    source_case_id = Column(String(128), nullable=False)
    
    institution_id = Column(String(36), ForeignKey("institutions.id", ondelete="SET NULL"), nullable=True, index=True)
    bureau = Column(String(32), nullable=False, index=True)  # RB, PGRC, APPROVAL, VIGILANCE
    category = Column(String(64), nullable=False, index=True)
    subject = Column(String(255), nullable=False)
    description = Column(Text, nullable=False)
    status = Column(String(32), default="PENDING", nullable=False, index=True)  # PENDING, UNDER_PROCESS, TRANSFERRED, ESCALATED, DISPOSED
    priority = Column(String(16), default="MEDIUM", nullable=False)  # LOW, MEDIUM, HIGH, CRITICAL
    
    current_assignee_id = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    due_at = Column(DateTime(timezone=True), nullable=True, index=True)
    sla_status = Column(String(32), default="NORMAL", nullable=False)  # NORMAL, WARNING, OVERDUE
    
    disposition_summary = Column(Text, nullable=True)
    disposed_at = Column(DateTime(timezone=True), nullable=True)
    
    version = Column(Integer, default=1, nullable=False)  # Optimistic Concurrency Control
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now, nullable=False)

    __table_args__ = (
        UniqueConstraint("source_system", "source_case_id", name="uq_source_system_case_id"),
    )

    institution = relationship("Institution", back_populates="cases")
    current_assignee = relationship("User", foreign_keys=[current_assignee_id])
    actions = relationship("CaseAction", back_populates="case", cascade="all, delete-orphan", order_by="desc(CaseAction.created_at)")
    assignments = relationship("CaseAssignment", back_populates="case", cascade="all, delete-orphan")
    attachments = relationship("Attachment", back_populates="case", cascade="all, delete-orphan")

class CaseAssignment(Base):
    __tablename__ = "case_assignments"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    case_id = Column(String(36), ForeignKey("cases.id", ondelete="CASCADE"), nullable=False, index=True)
    assigned_to_id = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    bureau = Column(String(32), nullable=False)
    assigned_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)
    ended_at = Column(DateTime(timezone=True), nullable=True)
    reason = Column(Text, nullable=True)

    case = relationship("Case", back_populates="assignments")
    assigned_to = relationship("User", foreign_keys=[assigned_to_id])

class CaseAction(Base):
    __tablename__ = "case_actions"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    case_id = Column(String(36), ForeignKey("cases.id", ondelete="CASCADE"), nullable=False, index=True)
    actor_id = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    action_type = Column(String(64), nullable=False)
    from_status = Column(String(32), nullable=True)
    to_status = Column(String(32), nullable=True)
    remarks = Column(Text, nullable=False)
    metadata_json = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False, index=True)

    case = relationship("Case", back_populates="actions")
    actor = relationship("User", foreign_keys=[actor_id])

class CaseLink(Base):
    __tablename__ = "case_links"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    case_a_id = Column(String(36), ForeignKey("cases.id", ondelete="CASCADE"), nullable=False, index=True)
    case_b_id = Column(String(36), ForeignKey("cases.id", ondelete="CASCADE"), nullable=False, index=True)
    relationship_type = Column(String(64), default="RELATED_SERIES", nullable=False)
    created_by_id = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)

    case_a = relationship("Case", foreign_keys=[case_a_id])
    case_b = relationship("Case", foreign_keys=[case_b_id])
    created_by = relationship("User", foreign_keys=[created_by_id])
