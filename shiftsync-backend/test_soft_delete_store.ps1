$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'
$loginBody = '{"email":"admin@shiftsync.com","password":"password123"}'
$loginRes = Invoke-RestMethod -Uri "http://localhost:8080/api/auth/login" -Method Post -ContentType "application/json" -Body $loginBody
$token = $loginRes.accessToken

Write-Output "
--- 2. Delete Store ---"
curl.exe -s -w "\nStatus: %{http_code}" -X DELETE -H "Authorization: Bearer $token" http://localhost:8080/api/stores/11111111-1111-1111-1111-111111111111
Write-Output "
[SQL] Store Table:"
docker exec shiftsync-db psql -U postgres -d shiftsync -c "SELECT name, deleted FROM store WHERE id = '11111111-1111-1111-1111-111111111111';"
Write-Output "[API] GET Store:"
curl.exe -s -w "\nStatus: %{http_code}" -X GET -H "Authorization: Bearer $token" http://localhost:8080/api/stores/11111111-1111-1111-1111-111111111111
