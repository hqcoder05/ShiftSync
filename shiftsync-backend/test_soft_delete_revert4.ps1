$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'

$loginBody = '{"email":"admin@shiftsync.com","password":"password123"}'
$loginRes = Invoke-RestMethod -Uri "http://localhost:8080/api/auth/login" -Method Post -ContentType "application/json" -Body $loginBody
$token = $loginRes.accessToken

Write-Output "
--- Delete Active Staff (Has Active Employment) ---"
# We need to un-delete a@test.com first because it was deleted in previous test
docker exec shiftsync-db psql -U postgres -d shiftsync -c "UPDATE staff SET deleted = false WHERE id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';"
curl.exe -s -w "\nStatus: %{http_code}" -X DELETE -H "Authorization: Bearer $token" http://localhost:8080/api/users/aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa

