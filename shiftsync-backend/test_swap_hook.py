import urllib.request
import urllib.error
import json
import subprocess
import time

def run_sql(query):
    try:
        out = subprocess.check_output(
            ['docker', 'exec', 'shiftsync-db', 'psql', '-U', 'postgres', '-d', 'shiftsync', '-t', '-c', query]
        )
        return out.decode('utf-8').strip()
    except Exception as e:
        return str(e)

def login(email):
    url = "http://localhost:8080/api/auth/login"
    data = {"email": email, "password": "password"}
    req = urllib.request.Request(url, data=json.dumps(data).encode("utf-8"), headers={"Content-Type": "application/json"})
    response = urllib.request.urlopen(req)
    return json.loads(response.read().decode('utf-8'))["accessToken"]

manager_token = login("manager1@example.com")
swap_id = "00000000-0000-0000-0000-000000001003"
# Reset it back to PENDING just in case it was rejected or something? No it's PENDING.
run_sql(f"UPDATE shift_swap_request SET status='PENDING' WHERE id='{swap_id}';")

req = urllib.request.Request(f"http://localhost:8080/api/swaps/{swap_id}/approve", method="POST", headers={"Authorization": f"Bearer {manager_token}"})
try:
    resp = urllib.request.urlopen(req)
    print("API APPROVE SWAP Response:", resp.getcode())
except urllib.error.HTTPError as e:
    print("API APPROVE SWAP Response:", e.code)

time.sleep(0.5)
print("[SQL AUDIT APPROVE SWAP]:")
print(run_sql(f"SELECT action, entity_type, before_data, after_data FROM audit_log WHERE action='APPROVE_SWAP' AND entity_id='{swap_id}' ORDER BY created_at DESC LIMIT 1"))
