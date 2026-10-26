import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from backend.app.core.database import Base

def generate_uuid() -> str:
    return str(uuid.uuid4())

def utc_now() -> datetime:
    return datetime.now(timezone.utc)

class Institution(Base):
    __tablename__ = "institutions"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    aicte_permanent_id = Column(String(64), unique=True, index=True, nullable=True)
    canonical_name = Column(String(255), nullable=False, index=True)
    region = Column(String(64), nullable=True)  # Northern, Western, Southern, Central, etc.
    state = Column(String(64), nullable=True)
    address = Column(Text, nullable=True)
    approval_status = Column(String(32), default="Approved", nullable=False)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now, nullable=False)

    aliases = relationship("InstitutionAlias", back_populates="institution", cascade="all, delete-orphan")
    cases = relationship("Case", back_populates="institution", cascade="all, delete-orphan")

class InstitutionAlias(Base):
    __tablename__ = "institution_aliases"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    institution_id = Column(String(36), ForeignKey("institutions.id", ondelete="CASCADE"), nullable=False, index=True)
    alias_name = Column(String(255), nullable=False, index=True)
    source = Column(String(64), default="MANUAL", nullable=False)
    review_status = Column(String(32), default="VERIFIED", nullable=False)  # PENDING, VERIFIED, REJECTED
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)

    institution = relationship("Institution", back_populates="aliases")
