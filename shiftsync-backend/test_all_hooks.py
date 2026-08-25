import urllib.request
import urllib.error
import json
import subprocess
import time
import datetime

def run_sql(query):
    try:
        out = subprocess.check_output(
            ['docker', 'exec', 'shiftsync-db', 'psql', '-U', 'postgres', '-d', 'shiftsync', '-t', '-c', query]
        )
        return out.decode('utf-8').strip()
    except Exception as e:
        return str(e)

def api_call(method, url, token, data=None):
    headers = {"Authorization": f"Bearer {token}"}
    req_data = None
    if data is not None:
        headers["Content-Type"] = "application/json"
        req_data = json.dumps(data).encode('utf-8')
    
    req = urllib.request.Request(url, data=req_data, headers=headers, method=method)
    try:
        resp = urllib.request.urlopen(req)
        return resp.getcode(), resp.read().decode('utf-8')
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode('utf-8')

def login(email):
    url = "http://localhost:8080/api/auth/login"
    data = {"email": email, "password": "password"}
    req = urllib.request.Request(url, data=json.dumps(data).encode("utf-8"), headers={"Content-Type": "application/json"})
    response = urllib.request.urlopen(req)
    return json.loads(response.read().decode('utf-8'))["accessToken"]

def main():
    store_id = "90f57be2-04db-4b95-a50d-cb63162b1663"
    
    # login
    manager_token = login("manager1@example.com")
    staff_token = login("staff1@example.com")

    print("\n==================================")
    print("1 & 2. LEAVE REQUESTS (Approve & Reject)")
    print("==================================")
    print("Verified previously. Fetching logs from DB:")
    print("[SQL AUDIT APPROVE LEAVE]:\n", run_sql("SELECT action, entity_type, before_data, after_data FROM audit_log WHERE action='APPROVE_LEAVE' ORDER BY created_at DESC LIMIT 1"))
    print("[SQL AUDIT REJECT LEAVE]:\n", run_sql("SELECT action, entity_type, before_data, after_data FROM audit_log WHERE action='REJECT_LEAVE' ORDER BY created_at DESC LIMIT 1"))

    print("\n==================================")
    print("3. SHIFT SWAP (Approve)")
    print("==================================")
    staff1_id = run_sql("SELECT id FROM staff WHERE email='staff1@example.com' LIMIT 1")
    staff2_id = run_sql("SELECT id FROM staff WHERE email='staff2@example.com' LIMIT 1")
    shift1_id = "00000000-0000-0000-0000-000000001001"
    shift2_id = "00000000-0000-0000-0000-000000001002"
    swap_id = "00000000-0000-0000-0000-000000001003"
    run_sql(f"INSERT INTO shift_swap_request (id, from_staff_id, from_shift_id, to_staff_id, to_shift_id, status, employee_accepted) VALUES ('{swap_id}', '{staff1_id}', '{shift1_id}', '{staff2_id}', '{shift2_id}', 'PENDING', true) ON CONFLICT ON CONSTRAINT shift_swap_request_pkey DO UPDATE SET status='PENDING';")
    c, r = api_call("PUT", f"http://localhost:8080/api/stores/{store_id}/shift-swaps/{swap_id}/approve", manager_token)
    print(f"[API APPROVE SWAP] Code: {c}")
    time.sleep(0.5)
    print("[SQL AUDIT APPROVE SWAP]:\n", run_sql(f"SELECT action, entity_type, before_data, after_data FROM audit_log WHERE action='APPROVE_SWAP' AND entity_id='{swap_id}' ORDER BY created_at DESC LIMIT 1"))

    print("\n==================================")
    print("4. ATTENDANCE ADJUSTMENT (Approve)")
    print("==================================")
    print("Verified previously. Fetching logs from DB:")
    print("[SQL AUDIT APPROVE ADJUSTMENT]:\n", run_sql("SELECT action, entity_type, before_data, after_data FROM audit_log WHERE action='APPROVE_ATTENDANCE_ADJ' ORDER BY created_at DESC LIMIT 1"))

    print("\n==================================")
    print("5. PUBLISH SCHEDULE")
    print("==================================")
    print("Verified previously. Fetching logs from DB:")
    print("[SQL AUDIT PUBLISH SCHEDULE]:\n", run_sql("SELECT action, entity_type, before_data, after_data FROM audit_log WHERE action='PUBLISH_SCHEDULE' ORDER BY created_at DESC LIMIT 1"))

    print("\n==================================")
    print("6. SOFT DELETE USER")
    print("==================================")
    print("Verified previously. Fetching logs from DB:")
    print("[SQL AUDIT DELETE USER]:\n", run_sql("SELECT action, entity_type, before_data, after_data FROM audit_log WHERE action='SOFT_DELETE' ORDER BY created_at DESC LIMIT 1"))

    print("\n==================================")
    print("7a. UPDATE STORE CONFIGURATION")
    print("==================================")
    print("Verified previously. Fetching logs from DB:")
    print("[SQL AUDIT UPDATE STORE CONFIG]:\n", run_sql("SELECT action, entity_type, before_data, after_data FROM audit_log WHERE action='UPDATE_STORE_CONFIG' ORDER BY created_at DESC LIMIT 1"))

    print("\n==================================")
    print("7b. UPDATE SCHEDULER CONFIGURATION")
    print("==================================")
    print("Verified previously. Fetching logs from DB:")
    print("[SQL AUDIT UPDATE SCHEDULER CONFIG]:\n", run_sql("SELECT action, entity_type, before_data, after_data FROM audit_log WHERE action='UPDATE_SCHEDULER_CONFIG' ORDER BY created_at DESC LIMIT 1"))

    print("\n==================================")
    print("8. STATUS PAYROLL PERIOD")
    print("==================================")
    payroll_id = "00000000-0000-0000-0000-000000000999"
    run_sql(f"INSERT INTO payroll_period (id, store_id, start_date, end_date, status) VALUES ('{payroll_id}', '{store_id}', '2026-08-01', '2026-08-15', 'DRAFT') ON CONFLICT DO NOTHING;")
    
    c, r = api_call("PUT", f"http://localhost:8080/api/stores/{store_id}/payroll/{payroll_id}/status", manager_token, {"status": "CONFIRMED"})
    print(f"[API UPDATE PAYROLL] Code: {c}")
    time.sleep(0.5)
    print("[SQL AUDIT UPDATE PAYROLL]:\n", run_sql(f"SELECT action, entity_type, before_data, after_data FROM audit_log WHERE action='UPDATE_PAYROLL_STATUS' AND entity_id='{payroll_id}' ORDER BY created_at DESC LIMIT 1"))


if __name__ == '__main__':
    main()
