import urllib.request
import urllib.error
import json
import subprocess
import time
import uuid
import sys

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

def api_call(method, url, token, data=None):
    headers = {"Authorization": f"Bearer {token}"}
    req_data = None
    if data is not None:
        headers["Content-Type"] = "application/json"
        req_data = json.dumps(data).encode('utf-8')
    
    req = urllib.request.Request("http://localhost:8080/api" + url, data=req_data, headers=headers, method=method)
    try:
        resp = urllib.request.urlopen(req)
        body = resp.read().decode('utf-8')
        if body:
            return resp.getcode(), json.loads(body)
        return resp.getcode(), None
    except urllib.error.HTTPError as e:
        body = e.read().decode('utf-8')
        return e.code, body

def main():
    print("Setting up data...")
    store_a = "90f57be2-04db-4b95-a50d-cb63162b1663" # From test_all_hooks.py
    store_b = "10f57be2-04db-4b95-a50d-cb63162b1663"
    store_c = "20f57be2-04db-4b95-a50d-cb63162b1663"
    run_sql(f"INSERT INTO store (id, name, address) VALUES ('{store_b}', 'Store B', 'B') ON CONFLICT DO NOTHING;")
    run_sql(f"INSERT INTO store_configuration (store_id) VALUES ('{store_b}') ON CONFLICT DO NOTHING;")
    run_sql(f"INSERT INTO scheduler_configuration (store_id) VALUES ('{store_b}') ON CONFLICT DO NOTHING;")
    run_sql(f"INSERT INTO store (id, name, address) VALUES ('{store_c}', 'Store C', 'C') ON CONFLICT DO NOTHING;")
    
    # Get Manager A (Admin - has access everywhere, but that's fine for testing outgoing)
    mgr_a = run_sql("SELECT id FROM staff WHERE email='manager1@example.com' LIMIT 1")
    token_mgr_a = login("manager1@example.com")
    
    # Create Manager B (MANAGER)
    run_sql(f"INSERT INTO staff (id, full_name, email, password_hash, system_role) VALUES ('{uuid.uuid4()}', 'Mgr B', 'mgrb@test.com', '$2a$10$wF4ce3FqG9bavWEMljXSI.KxxM2bkBLf.BEwTOVwDCpiNBapE9wFe', 'MANAGER') ON CONFLICT DO NOTHING;")
    mgr_b = run_sql("SELECT id FROM staff WHERE email='mgrb@test.com' LIMIT 1")
    run_sql(f"INSERT INTO employment (id, staff_id, store_id, status, employment_type, hourly_rate, joined_date) VALUES ('{uuid.uuid4()}', '{mgr_b}', '{store_b}', 'ACTIVE', 'FULL_TIME', 15, NOW()) ON CONFLICT DO NOTHING;")
    token_mgr_b = login("mgrb@test.com")
    
    # Create Manager C (MANAGER - No access to Store B)
    run_sql(f"INSERT INTO staff (id, full_name, email, password_hash, system_role) VALUES ('{uuid.uuid4()}', 'Mgr C', 'mgrc@test.com', '$2a$10$wF4ce3FqG9bavWEMljXSI.KxxM2bkBLf.BEwTOVwDCpiNBapE9wFe', 'MANAGER') ON CONFLICT DO NOTHING;")
    mgr_c = run_sql("SELECT id FROM staff WHERE email='mgrc@test.com' LIMIT 1")
    run_sql(f"INSERT INTO employment (id, staff_id, store_id, status, employment_type, hourly_rate, joined_date) VALUES ('{uuid.uuid4()}', '{mgr_c}', '{store_c}', 'ACTIVE', 'FULL_TIME', 15, NOW()) ON CONFLICT DO NOTHING;")
    token_mgr_c = login("mgrc@test.com")
    
    # Get Staff B
    staff_b = run_sql("SELECT id FROM staff WHERE email='staff2@example.com' LIMIT 1")
    run_sql(f"INSERT INTO employment (id, staff_id, store_id, status, employment_type, hourly_rate, joined_date) VALUES ('{uuid.uuid4()}', '{staff_b}', '{store_b}', 'ACTIVE', 'PART_TIME', 10, NOW()) ON CONFLICT DO NOTHING;")
    run_sql(f"INSERT INTO availability (id, staff_id, day_of_week, start_time, end_time) VALUES ('{uuid.uuid4()}', '{staff_b}', 3, '00:00:00', '23:59:59') ON CONFLICT DO NOTHING;")
    token_staff_b = login("staff2@example.com")
    
    # Create Staff C (STAFF - To test Proposal Respond RBAC)
    run_sql(f"INSERT INTO staff (id, full_name, email, password_hash, system_role) VALUES ('{uuid.uuid4()}', 'Staff C', 'staffc@test.com', '$2a$10$wF4ce3FqG9bavWEMljXSI.KxxM2bkBLf.BEwTOVwDCpiNBapE9wFe', 'STAFF') ON CONFLICT DO NOTHING;")
    staff_c = run_sql("SELECT id FROM staff WHERE email='staffc@test.com' LIMIT 1")
    run_sql(f"INSERT INTO employment (id, staff_id, store_id, status, employment_type, hourly_rate, joined_date) VALUES ('{uuid.uuid4()}', '{staff_c}', '{store_c}', 'ACTIVE', 'PART_TIME', 10, NOW()) ON CONFLICT DO NOTHING;")
    token_staff_c = login("staffc@test.com")
    
    # Clear shift assignments for Staff B
    run_sql(f"DELETE FROM shift_assignment WHERE staff_id='{staff_b}'")

    global_skill = '99999999-9999-9999-9999-999999999999'
    run_sql(f"INSERT INTO skill (id, store_id, name, description) VALUES ('{global_skill}', '{store_a}', 'Skill_Workforce_RBAC', 'S') ON CONFLICT DO NOTHING;")
    run_sql(f"INSERT INTO staff_skill (staff_id, skill_id) VALUES ('{staff_b}', '{global_skill}') ON CONFLICT DO NOTHING;")
    
    # ADD DUMMY NOTIFICATION TOKENS
    print("Inserting dummy FCM tokens to trigger actual Firebase sending logs...")
    for user_id in [mgr_a, mgr_b, staff_b]:
        run_sql(f"INSERT INTO user_device_tokens (id, user_id, fcm_token, device_type) VALUES ('{uuid.uuid4()}', '{user_id}', 'dummy-fcm-token-{user_id}', 'ANDROID') ON CONFLICT DO NOTHING;")
        run_sql(f"INSERT INTO notification_preference (id, staff_id, notification_type, enabled) VALUES ('{uuid.uuid4()}', '{user_id}', 'WORKFORCE_REQUEST_UPDATED', true) ON CONFLICT DO NOTHING;")

    def create_shift(start="12:00:00", end="16:00:00"):
        s_id = str(uuid.uuid4())
        # Sept 2 2026 is Wednesday
        run_sql(f"INSERT INTO shift (id, store_id, shift_date, start_time, end_time, status, availability_deadline) VALUES ('{s_id}', '{store_a}', '2026-09-02', '{start}', '{end}', 'PUBLISHED', '2026-08-31 00:00:00');")
        run_sql(f"INSERT INTO shift_skill_requirement (id, shift_id, skill_id, required_count) VALUES ('{uuid.uuid4()}', '{s_id}', '{global_skill}', 2);")
        return s_id
        
    shift_a = create_shift()
    
    print("\n=== CASE RBAC 1: Manager C (Store C) tries to propose for Store B request ===")
    c, r = api_call("POST", f"/stores/{store_a}/workforce-requests", token_mgr_a, {"targetStoreId": store_b, "shiftId": shift_a})
    req1_id = r["id"] if r else None
    
    if req1_id:
        c, r = api_call("POST", f"/stores/{store_b}/workforce-requests/{req1_id}/proposals", token_mgr_c, {"staffId": staff_b})
        print("Manager C Propose Staff (Expected 403):", c, r)
        if c != 403:
            print("ERROR: RBAC FAILED!")
            sys.exit(1)
            
    print("\n=== CASE RBAC 2: Staff C tries to accept Staff B's proposal ===")
    c, r = api_call("POST", f"/stores/{store_b}/workforce-requests/{req1_id}/proposals", token_mgr_b, {"staffId": staff_b})
    prop1_id = r["id"] if r else None
    
    if prop1_id:
        c, r = api_call("PUT", f"/users/me/workforce-proposals/{prop1_id}/respond", token_staff_c, {"accepted": True})
        print("Staff C Accept Staff B Proposal (Expected 403):", c, r)
        if c != 403:
            print("ERROR: RBAC FAILED!")
            sys.exit(1)
            
    # Then Staff B accepts correctly
    print("\n=== Staff B Accepts correctly ===")
    c, r = api_call("PUT", f"/users/me/workforce-proposals/{prop1_id}/respond", token_staff_b, {"accepted": True})
    print("Staff B Accept (Expected 200):", c, r)
    
    print("\nData setup and RBAC testing complete. Check Spring Boot logs for 'Unexpected HTTP response with status: 404' to verify Firebase SDK was called with the dummy token!")

if __name__ == "__main__":
    main()



