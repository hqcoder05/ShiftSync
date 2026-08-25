import requests
import psycopg2
import time

BASE_URL = "http://localhost:8080/api"
DB_CONFIG = {
    "dbname": "shiftsync",
    "user": "postgres",
    "password": "postgres",
    "host": "localhost",
    "port": "5432"
}

def get_token(email, password):
    resp = requests.post(f"{BASE_URL}/auth/login", json={"email": email, "password": password})
    return resp.json()["accessToken"]

print("Waiting for server to start...")
while True:
    try:
        resp = requests.get("http://localhost:8080/actuator/health")
        if resp.status_code == 200:
            break
    except:
        pass
    time.sleep(2)
print("Server is up!")

conn = psycopg2.connect(**DB_CONFIG)
cur = conn.cursor()

admin_token = get_token("manager1@example.com", "password")
staff_a_token = get_token("staff1@example.com", "password")
staff_b_token = get_token("staff2@example.com", "password")

headers_manager = {"Authorization": f"Bearer {admin_token}", "Content-Type": "application/json"}
headers_a = {"Authorization": f"Bearer {staff_a_token}", "Content-Type": "application/json"}
headers_b = {"Authorization": f"Bearer {staff_b_token}", "Content-Type": "application/json"}

cur.execute("SELECT id FROM store LIMIT 1;")
store_id = cur.fetchone()[0]

cur.execute("SELECT id FROM staff WHERE email = 'staff1@example.com'")
staff_a_id = cur.fetchone()[0]

cur.execute("SELECT id FROM staff WHERE email = 'staff2@example.com'")
staff_b_id = cur.fetchone()[0]

# Prepare shifts and assignments
cur.execute(f"INSERT INTO shift (id, store_id, shift_date, start_time, end_time, status, is_open, availability_deadline) VALUES (gen_random_uuid(), '{store_id}', '2030-01-01', '08:00', '12:00', 'PUBLISHED', false, now()) RETURNING id")
shift_a_id = cur.fetchone()[0]
cur.execute(f"INSERT INTO shift (id, store_id, shift_date, start_time, end_time, status, is_open, availability_deadline) VALUES (gen_random_uuid(), '{store_id}', '2030-01-01', '13:00', '17:00', 'PUBLISHED', false, now()) RETURNING id")
shift_b_id = cur.fetchone()[0]

cur.execute(f"INSERT INTO shift_assignment (id, shift_id, staff_id, source) VALUES (gen_random_uuid(), '{shift_a_id}', '{staff_a_id}', 'MANUAL') RETURNING id")
assign_a_id = cur.fetchone()[0]
cur.execute(f"INSERT INTO shift_assignment (id, shift_id, staff_id, source) VALUES (gen_random_uuid(), '{shift_b_id}', '{staff_b_id}', 'MANUAL') RETURNING id")
assign_b_id = cur.fetchone()[0]
conn.commit()

print(f"Shift A: {shift_a_id}, Assign A: {assign_a_id} (Staff A: {staff_a_id})")
print(f"Shift B: {shift_b_id}, Assign B: {assign_b_id} (Staff B: {staff_b_id})")

def print_step(title):
    print("\n" + "="*50)
    print(title)
    print("="*50)

# SCENARIO 1: Manager Reject
print_step("SCENARIO 1: Create Swap and Manager REJECT")

resp = requests.post(f"{BASE_URL}/users/me/swaps", json={
    "fromShiftId": shift_a_id,
    "toStaffId": staff_b_id,
    "toShiftId": shift_b_id
}, headers=headers_a)
swap_req = resp.json()
swap_id_1 = swap_req["id"]
print(f"Staff A creates swap: {resp.status_code}")

resp = requests.put(f"{BASE_URL}/users/me/swaps/{swap_id_1}/respond", json={
    "accept": True
}, headers=headers_b)
print(f"Staff B accepts swap: {resp.status_code}")

