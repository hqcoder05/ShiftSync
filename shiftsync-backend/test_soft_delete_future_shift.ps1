$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'

$loginBody = '{"email":"admin@shiftsync.com","password":"password123"}'
$loginRes = Invoke-RestMethod -Uri "http://localhost:8080/api/auth/login" -Method Post -ContentType "application/json" -Body $loginBody
$token = $loginRes.accessToken

Write-Output "
--- Test: Delete User with INACTIVE employment but FUTURE PUBLISHED shift ---"
# 1. Insert User (User ID = 55555555-...)
docker exec shiftsync-db psql -U postgres -d shiftsync -c "INSERT INTO staff (id, email, password_hash, full_name, phone, system_role, created_at, updated_at, version) VALUES ('55555555-5555-5555-5555-555555555555', 'testfuture@shiftsync.com', 'hash', 'Test Future', '0010', 'STAFF', NOW(), NOW(), 0) ON CONFLICT DO NOTHING;"

# 2. Insert INACTIVE Employment
docker exec shiftsync-db psql -U postgres -d shiftsync -c "INSERT INTO employment (id, staff_id, store_id, employment_type, hourly_rate, status, joined_date) VALUES (gen_random_uuid(), '55555555-5555-5555-5555-555555555555', '11111111-1111-1111-1111-111111111111', 'FULL_TIME', 20, 'INACTIVE', '2023-01-01') ON CONFLICT DO NOTHING;"

# 3. Insert FUTURE PUBLISHED Shift
docker exec shiftsync-db psql -U postgres -d shiftsync -c "INSERT INTO shift (id, store_id, shift_date, start_time, end_time, status, availability_deadline, is_open) VALUES ('66666666-6666-6666-6666-666666666666', '11111111-1111-1111-1111-111111111111', '2026-09-10', '10:00:00', '14:00:00', 'PUBLISHED', NOW(), false) ON CONFLICT DO NOTHING;"

# 4. Assign User to Shift
docker exec shiftsync-db psql -U postgres -d shiftsync -c "INSERT INTO shift_assignment (id, shift_id, staff_id, source, assigned_at) VALUES (gen_random_uuid(), '66666666-6666-6666-6666-666666666666', '55555555-5555-5555-5555-555555555555', 'MANUAL', NOW()) ON CONFLICT DO NOTHING;"

# 5. API Call to Delete
curl.exe -s -w "\nStatus: %{http_code}" -X DELETE -H "Authorization: Bearer $token" http://localhost:8080/api/users/55555555-5555-5555-5555-555555555555

