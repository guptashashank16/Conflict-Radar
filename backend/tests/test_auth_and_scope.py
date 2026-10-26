def test_unauthenticated_request_denied(client):
    res = client.get("/api/v1/cases")
    assert res.status_code == 401
    assert "detail" in res.json()

def test_rb_officer_cannot_access_pgrc_case(client, rb_headers, db):
    from backend.app.models.case import Case
    pgrc_case = db.query(Case).filter(Case.bureau == "PGRC").first()
    assert pgrc_case is not None, "Need at least one PGRC case in DB"

    res = client.get(f"/api/v1/cases/{pgrc_case.id}", headers=rb_headers)
    assert res.status_code == 403
    assert "outside your assigned bureau" in res.json()["detail"].lower()

def test_rb_officer_can_access_rb_case(client, rb_headers, db):
    from backend.app.models.case import Case
    rb_case = db.query(Case).filter(Case.bureau == "RB").first()
    assert rb_case is not None, "Need at least one RB case in DB"

    res = client.get(f"/api/v1/cases/{rb_case.id}", headers=rb_headers)
    assert res.status_code == 200
    assert res.json()["id"] == rb_case.id
    assert res.json()["bureau"] == "RB"

def test_auditor_can_access_audit_log_while_bureau_officer_denied(client, auditor_headers, rb_headers):
    # Auditor must succeed
    auditor_res = client.get("/api/v1/audit/events", headers=auditor_headers)
    assert auditor_res.status_code == 200
    assert "items" in auditor_res.json()

    # RB Officer must be rejected with 403 Forbidden
    rb_res = client.get("/api/v1/audit/events", headers=rb_headers)
    assert rb_res.status_code == 403
    assert "lacks permission 'audit.read'" in rb_res.json()["detail"]
