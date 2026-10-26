import uuid
from backend.app.services.overlap_service import calculate_overlap_signals
from backend.app.models.case import Case, CaseLink
from backend.app.models.institution import Institution

def test_conflict_radar_signals_exact_id_and_cross_bureau(db):
    uid = uuid.uuid4().hex[:6]
    inst = Institution(
        aicte_permanent_id=f"1-TEST-{uid}",
        canonical_name=f"Test Engineering Academy {uid}",
        region="Northern",
        approval_status="Approved"
    )
    db.add(inst)
    db.flush()

    case_a = Case(
        source_system="RB_TEST",
        source_case_id=f"RB-TEST-{uid}-A",
        institution_id=inst.id,
        bureau="RB",
        category="FACULTY_NORMS",
        subject="Cadre deficiency in CSE department",
        description="Faculty count deficient by 40% across professor and associate professor ranks.",
        status="UNDER_PROCESS",
        priority="HIGH",
        version=1
    )
    case_b = Case(
        source_system="PGRC_TEST",
        source_case_id=f"PGRC-TEST-{uid}-B",
        institution_id=inst.id,
        bureau="PGRC",
        category="FACULTY_NORMS",
        subject="Student grievance on missing faculty in computer science",
        description="Students complain that professor positions remain vacant and classes are cancelled.",
        status="UNDER_PROCESS",
        priority="HIGH",
        version=1
    )
    db.add_all([case_a, case_b])
    db.flush()

    score, signals, explanation = calculate_overlap_signals(case_a, case_b)

    # 1. Exact ID must be 45
    assert signals["exact_institution_id"]["score"] == 45
    # 2. Category match must be 15
    assert signals["category_similarity"]["score"] == 15
    # 3. Cross-bureau active must be 10 (RB != PGRC and both UNDER_PROCESS)
    assert signals["cross_bureau_active"]["score"] == 10
    # 4. Total score must be >= 70 (High priority candidate)
    assert score >= 70
    assert "High Priority" in explanation
    assert "Exact AICTE ID match" in explanation

def test_overlap_decision_linking_and_dismissal(client, oversight_headers, db):
    from backend.app.models.overlap import OverlapCandidate
    # Find an unreviewed candidate, or generate one if all reviewed
    candidate = db.query(OverlapCandidate).filter(OverlapCandidate.review_status == "UNREVIEWED").first()
    if not candidate:
        # Create a fresh candidate pair
        uid = uuid.uuid4().hex[:6]
        c1 = Case(source_system="T1", source_case_id=f"C1-{uid}", bureau="RB", category="TEST", subject="S1", description="D1", version=1)
        c2 = Case(source_system="T2", source_case_id=f"C2-{uid}", bureau="PGRC", category="TEST", subject="S2", description="D2", version=1)
        db.add_all([c1, c2])
        db.flush()
        candidate = OverlapCandidate(case_a_id=c1.id, case_b_id=c2.id, composite_score=80, signals_json="{}", explanation="Test", review_status="UNREVIEWED")
        db.add(candidate)
        db.commit()

    # Link candidate as related cases
    link_res = client.post(
        f"/api/v1/overlaps/{candidate.id}/decision",
        json={
            "decision": "LINK",
            "reason": "Confirmed cross-bureau related complaints regarding academic faculty",
            "relationship_type": "CROSS_BUREAU_COORDINATION"
        },
        headers=oversight_headers
    )
    assert link_res.status_code == 200
    res_data = link_res.json()
    assert res_data["review_status"] == "LINKED"

    # Verify a CaseLink was created in DB
    link_record = db.query(CaseLink).filter(
        CaseLink.case_a_id == candidate.case_a_id,
        CaseLink.case_b_id == candidate.case_b_id
    ).first()
    assert link_record is not None
    assert link_record.relationship_type == "CROSS_BUREAU_COORDINATION"
