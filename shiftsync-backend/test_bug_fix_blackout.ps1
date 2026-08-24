$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'

$loginBody = '{"email":"admin@shiftsync.com","password":"password123"}'
$loginRes = Invoke-RestMethod -Uri "http://localhost:8080/api/auth/login" -Method Post -ContentType "application/json" -Body $loginBody
$token = $loginRes.accessToken

Write-Output "
--- 1. Insert Manual Blackout Date ---"
docker exec shiftsync-db psql -U postgres -d shiftsync -c "INSERT INTO blackout_date (id, staff_id, date, reason) VALUES (gen_random_uuid(), 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '2026-09-11', 'Manual Blackout') ON CONFLICT DO NOTHING;"

Write-Output "
--- 2. Create and Publish Shift ---"
$shiftBody = '{"shiftDate":"2026-09-11","startTime":"10:00:00","endTime":"14:00:00"}'
$createRes = Invoke-RestMethod -Uri "http://localhost:8080/api/stores/11111111-1111-1111-1111-111111111111/shifts" -Method Post -Headers @{Authorization="Bearer $token"} -ContentType "application/json" -Body $shiftBody
$shiftId = $createRes.id
Write-Output "Created Shift ID: $shiftId"

$publishBody = '{"startDate":"2026-09-11","endDate":"2026-09-11"}'
Invoke-RestMethod -Uri "http://localhost:8080/api/stores/11111111-1111-1111-1111-111111111111/shifts/publish" -Method Post -Headers @{Authorization="Bearer $token"} -ContentType "application/json" -Body $publishBody

Write-Output "
--- 3. Attempt Manual Assignment ---"
$assignBody = '{"staffId":"aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"}'
try {
    Invoke-RestMethod -Uri "http://localhost:8080/api/stores/11111111-1111-1111-1111-111111111111/shifts/$shiftId/assignments" -Method Post -Headers @{Authorization="Bearer $token"} -ContentType "application/json" -Body $assignBody
    Write-Output "Failed! Assignment succeeded unexpectedly."
} catch {
    Write-Output "SUCCESS: Blocked assignment. Error message:"
    Write-Output $_.ErrorDetails.Message
}
