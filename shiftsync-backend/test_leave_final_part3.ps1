$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'

$managerBody = '{"email":"manager@shiftsync.com","password":"password123"}'
$managerToken = (Invoke-RestMethod -Uri "http://localhost:8080/api/auth/login" -Method Post -ContentType "application/json" -Body $managerBody).accessToken

$staffBody = '{"email":"a@test.com","password":"password123"}'
$staffToken = (Invoke-RestMethod -Uri "http://localhost:8080/api/auth/login" -Method Post -ContentType "application/json" -Body $staffBody).accessToken

Write-Output "
=== TEST 3: Auto Scheduling blocked ==="
# Create a shift on 2026-10-04 (Sunday)
$shiftBody2 = '{"shiftDate":"2026-10-04","startTime":"10:00:00","endTime":"14:00:00", "requirements":[{"skillId":"22222222-2222-2222-2222-222222222222", "requiredCount":1, "skillLevel":"BEGINNER"}]}'
$shiftRes2 = Invoke-RestMethod -Uri "http://localhost:8080/api/stores/11111111-1111-1111-1111-111111111111/shifts" -Method Post -Headers @{Authorization="Bearer $managerToken"} -ContentType "application/json" -Body $shiftBody2
$shiftId2 = $shiftRes2.id

$autoBody = '{"startDate":"2026-10-04","endDate":"2026-10-04","allowOvertime":false}'
try {
    $autoRes = Invoke-RestMethod -Uri "http://localhost:8080/api/stores/11111111-1111-1111-1111-111111111111/shifts/auto-schedule" -Method Post -Headers @{Authorization="Bearer $managerToken"} -ContentType "application/json" -Body $autoBody
    Write-Output "Auto-schedule logs:"
    Write-Output (ConvertTo-Json $autoRes.logs -Depth 4) | Select-String "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"
} catch {
    Write-Output $_.ErrorDetails.Message
}

Write-Output "
=== TEST 5: BR-49 Conflict Warning ==="
# User already has published shift on 2026-10-25 (Sunday)
$shiftBody3 = '{"shiftDate":"2026-10-25","startTime":"10:00:00","endTime":"14:00:00", "requirements":[{"skillId":"22222222-2222-2222-2222-222222222222", "requiredCount":1, "skillLevel":"BEGINNER"}]}'
$shiftRes3 = Invoke-RestMethod -Uri "http://localhost:8080/api/stores/11111111-1111-1111-1111-111111111111/shifts" -Method Post -Headers @{Authorization="Bearer $managerToken"} -ContentType "application/json" -Body $shiftBody3
$shiftId3 = $shiftRes3.id

$publishBody3 = '{"startDate":"2026-10-25","endDate":"2026-10-25"}'
Invoke-RestMethod -Uri "http://localhost:8080/api/stores/11111111-1111-1111-1111-111111111111/shifts/publish" -Method Post -Headers @{Authorization="Bearer $managerToken"} -ContentType "application/json" -Body $publishBody3

$assignBody = '{"staffId":"aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"}'
Invoke-RestMethod -Uri "http://localhost:8080/api/stores/11111111-1111-1111-1111-111111111111/shifts/$shiftId3/assignments" -Method Post -Headers @{Authorization="Bearer $managerToken"} -ContentType "application/json" -Body $assignBody

$leaveBody2 = '{"leaveType":"EMERGENCY", "startDate":"2026-10-24", "endDate":"2026-10-26", "reason":"Accident"}'
$createRes2 = Invoke-RestMethod -Uri "http://localhost:8080/api/stores/11111111-1111-1111-1111-111111111111/leave-requests" -Method Post -Headers @{Authorization="Bearer $staffToken"} -ContentType "application/json" -Body $leaveBody2
$leaveId2 = $createRes2.id

$approveRes2 = Invoke-RestMethod -Uri "http://localhost:8080/api/stores/11111111-1111-1111-1111-111111111111/leave-requests/$leaveId2/approve" -Method Put -Headers @{Authorization="Bearer $managerToken"}
Write-Output (ConvertTo-Json $approveRes2 -Depth 3)

Write-Output "
Check if Assignment is still there:"
docker exec shiftsync-db psql -U postgres -d shiftsync -c "SELECT shift_id, staff_id FROM shift_assignment WHERE shift_id = '$shiftId3';"
