$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'

$managerBody = '{"email":"manager@shiftsync.com","password":"password123"}'
$managerToken = (Invoke-RestMethod -Uri "http://localhost:8080/api/auth/login" -Method Post -ContentType "application/json" -Body $managerBody).accessToken

$staffBody = '{"email":"a@test.com","password":"password123"}'
$staffToken = (Invoke-RestMethod -Uri "http://localhost:8080/api/auth/login" -Method Post -ContentType "application/json" -Body $staffBody).accessToken

Write-Output "
=== TEST 3: Auto Scheduling blocked ==="
$shiftBody2 = '{"shiftDate":"2026-11-22","startTime":"10:00:00","endTime":"14:00:00"}'
$shiftRes2 = Invoke-RestMethod -Uri "http://localhost:8080/api/stores/11111111-1111-1111-1111-111111111111/shifts" -Method Post -Headers @{Authorization="Bearer $managerToken"} -ContentType "application/json" -Body $shiftBody2
$shiftId2 = $shiftRes2.id

$reqBody = '[{"skillId":"22222222-2222-2222-2222-222222222222", "requiredCount":1}]'
Invoke-RestMethod -Uri "http://localhost:8080/api/stores/11111111-1111-1111-1111-111111111111/shifts/$shiftId2/requirements" -Method Put -Headers @{Authorization="Bearer $managerToken"} -ContentType "application/json" -Body $reqBody

$leaveBodyAuto = '{"leaveType":"ANNUAL", "startDate":"2026-11-22", "endDate":"2026-11-23", "reason":"Vacation"}'
$createResAuto = Invoke-RestMethod -Uri "http://localhost:8080/api/stores/11111111-1111-1111-1111-111111111111/leave-requests" -Method Post -Headers @{Authorization="Bearer $staffToken"} -ContentType "application/json" -Body $leaveBodyAuto
$leaveIdAuto = $createResAuto.id

Invoke-RestMethod -Uri "http://localhost:8080/api/stores/11111111-1111-1111-1111-111111111111/leave-requests/$leaveIdAuto/approve" -Method Put -Headers @{Authorization="Bearer $managerToken"}

$autoBody = '{"startDate":"2026-11-22","endDate":"2026-11-22","allowOvertime":false}'
try {
    $autoRes = Invoke-RestMethod -Uri "http://localhost:8080/api/stores/11111111-1111-1111-1111-111111111111/shifts/auto-schedule" -Method Post -Headers @{Authorization="Bearer $managerToken"} -ContentType "application/json" -Body $autoBody
    Write-Output "Auto-schedule logs for Staff A:"
    Write-Output ($autoRes.logs | Select-String "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa")
} catch {
    Write-Output $_.ErrorDetails.Message
}


Write-Output "
=== TEST 5: BR-49 Conflict Warning ==="
# 1. Create shift on Sunday 2026-11-29
$shiftBody3 = '{"shiftDate":"2026-11-29","startTime":"10:00:00","endTime":"14:00:00"}'
$shiftRes3 = Invoke-RestMethod -Uri "http://localhost:8080/api/stores/11111111-1111-1111-1111-111111111111/shifts" -Method Post -Headers @{Authorization="Bearer $managerToken"} -ContentType "application/json" -Body $shiftBody3
$shiftId3 = $shiftRes3.id

# Add requirements
Invoke-RestMethod -Uri "http://localhost:8080/api/stores/11111111-1111-1111-1111-111111111111/shifts/$shiftId3/requirements" -Method Put -Headers @{Authorization="Bearer $managerToken"} -ContentType "application/json" -Body $reqBody

# 2. Publish shift
$publishBody3 = '{"startDate":"2026-11-29","endDate":"2026-11-29"}'
Invoke-RestMethod -Uri "http://localhost:8080/api/stores/11111111-1111-1111-1111-111111111111/shifts/publish" -Method Post -Headers @{Authorization="Bearer $managerToken"} -ContentType "application/json" -Body $publishBody3

# 3. Assign Staff A
$assignBody = '{"staffId":"aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"}'
Invoke-RestMethod -Uri "http://localhost:8080/api/stores/11111111-1111-1111-1111-111111111111/shifts/$shiftId3/assignments" -Method Post -Headers @{Authorization="Bearer $managerToken"} -ContentType "application/json" -Body $assignBody
Write-Output "Assignment SUCCESS"

# 4. Create Leave
$leaveBody2 = '{"leaveType":"SICK", "startDate":"2026-11-28", "endDate":"2026-11-30", "reason":"Fever"}'
$createRes2 = Invoke-RestMethod -Uri "http://localhost:8080/api/stores/11111111-1111-1111-1111-111111111111/leave-requests" -Method Post -Headers @{Authorization="Bearer $staffToken"} -ContentType "application/json" -Body $leaveBody2
$leaveId2 = $createRes2.id

# 5. Approve Leave
$approveRes2 = Invoke-RestMethod -Uri "http://localhost:8080/api/stores/11111111-1111-1111-1111-111111111111/leave-requests/$leaveId2/approve" -Method Put -Headers @{Authorization="Bearer $managerToken"}
Write-Output (ConvertTo-Json $approveRes2 -Depth 3)

Write-Output "
Check if Assignment is still there:"
docker exec shiftsync-db psql -U postgres -d shiftsync -c "SELECT shift_id, staff_id FROM shift_assignment WHERE shift_id = '$shiftId3';"