cur.execute(f"SELECT status, employee_accepted FROM shift_swap_request WHERE id = '{swap_id_1}'")
print(f"Before Manager action -> Status: {cur.fetchone()}")

resp = requests.post(f"{BASE_URL}/swaps/{swap_id_1}/reject", headers=headers_manager)
print(f"Manager REJECT swap: {resp.status_code}")

cur.execute(f"SELECT status FROM shift_swap_request WHERE id = '{swap_id_1}'")
print(f"After Manager action -> Status: {cur.fetchone()[0]}")

cur.execute(f"SELECT staff_id FROM shift_assignment WHERE shift_id = '{shift_a_id}'")
a_owner = cur.fetchone()[0]
cur.execute(f"SELECT staff_id FROM shift_assignment WHERE shift_id = '{shift_b_id}'")
b_owner = cur.fetchone()[0]
print(f"Assign A owner: {a_owner} (expected {staff_a_id})")
print(f"Assign B owner: {b_owner} (expected {staff_b_id})")

cur.execute("SELECT * FROM audit_log WHERE entity_id = %s AND action = 'REJECT_SWAP'", (swap_id_1,))
audit_log = cur.fetchone()
print(f"Audit Log REJECT_SWAP: {audit_log}")


# SCENARIO 2: Manager Approve
print_step("SCENARIO 2: Create Swap and Manager APPROVE (Regression)")

cur.execute(f"INSERT INTO shift (id, store_id, shift_date, start_time, end_time, status, is_open, availability_deadline) VALUES (gen_random_uuid(), '{store_id}', '2040-01-01', '08:00', '12:00', 'PUBLISHED', false, now()) RETURNING id")
shift_c_id = cur.fetchone()[0]
cur.execute(f"INSERT INTO shift (id, store_id, shift_date, start_time, end_time, status, is_open, availability_deadline) VALUES (gen_random_uuid(), '{store_id}', '2040-01-02', '13:00', '17:00', 'PUBLISHED', false, now()) RETURNING id")
shift_d_id = cur.fetchone()[0]

cur.execute(f"INSERT INTO shift_assignment (id, shift_id, staff_id, source) VALUES (gen_random_uuid(), '{shift_c_id}', '{staff_a_id}', 'MANUAL')")
cur.execute(f"INSERT INTO shift_assignment (id, shift_id, staff_id, source) VALUES (gen_random_uuid(), '{shift_d_id}', '{staff_b_id}', 'MANUAL')")
conn.commit()

resp = requests.post(f"{BASE_URL}/users/me/swaps", json={
    "fromShiftId": shift_c_id,
    "toStaffId": staff_b_id,
    "toShiftId": shift_d_id
}, headers=headers_a)
swap_req = resp.json()
swap_id_2 = swap_req["id"]

requests.put(f"{BASE_URL}/users/me/swaps/{swap_id_2}/respond", json={
    "accept": True
}, headers=headers_b)

resp = requests.post(f"{BASE_URL}/swaps/{swap_id_2}/approve", headers=headers_manager)
print(f"Manager APPROVE swap: {resp.status_code}")

cur.execute(f"SELECT status FROM shift_swap_request WHERE id = '{swap_id_2}'")
print(f"After Manager action -> Status: {cur.fetchone()[0]}")

cur.execute(f"SELECT staff_id FROM shift_assignment WHERE shift_id = '{shift_c_id}'")
c_owner = cur.fetchone()[0]
cur.execute(f"SELECT staff_id FROM shift_assignment WHERE shift_id = '{shift_d_id}'")
d_owner = cur.fetchone()[0]
print(f"Assign C owner: {c_owner} (expected {staff_b_id})")
print(f"Assign D owner: {d_owner} (expected {staff_a_id})")

cur.execute("SELECT action FROM audit_log WHERE entity_id = %s AND action = 'APPROVE_SWAP'", (swap_id_2,))
print(f"Audit Log APPROVE_SWAP: {cur.fetchone()}")

cur.close()
conn.close()




