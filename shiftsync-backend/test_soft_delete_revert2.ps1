$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'

$loginBody = '{"email":"admin@shiftsync.com","password":"password123"}'
$loginRes = Invoke-RestMethod -Uri "http://localhost:8080/api/auth/login" -Method Post -ContentType "application/json" -Body $loginBody
$token = $loginRes.accessToken

Write-Output "
--- 1. Delete Sole Manager ---"
curl.exe -s -w "\nStatus: %{http_code}" -X DELETE -H "Authorization: Bearer $token" http://localhost:8080/api/users/eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee

Write-Output "

--- 2. Delete Free User ---"
docker exec shiftsync-db psql -U postgres -d shiftsync -c "INSERT INTO staff (id, email, password_hash, full_name, phone, system_role, created_at, updated_at, version) VALUES ('99999999-9999-9999-9999-999999999999', 'free2@shiftsync.com', 'hash', 'Free User', '0008', 'STAFF', NOW(), NOW(), 0) ON CONFLICT DO NOTHING;"
curl.exe -s -w "\nStatus: %{http_code}" -X DELETE -H "Authorization: Bearer $token" http://localhost:8080/api/users/99999999-9999-9999-9999-999999999999

Write-Output "

--- 3. Delete Store with Active Employees ---"
curl.exe -s -w "\nStatus: %{http_code}" -X DELETE -H "Authorization: Bearer $token" http://localhost:8080/api/stores/11111111-1111-1111-1111-111111111111

