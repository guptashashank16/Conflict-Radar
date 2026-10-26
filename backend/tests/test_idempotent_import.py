import uuid

def test_csv_import_and_idempotency(client, oversight_headers, db):
    # Dynamically generate unique CSV rows
    uid = uuid.uuid4().hex[:6]
    csv_text = f"""source_system,source_case_id,bureau,category,subject,description,institution_name
IDEMPOTENT_TEST,IDEMP-{uid}-1,RB,FACULTY_NORMS,Unique Case 1,Description for test 1,Apex Institute
IDEMPOTENT_TEST,IDEMP-{uid}-2,PGRC,CAPITATION_FEE,Unique Case 2,Description for test 2,Bharatiya College
"""
    file_bytes = csv_text.encode("utf-8")

    # 1. First Import Run
    files = {"file": (f"test_batch_{uid}.csv", file_bytes, "text/csv")}
    first_res = client.post("/api/v1/imports/csv", files=files, headers=oversight_headers)
    assert first_res.status_code == 200
    first_data = first_res.json()
    assert first_data["status"] == "COMPLETED"
    assert first_data["created_count"] == 2
    assert first_data["skipped_count"] == 0

    # 2. Second Import Run with EXACT same file bytes -> MUST be idempotent!
    files_repeat = {"file": (f"test_batch_{uid}.csv", file_bytes, "text/csv")}
    second_res = client.post("/api/v1/imports/csv", files=files_repeat, headers=oversight_headers)
    assert second_res.status_code == 200
    second_data = second_res.json()
    
    # In repeat run, NO new cases must be created; all rows must be skipped as duplicates!
    assert second_data["created_count"] == 0
    assert second_data["skipped_count"] == 2
    assert second_data["status"] == "COMPLETED"
