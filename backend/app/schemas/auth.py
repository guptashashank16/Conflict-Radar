from typing import Optional
from pydantic import BaseModel, ConfigDict

class Token(BaseModel):
    access_token: str
    token_type: str
    user_id: str
    email: str
    full_name: str
    role: str
    bureau_scope: str
    region_scope: str

class LoginRequest(BaseModel):
    email: str
    password: str

class SwitchDemoRoleRequest(BaseModel):
    role: str  # SECURITY_ADMIN, OVERSIGHT_OFFICER, BUREAU_OFFICER_RB, BUREAU_OFFICER_PGRC, etc.

class UserOut(BaseModel):
    id: str
    email: str
    full_name: str
    role: str
    bureau_scope: str
    region_scope: str
    is_active: bool

    model_config = ConfigDict(from_attributes=True)
