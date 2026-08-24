$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'

$managerBody = '{"email":"manager@shiftsync.com","password":"password123"}'
$managerToken = (Invoke-RestMethod -Uri "http://localhost:8080/api/auth/login" -Method Post -ContentType "application/json" -Body $managerBody).accessToken

$staffBody = '{"email":"a@test.com","password":"password123"}'
$staffToken = (Invoke-RestMethod -Uri "http://localhost:8080/api/auth/login" -Method Post -ContentType "application/json" -Body $staffBody).accessToken

Write-Output "
=== TEST 3: Auto Scheduling logs ==="
$autoBody = '{"startDate":"2026-10-04","endDate":"2026-10-04","allowOvertime":false}'
$autoRes = Invoke-RestMethod -Uri "http://localhost:8080/api/stores/11111111-1111-1111-1111-111111111111/shifts/auto-schedule" -Method Post -Headers @{Authorization="Bearer $managerToken"} -ContentType "application/json" -Body $autoBody
Write-Output ($autoRes.logs | Select-String "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa")

Write-Output "
=== TEST 5: BR-49 Conflict Warning ==="
$shiftBody3 = '{"shiftDate":"2026-10-18","startTime":"10:00:00","endTime":"14:00:00", "requirements":[{"skillLevel":"BEGINNER", "requiredCount":1}]}'
$shiftRes3 = Invoke-RestMethod -Uri "http://localhost:8080/api/stores/11111111-1111-1111-1111-111111111111/shifts" -Method Post -Headers @{Authorization="Bearer $managerToken"} -ContentType "application/json" -Body $shiftBody3
$shiftId3 = $shiftRes3.id

$publishBody3 = '{"startDate":"2026-10-18","endDate":"2026-10-18"}'
Invoke-RestMethod -Uri "http://localhost:8080/api/stores/11111111-1111-1111-1111-111111111111/shifts/publish" -Method Post -Headers @{Authorization="Bearer $managerToken"} -ContentType "application/json" -Body $publishBody3

$assignBody = '{"staffId":"aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"}'
Invoke-RestMethod -Uri "http://localhost:8080/api/stores/11111111-1111-1111-1111-111111111111/shifts/$shiftId3/assignments" -Method Post -Headers @{Authorization="Bearer $managerToken"} -ContentType "application/json" -Body $assignBody

$leaveBody2 = '{"leaveType":"SICK", "startDate":"2026-10-17", "endDate":"2026-10-19", "reason":"Fever"}'
$createRes2 = Invoke-RestMethod -Uri "http://localhost:8080/api/stores/11111111-1111-1111-1111-111111111111/leave-requests" -Method Post -Headers @{Authorization="Bearer $staffToken"} -ContentType "application/json" -Body $leaveBody2
$leaveId2 = $createRes2.id

$approveRes2 = Invoke-RestMethod -Uri "http://localhost:8080/api/stores/11111111-1111-1111-1111-111111111111/leave-requests/$leaveId2/approve" -Method Put -Headers @{Authorization="Bearer $managerToken"}
Write-Output (ConvertTo-Json $approveRes2 -Depth 3)
