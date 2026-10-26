import uuid

def test_workflow_lifecycle_and_concurrency(client, oversight_headers, db):
    # 1. Create a case
    unique_suffix = str(uuid.uuid4())[:8]
    create_payload = {
        "source_system": "TEST_INTAKE",
        "source_case_id": f"TEST-{unique_suffix}",
        "bureau": "RB",
        "category": "FACULTY_NORMS",
        "subject": "Test Case for Workflow Verification",
        "description": "Verifying transaction transitions and OCC version checks.",
        "priority": "HIGH",
        "target_days": 5
    }
    create_res = client.post("/api/v1/cases", json=create_payload, headers=oversight_headers)
    assert create_res.status_code == 201
    case_data = create_res.json()
    case_id = case_data["id"]
    assert case_data["status"] == "PENDING"
    assert case_data["version"] == 1

    # 2. Test Invalid Transition: PENDING directly to DISPOSED must fail with 400
    invalid_res = client.patch(
        f"/api/v1/cases/{case_id}/status",
        json={
            "to_status": "DISPOSED",
            "expected_version": 1,
            "remarks": "Premature disposal attempt",
            "disposition_summary": "Should be rejected"
        },
        headers=oversight_headers
    )
    assert invalid_res.status_code == 400
    assert "Invalid state transition" in invalid_res.json()["detail"]

    # 3. Valid Transition: Assign case -> status becomes UNDER_PROCESS, version becomes 2
    from backend.app.models.user import User
    assignee = db.query(User).filter(User.role == "BUREAU_OFFICER_RB").first()
    assert assignee is not None

    assign_res = client.post(
        f"/api/v1/cases/{case_id}/assign",
        json={
            "assignee_id": assignee.id,
            "expected_version": 1,
            "reason": "Assigning for desk verification"
        },
        headers=oversight_headers
    )
    assert assign_res.status_code == 200
    updated_case = assign_res.json()
    assert updated_case["status"] == "UNDER_PROCESS"
    assert updated_case["version"] == 2
    assert updated_case["current_assignee_id"] == assignee.id

    # 4. Optimistic Concurrency Control (OCC): Attempting update with stale version 1 must return 409 Conflict
    stale_res = client.patch(
        f"/api/v1/cases/{case_id}/status",
        json={
            "to_status": "ESCALATED",
            "expected_version": 1,  # Stale! Current version is 2
            "remarks": "Stale update attempt"
        },
        headers=oversight_headers
    )
    assert stale_res.status_code == 409
    assert "version mismatch" in stale_res.json()["detail"].lower()

    # 5. Controlled Transfer: Transfer from RB to PGRC
    transfer_res = client.post(
        f"/api/v1/cases/{case_id}/transfer",
        json={
            "target_bureau": "PGRC",
            "expected_version": 2,
            "reason": "Matter falls under citizen grievance redressal mandate"
        },
        headers=oversight_headers
    )
    assert transfer_res.status_code == 200
    transferred_data = transfer_res.json()
    assert transferred_data["status"] == "TRANSFERRED"
    assert transferred_data["bureau"] == "PGRC"
    assert transferred_data["version"] == 3

    # 6. Verify Chronological Timeline Entries
    timeline_res = client.get(f"/api/v1/cases/{case_id}/timeline", headers=oversight_headers)
    assert timeline_res.status_code == 200
    timeline = timeline_res.json()
    action_types = [item["action_type"] for item in timeline]
    assert "CREATED" in action_types
    assert "ASSIGNED" in action_types
    assert "TRANSFERRED" in action_types
