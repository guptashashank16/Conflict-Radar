import urllib.request
import json

req = urllib.request.Request(
    'http://127.0.0.1:8000/api/v1/auth/login',
    data=json.dumps({'email': 'oversight@aicte.gov.in', 'password': 'demo123'}).encode(),
    headers={'Content-Type': 'application/json'}
)
res = json.loads(urllib.request.urlopen(req).read().decode())
token = res['access_token']

req2 = urllib.request.Request('http://127.0.0.1:8000/api/v1/reports/workload', headers={'Authorization': f'Bearer {token}'})
wl = json.loads(urllib.request.urlopen(req2).read().decode())

print("Bureaus in workload:", list(wl['bureau_workload'].keys()))
trends = wl.get('activity_trends', [])
print(f"Activity trends intervals ({len(trends)} weeks):")
for t in trends:
    print(f"  Period: {t['period']} | New Inflow: {t['inflow']} | Disposed: {t['disposed']}")
