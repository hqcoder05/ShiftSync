$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'

$managerBody = '{"email":"admin@shiftsync.com","password":"password123"}'
$managerToken = (Invoke-RestMethod -Uri "http://localhost:8080/api/auth/login" -Method Post -ContentType "application/json" -Body $managerBody).accessToken

$staffBody = '{"email":"a@test.com","password":"password123"}'
$staffToken = (Invoke-RestMethod -Uri "http://localhost:8080/api/auth/login" -Method Post -ContentType "application/json" -Body $staffBody).accessToken

Write-Output "
=== TEST 1: Staff creates Leave Request ==="
$leaveBody = '{"leaveType":"ANNUAL", "startDate":"2026-10-01", "endDate":"2026-10-03", "reason":"Vacation"}'
$createRes = Invoke-RestMethod -Uri "http://localhost:8080/api/stores/11111111-1111-1111-1111-111111111111/leave-requests" -Method Post -Headers @{Authorization="Bearer $staffToken"} -ContentType "application/json" -Body $leaveBody
$leaveId = $createRes.id
Write-Output (ConvertTo-Json $createRes -Depth 3)

Write-Output "
=== TEST 2: Manager Approves & Check DB ==="
$approveRes = Invoke-RestMethod -Uri "http://localhost:8080/api/stores/11111111-1111-1111-1111-111111111111/leave-requests/$leaveId/approve" -Method Put -Headers @{Authorization="Bearer $managerToken"}
Write-Output (ConvertTo-Json $approveRes -Depth 3)
docker exec shiftsync-db psql -U postgres -d shiftsync -c "SELECT date, reason, leave_request_id FROM blackout_date WHERE leave_request_id = '$leaveId';"

Write-Output "
=== TEST 3: Auto Scheduling blocked ==="
# Create a shift on 2026-10-02 (during leave)
$shiftBody2 = '{"shiftDate":"2026-10-02","startTime":"10:00:00","endTime":"14:00:00", "requirements":[{"skillLevel":"BEGINNER", "requiredCount":1}]}'
$shiftRes2 = Invoke-RestMethod -Uri "http://localhost:8080/api/stores/11111111-1111-1111-1111-111111111111/shifts" -Method Post -Headers @{Authorization="Bearer $managerToken"} -ContentType "application/json" -Body $shiftBody2
$shiftId2 = $shiftRes2.id

$autoBody = '{"startDate":"2026-10-02","endDate":"2026-10-02","allowOvertime":false}'
try {
    $autoRes = Invoke-RestMethod -Uri "http://localhost:8080/api/stores/11111111-1111-1111-1111-111111111111/shifts/auto-schedule" -Method Post -Headers @{Authorization="Bearer $managerToken"} -ContentType "application/json" -Body $autoBody
    Write-Output (ConvertTo-Json $autoRes.logs -Depth 4)
} catch {
    Write-Output $_.ErrorDetails.Message
}

Write-Output "
=== TEST 4: Manual Assignment blocked ==="
$publishBody = '{"startDate":"2026-10-02","endDate":"2026-10-02"}'
Invoke-RestMethod -Uri "http://localhost:8080/api/stores/11111111-1111-1111-1111-111111111111/shifts/publish" -Method Post -Headers @{Authorization="Bearer $managerToken"} -ContentType "application/json" -Body $publishBody
$assignBody = '{"staffId":"aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"}'
try {
    Invoke-RestMethod -Uri "http://localhost:8080/api/stores/11111111-1111-1111-1111-111111111111/shifts/$shiftId2/assignments" -Method Post -Headers @{Authorization="Bearer $managerToken"} -ContentType "application/json" -Body $assignBody
    Write-Output "Failed! Assigned successfully."
} catch {
    Write-Output "SUCCESS blocked: " $_.ErrorDetails.Message
}

Write-Output "
=== TEST 5: BR-49 Conflict Warning ==="
# User already has published shift on 2026-10-02 (shiftId2) because wait, shiftId2 was published but they were NOT assigned!
# Let's assign them manually to a DIFFERENT shift that doesn't conflict yet, then create a leave overlapping it.
$shiftBody3 = '{"shiftDate":"2026-10-10","startTime":"10:00:00","endTime":"14:00:00"}'
$shiftRes3 = Invoke-RestMethod -Uri "http://localhost:8080/api/stores/11111111-1111-1111-1111-111111111111/shifts" -Method Post -Headers @{Authorization="Bearer $managerToken"} -ContentType "application/json" -Body $shiftBody3
$shiftId3 = $shiftRes3.id

$publishBody3 = '{"startDate":"2026-10-10","endDate":"2026-10-10"}'
Invoke-RestMethod -Uri "http://localhost:8080/api/stores/11111111-1111-1111-1111-111111111111/shifts/publish" -Method Post -Headers @{Authorization="Bearer $managerToken"} -ContentType "application/json" -Body $publishBody3

Invoke-RestMethod -Uri "http://localhost:8080/api/stores/11111111-1111-1111-1111-111111111111/shifts/$shiftId3/assignments" -Method Post -Headers @{Authorization="Bearer $managerToken"} -ContentType "application/json" -Body $assignBody

$leaveBody2 = '{"leaveType":"SICK", "startDate":"2026-10-10", "endDate":"2026-10-11", "reason":"Fever"}'
$createRes2 = Invoke-RestMethod -Uri "http://localhost:8080/api/stores/11111111-1111-1111-1111-111111111111/leave-requests" -Method Post -Headers @{Authorization="Bearer $staffToken"} -ContentType "application/json" -Body $leaveBody2
$leaveId2 = $createRes2.id

$approveRes2 = Invoke-RestMethod -Uri "http://localhost:8080/api/stores/11111111-1111-1111-1111-111111111111/leave-requests/$leaveId2/approve" -Method Put -Headers @{Authorization="Bearer $managerToken"}
Write-Output (ConvertTo-Json $approveRes2 -Depth 3)

Write-Output "Check if Assignment is still there:"
docker exec shiftsync-db psql -U postgres -d shiftsync -c "SELECT shift_id, staff_id FROM shift_assignment WHERE shift_id = '$shiftId3';"
