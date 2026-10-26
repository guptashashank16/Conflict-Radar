from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel, ConfigDict

class InstitutionAliasOut(BaseModel):
    id: str
    alias_name: str
    source: str
    review_status: str

    model_config = ConfigDict(from_attributes=True)

class InstitutionOut(BaseModel):
    id: str
    aicte_permanent_id: Optional[str] = None
    canonical_name: str
    region: Optional[str] = None
    state: Optional[str] = None
    address: Optional[str] = None
    approval_status: str
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

class InstitutionCreate(BaseModel):
    aicte_permanent_id: Optional[str] = None
    canonical_name: str
    region: Optional[str] = None
    state: Optional[str] = None
    address: Optional[str] = None
    approval_status: Optional[str] = "Approved"
