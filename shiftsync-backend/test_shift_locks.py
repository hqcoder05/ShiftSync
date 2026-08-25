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
headers = {"Authorization": f"Bearer {admin_token}", "Content-Type": "application/json"}

def print_step(title):
    print("\n" + "="*50)
    print(title)
    print("="*50)

cur.execute("SELECT id FROM store LIMIT 1;")
store_id = cur.fetchone()[0]

cur.execute(f"SELECT id, shift_date, start_time, end_time FROM shift WHERE store_id = '{store_id}' LIMIT 3")
shift_rows = cur.fetchall()
shift1_id, shift2_id, shift3_id = shift_rows[0][0], shift_rows[1][0], shift_rows[2][0]

cur.execute(f"SELECT id, start_date FROM payroll_period WHERE store_id = '{store_id}' LIMIT 3")
period_rows = cur.fetchall()

# if we only have 2, let's insert via SQL directly to avoid validation errors like "Date range overlaps with existing period"
if len(period_rows) < 3:
    cur.execute(f"INSERT INTO payroll_period (id, store_id, start_date, end_date, status) VALUES (gen_random_uuid(), '{store_id}', '2025-01-01', '2025-01-31', 'DRAFT')")
    conn.commit()
    cur.execute(f"SELECT id, start_date FROM payroll_period WHERE store_id = '{store_id}' LIMIT 3")
    period_rows = cur.fetchall()

p_confirmed_id, p_confirmed_start = period_rows[0][0], period_rows[0][1]
p_paid_id, p_paid_start = period_rows[1][0], period_rows[1][1]
p_draft_id, p_draft_start = period_rows[2][0], period_rows[2][1]

cur.execute(f"UPDATE payroll_period SET status = 'CONFIRMED' WHERE id = '{p_confirmed_id}'")
cur.execute(f"UPDATE payroll_period SET status = 'PAID' WHERE id = '{p_paid_id}'")
cur.execute(f"UPDATE payroll_period SET status = 'DRAFT' WHERE id = '{p_draft_id}'")
conn.commit()

cur.execute(f"UPDATE shift SET shift_date = '{p_confirmed_start}' WHERE id = '{shift1_id}'")
cur.execute(f"UPDATE shift SET shift_date = '{p_confirmed_start}' WHERE id = '{shift2_id}'")
cur.execute(f"UPDATE shift SET shift_date = '{p_draft_start}' WHERE id = '{shift3_id}'")
conn.commit()

print_step(f"1. Test updateShift on a Shift in a CONFIRMED period (period_id={p_confirmed_id}, shift_date={p_confirmed_start})")
resp = requests.put(f"{BASE_URL}/stores/{store_id}/shifts/{shift1_id}", json={
    "shiftDate": str(p_confirmed_start),
    "startTime": "09:00:00",
    "endTime": "18:00:00",
    "requiredStaff": 2
}, headers=headers)
print(f"Status: {resp.status_code}")
print(f"Response: {resp.text}")

print_step(f"2. Test deleteShift on a DIFFERENT Shift in a CONFIRMED period")
resp = requests.delete(f"{BASE_URL}/stores/{store_id}/shifts/{shift2_id}", headers=headers)
print(f"Status: {resp.status_code}")
print(f"Response: {resp.text}")

print_step(f"3. Regression check: updateShift/deleteShift on a Shift in a DRAFT period (shift_date={p_draft_start})")
resp = requests.put(f"{BASE_URL}/stores/{store_id}/shifts/{shift3_id}", json={
    "shiftDate": str(p_draft_start),
    "startTime": "08:00:00",
    "endTime": "12:00:00",
    "requiredStaff": 1
}, headers=headers)
print(f"Update Status: {resp.status_code}")
print(f"Update Response: {resp.text}")
resp = requests.delete(f"{BASE_URL}/stores/{store_id}/shifts/{shift3_id}", headers=headers)
print(f"Delete Status: {resp.status_code}")
print(f"Delete Response: {resp.text}")

print_step(f"4. Verification of PAID period: updateShift/deleteShift on a Shift in a PAID period (period_id={p_paid_id}, shift_date={p_paid_start})")
# repurpose shift1_id since it wasn't deleted (blocked by CONFIRMED)
cur.execute(f"UPDATE shift SET shift_date = '{p_paid_start}' WHERE id = '{shift1_id}'")
conn.commit()

resp = requests.put(f"{BASE_URL}/stores/{store_id}/shifts/{shift1_id}", json={
    "shiftDate": str(p_paid_start),
    "startTime": "09:00:00",
    "endTime": "18:00:00",
    "requiredStaff": 2
}, headers=headers)
print(f"Update PAID Shift Status: {resp.status_code}")
print(f"Update PAID Shift Response: {resp.text}")

resp = requests.delete(f"{BASE_URL}/stores/{store_id}/shifts/{shift1_id}", headers=headers)
print(f"Delete PAID Shift Status: {resp.status_code}")
print(f"Delete PAID Shift Response: {resp.text}")

cur.close()
conn.close()
