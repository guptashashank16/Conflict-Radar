from typing import Dict, List, Set, Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from backend.app.core.database import get_db
from backend.app.core.security import decode_access_token
from backend.app.models.user import User

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login", auto_error=False)

ROLE_PERMISSIONS: Dict[str, Set[str]] = {
    "SECURITY_ADMIN": {
        "user.manage", "audit.read", "system.config", "case.read", "report.view"
    },
    "OVERSIGHT_OFFICER": {
        "case.read", "case.create", "case.update", "case.assign", "case.transfer",
        "case.dispose", "case.reopen", "overlap.review", "overlap.link",
        "report.view", "report.export", "coordination.manage", "import.manage"
    },
    "BUREAU_OFFICER_RB": {
        "case.read", "case.create", "case.update", "case.assign", "case.transfer",
        "case.dispose", "overlap.review", "coordination.manage", "report.view"
    },
    "BUREAU_OFFICER_PGRC": {
        "case.read", "case.create", "case.update", "case.assign", "case.transfer",
        "case.dispose", "overlap.review", "coordination.manage", "report.view"
    },
    "REGIONAL_OFFICER": {
        "case.read", "case.update", "report.view"
    },
    "CASE_COORDINATOR": {
        "case.read", "case.assign", "case.transfer", "overlap.review", "overlap.link",
        "coordination.manage", "report.view", "import.manage"
    },
    "AUDITOR": {
        "audit.read", "report.view", "case.read"
    },
    "EXECUTIVE_VIEWER": {
        "dashboard.view", "report.view", "case.read"
    }
}

def get_current_user(token: Optional[str] = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> User:
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication credentials were not provided",
            headers={"WWW-Authenticate": "Bearer"},
        )
    payload = decode_access_token(token)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired authentication token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token subject")
    
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User account not found")
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="User account is deactivated")
    
    return user

def require_permission(permission: str):
    def permission_checker(current_user: User = Depends(get_current_user)) -> User:
        user_perms = ROLE_PERMISSIONS.get(current_user.role, set())
        if permission not in user_perms:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied: role '{current_user.role}' lacks permission '{permission}'"
            )
        return current_user
    return permission_checker

def is_case_in_scope(user: User, case_bureau: str, institution_region: Optional[str] = None) -> bool:
    """
    Checks if a case is within the caller's bureau and region scope.
    """
    # 1. Bureau scope check
    if user.bureau_scope != "ALL" and user.bureau_scope != case_bureau:
        return False
        
    # 2. Regional scope check
    if user.region_scope != "ALL" and institution_region:
        if user.region_scope.lower() != institution_region.lower():
            return False
            
    return True

def enforce_case_scope(user: User, case_bureau: str, institution_region: Optional[str] = None):
    if not is_case_in_scope(user, case_bureau, institution_region):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied: Record is outside your assigned bureau or regional scope"
        )
