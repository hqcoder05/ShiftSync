$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'
$loginBody = '{"email":"manager@shiftsync.com","password":"password123"}'
$loginRes = Invoke-RestMethod -Uri "http://localhost:8080/api/auth/login" -Method Post -ContentType "application/json" -Body $loginBody
$token = $loginRes.accessToken

Write-Output "
--- 1. Delete User ---"
curl.exe -s -w "\nStatus: %{http_code}" -X DELETE -H "Authorization: Bearer $token" http://localhost:8080/api/users/aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa
Write-Output "
[SQL] User Table:"
docker exec shiftsync-db psql -U postgres -d shiftsync -c "SELECT email, deleted FROM staff WHERE id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';"
Write-Output "[API] GET User:"
curl.exe -s -w "\nStatus: %{http_code}" -X GET -H "Authorization: Bearer $token" http://localhost:8080/api/users/aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa

Write-Output "

--- 2. Delete Store ---"
curl.exe -s -w "\nStatus: %{http_code}" -X DELETE -H "Authorization: Bearer $token" http://localhost:8080/api/stores/22222222-2222-2222-2222-222222222222
Write-Output "
[SQL] Store Table:"
docker exec shiftsync-db psql -U postgres -d shiftsync -c "SELECT name, deleted FROM store WHERE id = '22222222-2222-2222-2222-222222222222';"
Write-Output "[API] GET Store:"
curl.exe -s -w "\nStatus: %{http_code}" -X GET -H "Authorization: Bearer $token" http://localhost:8080/api/stores/22222222-2222-2222-2222-222222222222
