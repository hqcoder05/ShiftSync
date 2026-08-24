$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'

$managerBody = '{"email":"manager@shiftsync.com","password":"password123"}'
$managerToken = (Invoke-RestMethod -Uri "http://localhost:8080/api/auth/login" -Method Post -ContentType "application/json" -Body $managerBody).accessToken

$staffBody = '{"email":"a@test.com","password":"password123"}'
$staffToken = (Invoke-RestMethod -Uri "http://localhost:8080/api/auth/login" -Method Post -ContentType "application/json" -Body $staffBody).accessToken

Write-Output "
=== TEST 5: BR-49 Conflict Warning ==="
# 1. Create shift on Sunday 2026-11-01
$shiftBody3 = '{"shiftDate":"2026-11-01","startTime":"10:00:00","endTime":"14:00:00", "requirements":[{"skillId":"22222222-2222-2222-2222-222222222222", "requiredCount":1, "skillLevel":"BEGINNER"}]}'
$shiftRes3 = Invoke-RestMethod -Uri "http://localhost:8080/api/stores/11111111-1111-1111-1111-111111111111/shifts" -Method Post -Headers @{Authorization="Bearer $managerToken"} -ContentType "application/json" -Body $shiftBody3
$shiftId3 = $shiftRes3.id

# 2. Publish shift
$publishBody3 = '{"startDate":"2026-11-01","endDate":"2026-11-01"}'
Invoke-RestMethod -Uri "http://localhost:8080/api/stores/11111111-1111-1111-1111-111111111111/shifts/publish" -Method Post -Headers @{Authorization="Bearer $managerToken"} -ContentType "application/json" -Body $publishBody3

# 3. Assign Staff A
$assignBody = '{"staffId":"aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"}'
try {
    Invoke-RestMethod -Uri "http://localhost:8080/api/stores/11111111-1111-1111-1111-111111111111/shifts/$shiftId3/assignments" -Method Post -Headers @{Authorization="Bearer $managerToken"} -ContentType "application/json" -Body $assignBody
    Write-Output "Assignment SUCCESS"
} catch {
    Write-Output "Assignment FAILED!"
    Write-Output $_.ErrorDetails.Message
}

# 4. Create Leave
$leaveBody2 = '{"leaveType":"SICK", "startDate":"2026-11-01", "endDate":"2026-11-02", "reason":"Fever"}'
$createRes2 = Invoke-RestMethod -Uri "http://localhost:8080/api/stores/11111111-1111-1111-1111-111111111111/leave-requests" -Method Post -Headers @{Authorization="Bearer $staffToken"} -ContentType "application/json" -Body $leaveBody2
$leaveId2 = $createRes2.id

# 5. Approve Leave
$approveRes2 = Invoke-RestMethod -Uri "http://localhost:8080/api/stores/11111111-1111-1111-1111-111111111111/leave-requests/$leaveId2/approve" -Method Put -Headers @{Authorization="Bearer $managerToken"}
Write-Output (ConvertTo-Json $approveRes2 -Depth 3)

Write-Output "
Check if Assignment is still there:"
docker exec shiftsync-db psql -U postgres -d shiftsync -c "SELECT shift_id, staff_id FROM shift_assignment WHERE shift_id = '$shiftId3';"
