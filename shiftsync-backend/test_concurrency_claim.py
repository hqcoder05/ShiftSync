import requests
import psycopg2
import threading
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
    if resp.status_code != 200:
        print(f"Login failed for {email}: {resp.text}")
        return None
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

cur.execute("SELECT email FROM staff LIMIT 5")
staff_emails = [r[0] for r in cur.fetchall()]

tokens = []
for email in staff_emails:
    t = get_token(email, "password")
    if t:
        tokens.append(t)
    
if len(tokens) < 5:
    print("Need at least 5 valid tokens!")
    exit(1)

cur.execute("SELECT id FROM store LIMIT 1;")
store_id = cur.fetchone()[0]

cur.execute("INSERT INTO skill (id, store_id, name) VALUES (gen_random_uuid(), %s, 'Cashier') ON CONFLICT DO NOTHING RETURNING id", (store_id,))
skill_row = cur.fetchone()
if not skill_row:
    cur.execute("SELECT id FROM skill WHERE store_id = %s LIMIT 1", (store_id,))
    skill_id = cur.fetchone()[0]
else:
    skill_id = skill_row[0]
conn.commit()

cur.execute(f"INSERT INTO shift (id, store_id, shift_date, start_time, end_time, status, is_open, availability_deadline) VALUES (gen_random_uuid(), '{store_id}', '2028-01-01', '08:00', '12:00', 'PUBLISHED', true, now()) RETURNING id")
shift_id = cur.fetchone()[0]
cur.execute("INSERT INTO shift_skill_requirement (id, shift_id, skill_id, required_count) VALUES (gen_random_uuid(), %s, %s, 1)", (shift_id, skill_id))
conn.commit()

cur.execute("SELECT id, email FROM staff WHERE email = ANY(%s)", (staff_emails,))
staff_map = {r[1]: r[0] for r in cur.fetchall()}

for email, sid in staff_map.items():
    cur.execute("INSERT INTO employment (id, staff_id, store_id, employment_type, hourly_rate, joined_date, status) VALUES (gen_random_uuid(), %s, %s, 'FULL_TIME', 15.0, '2020-01-01', 'ACTIVE') ON CONFLICT DO NOTHING", (sid, store_id))
conn.commit()

print(f"Created Open Shift: {shift_id} (1 slot remaining)")

results = []
def worker(token, thread_id):
    headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
    start_event.wait()
    resp = requests.post(f"{BASE_URL}/stores/{store_id}/marketplace/shifts/{shift_id}/claim", headers=headers)
    results.append(f"Thread {thread_id} Response: {resp.status_code} - {resp.text}")

threads = []
start_event = threading.Event()

for i, token in enumerate(tokens):
    t = threading.Thread(target=worker, args=(token, i+1))
    threads.append(t)
    t.start()

print("Firing 5 concurrent requests...")
start_event.set()

for t in threads:
    t.join()

print("\n--- RESULTS ---")
for r in results:
    print(r)

print("\n--- SQL VERIFICATION ---")
cur.execute(f"SELECT count(*) FROM shift_assignment WHERE shift_id = '{shift_id}'")
assigned_count = cur.fetchone()[0]
print(f"Total assignments in DB for shift {shift_id}: {assigned_count}")

cur.execute(f"SELECT is_open FROM shift WHERE id = '{shift_id}'")
is_open = cur.fetchone()[0]
print(f"Is shift still open? {is_open}")

cur.close()
conn.close()
