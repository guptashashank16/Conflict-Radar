from typing import Optional, List, Any
from datetime import datetime
from pydantic import BaseModel, Field, ConfigDict

class CaseActionOut(BaseModel):
    id: str
    action_type: str
    from_status: Optional[str] = None
    to_status: Optional[str] = None
    remarks: str
    actor_name: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class CaseOut(BaseModel):
    id: str
    source_system: str
    source_case_id: str
    institution_id: Optional[str] = None
    institution_name: Optional[str] = None
    aicte_permanent_id: Optional[str] = None
    bureau: str
    category: str
    subject: str
    description: str
    status: str
    priority: str
    current_assignee_id: Optional[str] = None
    current_assignee_name: Optional[str] = None
    due_at: Optional[datetime] = None
    sla_status: str
    disposition_summary: Optional[str] = None
    disposed_at: Optional[datetime] = None
    version: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

class CaseCreate(BaseModel):
    source_system: str = Field(..., json_schema_extra={"example": "RB_PORTAL"})
    source_case_id: str = Field(..., json_schema_extra={"example": "RB-2026-1049"})
    institution_id: Optional[str] = None
    bureau: str = Field(..., json_schema_extra={"example": "RB"})
    category: str = Field(..., json_schema_extra={"example": "FACULTY_NORMS"})
    subject: str = Field(..., json_schema_extra={"example": "Severe shortage of qualified faculty in CSE department"})
    description: str = Field(..., json_schema_extra={"example": "Inspection report indicated 45% deficiency in regular faculty cadence."})
    priority: Optional[str] = "MEDIUM"
    target_days: Optional[int] = 7

class CaseStatusUpdate(BaseModel):
    to_status: str
    expected_version: int
    remarks: str
    disposition_summary: Optional[str] = None

class CaseAssign(BaseModel):
    assignee_id: str
    expected_version: int
    reason: str

class CaseTransfer(BaseModel):
    target_bureau: str
    expected_version: int
    reason: str

class CaseCoordinationRequest(BaseModel):
    target_bureau: str
    subject: str
    message: str
