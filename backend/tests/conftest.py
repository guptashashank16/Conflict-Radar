import os
import sys
import pytest
from fastapi.testclient import TestClient

# Ensure root path is in sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

from backend.app.main import app
from backend.app.core.database import SessionLocal, Base, engine
from backend.app.core.security import create_access_token
from backend.app.models.user import User

@pytest.fixture(scope="session")
def client():
    Base.metadata.create_all(bind=engine)
    with TestClient(app) as c:
        yield c

@pytest.fixture(scope="function")
def db():
    session = SessionLocal()
    try:
        yield session
    finally:
        session.rollback()
        session.close()

def get_auth_headers_for_role(db, role: str, email: str, bureau_scope: str = "ALL", region_scope: str = "ALL"):
    user = db.query(User).filter(User.email == email).first()
    if not user:
        user = User(
            email=email,
            full_name=f"Test {role}",
            role=role,
            bureau_scope=bureau_scope,
            region_scope=region_scope,
            is_active=True,
            hashed_password="hash"
        )
        db.add(user)
        db.commit()
        db.refresh(user)

    token = create_access_token(
        subject=user.id,
        extra_claims={
            "email": user.email,
            "role": user.role,
            "bureau_scope": user.bureau_scope,
            "region_scope": user.region_scope
        }
    )
    return {"Authorization": f"Bearer {token}"}

@pytest.fixture
def oversight_headers(db):
    return get_auth_headers_for_role(db, "OVERSIGHT_OFFICER", "test_oversight@aicte.gov.in", "ALL", "ALL")

@pytest.fixture
def rb_headers(db):
    return get_auth_headers_for_role(db, "BUREAU_OFFICER_RB", "test_rb@aicte.gov.in", "RB", "ALL")

@pytest.fixture
def pgrc_headers(db):
    return get_auth_headers_for_role(db, "BUREAU_OFFICER_PGRC", "test_pgrc@aicte.gov.in", "PGRC", "ALL")

@pytest.fixture
def auditor_headers(db):
    return get_auth_headers_for_role(db, "AUDITOR", "test_auditor@aicte.gov.in", "ALL", "ALL")

@pytest.fixture
def regional_north_headers(db):
    return get_auth_headers_for_role(db, "REGIONAL_OFFICER", "test_north@aicte.gov.in", "ALL", "Northern")
