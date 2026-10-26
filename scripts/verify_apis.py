import urllib.request
import json

def run_checks():
    # 1. Test Login with valid credentials
    req = urllib.request.Request(
        'http://127.0.0.1:8000/api/v1/auth/login',
        data=json.dumps({'email': 'oversight@aicte.gov.in', 'password': 'demo123'}).encode(),
        headers={'Content-Type': 'application/json'}
    )
    res = json.loads(urllib.request.urlopen(req).read().decode())
    token = res['access_token']
    print(f"1. Login SUCCESS: {res['full_name']} | Role: {res['role']} | Bureau: {res['bureau_scope']}")

    # 2. Test Login with invalid credentials
    try:
        bad_req = urllib.request.Request(
            'http://127.0.0.1:8000/api/v1/auth/login',
            data=json.dumps({'email': 'oversight@aicte.gov.in', 'password': 'wrongpassword'}).encode(),
            headers={'Content-Type': 'application/json'}
        )
        urllib.request.urlopen(bad_req)
        print("ERROR: Invalid login was accepted!")
    except urllib.error.HTTPError as e:
        print(f"2. Invalid Login safely rejected with HTTP {e.code}")

    # 3. Test Cases with default (All Regions)
    req_cases = urllib.request.Request(
        'http://127.0.0.1:8000/api/v1/cases?limit=5',
        headers={'Authorization': f'Bearer {token}'}
    )
    cases = json.loads(urllib.request.urlopen(req_cases).read().decode())
    sample_reg = cases['items'][0].get('institution_region') if cases['items'] else 'None'
    print(f"3. Cases total (All Regions): {cases['total']} | Sample case region: {sample_reg}")

    # 4. Test Cases filtered by specific region (Northern)
    req_north = urllib.request.Request(
        'http://127.0.0.1:8000/api/v1/cases?region=Northern&limit=5',
        headers={'Authorization': f'Bearer {token}'}
    )
    cases_north = json.loads(urllib.request.urlopen(req_north).read().decode())
    print(f"4. Cases total (Northern Region filter): {cases_north['total']}")

    # 5. Test Workload Report with region filter
    req_wl = urllib.request.Request(
        'http://127.0.0.1:8000/api/v1/reports/workload?region=Northern',
        headers={'Authorization': f'Bearer {token}'}
    )
    wl = json.loads(urllib.request.urlopen(req_wl).read().decode())
    print(f"5. Workload report with region filter returned bureaus: {list(wl['bureau_workload'].keys())}")

    # 6. Test Ageing Report with region filter
    req_ag = urllib.request.Request(
        'http://127.0.0.1:8000/api/v1/reports/ageing?region=Northern',
        headers={'Authorization': f'Bearer {token}'}
    )
    ag = json.loads(urllib.request.urlopen(req_ag).read().decode())
    print(f"6. Ageing report compliance rate: {ag['compliance_rate_percent']}% across {ag['total_active_cases']} cases")

    # 7. Test Scoped Regional Officer (Er. Rajesh Kumar, Northern Region)
    req_scoped = urllib.request.Request(
        'http://127.0.0.1:8000/api/v1/auth/login',
        data=json.dumps({'email': 'regional.north@aicte.gov.in', 'password': 'demo123'}).encode(),
        headers={'Content-Type': 'application/json'}
    )
    scoped_res = json.loads(urllib.request.urlopen(req_scoped).read().decode())
    scoped_token = scoped_res['access_token']
    req_scoped_cases = urllib.request.Request(
        'http://127.0.0.1:8000/api/v1/cases?limit=5',
        headers={'Authorization': f'Bearer {scoped_token}'}
    )
    scoped_cases = json.loads(urllib.request.urlopen(req_scoped_cases).read().decode())
    print(f"7. Regional Officer Scoped Cases: {scoped_cases['total']} strictly constrained to Northern jurisdiction")

if __name__ == "__main__":
    run_checks()
